(async function () {
  const form = document.querySelector('[data-profile-form]');
  const message = document.querySelector('[data-profile-message]');
  if (!form) return;

  const setMessage = (text, type='success') => {
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
      form.full_name.value = profile.full_name || '';
      form.education.value = profile.education || '';
      form.skills.value = profile.skills || '';
      form.target_role.value = profile.target_role || '';
    }
  } catch (error) {
    setMessage(error.message, 'error');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const session = await window.Auth.getSession();
      if (!session) return;
      await window.Auth.upsertProfile({
        id: session.user.id,
        full_name: form.full_name.value.trim(),
        email: session.user.email || '',
        education: form.education.value.trim(),
        skills: form.skills.value.trim(),
        target_role: form.target_role.value.trim()
      });
      setMessage('Profile saved successfully.');
    } catch (error) {
      setMessage(error.message || 'Unable to save profile.', 'error');
    } finally { button.disabled = false; }
  });
})();
