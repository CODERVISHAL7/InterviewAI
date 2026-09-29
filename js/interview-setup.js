(async function () {
  const form = document.querySelector('[data-interview-setup-form]');
  const message = document.querySelector('[data-interview-message]');
  if (!form) return;

  const setMessage = (text, type = 'success') => {
    if (!message) return;
    message.textContent = text;
    message.dataset.type = type;
    message.hidden = false;
  };

  try {
    const session = await window.Auth.getSession();
    if (!session) return;
    const profile = await window.Auth.loadProfile(session.user.id);
    if (profile) {
      if (!form.job_role.value && profile.target_role) form.job_role.value = profile.target_role;
      if (!form.skills.value && profile.skills) form.skills.value = profile.skills;
    }
  } catch (error) {
    setMessage(error.message || 'Unable to load profile defaults.', 'error');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Creating interview...';
    message.hidden = true;

    try {
      const session = await window.Auth.getSession();
      if (!session) return;

      let resumeId = null;
      const resumeFile = form.resume?.files?.[0] || null;
      if (resumeFile) {
        const allowed = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const lower = resumeFile.name.toLowerCase();
        const extensionOk = ['.pdf','.doc','.docx'].some((ext) => lower.endsWith(ext));
        if (!allowed.includes(resumeFile.type) && !extensionOk) throw new Error('Please upload a PDF, DOC, or DOCX resume.');
        if (resumeFile.size > 10 * 1024 * 1024) throw new Error('Resume file must be 10 MB or smaller.');
      }

      const payload = {
        user_id: session.user.id,
        job_role: form.job_role.value,
        company: form.company.value.trim() || null,
        interview_type: form.interview_type.value,
        difficulty: form.difficulty.value,
        skills: form.skills.value.trim() || null,
        total_questions: Number(form.total_questions.value),
        status: 'setup',
        resume_id: null
      };

      const { data, error } = await window.supabaseApp.client
        .from('interviews')
        .insert(payload)
        .select('id, job_role, company, interview_type, difficulty, skills, total_questions, status, created_at')
        .single();

      if (error) throw error;

      if (resumeFile) {
        const status = form.querySelector('[data-resume-status]');
        if (status) status.textContent = 'Uploading and processing resume...';
        const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await window.supabaseApp.client.storage.from('resumes').upload(path, resumeFile, { upsert: false, contentType: resumeFile.type || 'application/octet-stream' });
        if (uploadError) throw uploadError;
        const { data: resumeRow, error: resumeInsertError } = await window.supabaseApp.client.from('resumes').insert({ user_id: session.user.id, file_name: resumeFile.name, file_path: path, mime_type: resumeFile.type || 'application/octet-stream', file_size: resumeFile.size }).select('id').single();
        if (resumeInsertError) throw resumeInsertError;
        resumeId = resumeRow.id;
        const { error: processError } = await window.supabaseApp.client.functions.invoke('process-resume', { body: { resume_id: resumeId } });
        if (processError) throw processError;
        const { error: linkError } = await window.supabaseApp.client.from('interviews').update({ resume_id: resumeId }).eq('id', data.id).eq('user_id', session.user.id);
        if (linkError) throw linkError;
      }
      window.location.href = `interview.html?interview_id=${encodeURIComponent(data.id)}`;
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Unable to create interview.', 'error');
      button.disabled = false;
      button.textContent = 'Create interview →';
    }
  });
})();
