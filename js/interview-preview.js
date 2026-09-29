(async function () {
  const summary = document.querySelector('[data-interview-summary]');
  const errorBox = document.querySelector('[data-interview-error]');
  const startButton = document.querySelector('[data-start-interview]');
  if (!summary) return;

  const params = new URLSearchParams(window.location.search);
  const interviewId = params.get('interview_id');
  if (!interviewId) {
    if (errorBox) { errorBox.textContent = 'No interview was selected.'; errorBox.hidden = false; }
    if (startButton) startButton.hidden = true;
    return;
  }

  try {
    const session = await window.Auth.getSession();
    if (!session) return;

    const { data, error } = await window.supabaseApp.client
      .from('interviews')
      .select('id, job_role, company, interview_type, difficulty, skills, total_questions, status, created_at')
      .eq('id', interviewId)
      .eq('user_id', session.user.id)
      .single();
    if (error) throw error;

    summary.innerHTML = `
      <div class="setup-summary-grid">
        <div><small>Job role</small><strong>${escapeHtml(data.job_role)}</strong></div>
        <div><small>Interview type</small><strong>${escapeHtml(data.interview_type)}</strong></div>
        <div><small>Difficulty</small><strong>${escapeHtml(data.difficulty)}</strong></div>
        <div><small>Questions</small><strong>${data.total_questions}</strong></div>
        <div><small>Company</small><strong>${escapeHtml(data.company || 'Not specified')}</strong></div>
        <div><small>Skills</small><strong>${escapeHtml(data.skills || 'Profile/default skills')}</strong></div>
      </div>
      <div class="notice" style="margin-top:18px">Your interview configuration is saved. Generate your personalized questions when you are ready.</div>`;

    if (startButton) {
      const startUrl = `mock-interview.html?interview_id=${encodeURIComponent(data.id)}`;
      startButton.dataset.startUrl = startUrl;
      startButton.hidden = false;
      startButton.disabled = false;
      startButton.onclick = (event) => {
        event.preventDefault();
        window.location.assign(startButton.dataset.startUrl);
      };
    }
  } catch (error) {
    console.error(error);
    if (errorBox) { errorBox.textContent = error.message || 'Unable to load this interview.'; errorBox.hidden = false; }
    if (startButton) startButton.hidden = true;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }
})();
