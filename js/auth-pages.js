(function () {
  const form = document.querySelector('[data-auth-form]');
  const message = document.querySelector('[data-auth-message]');
  const submit = form?.querySelector('button[type="submit"]');
  if (!form) return;

  const show = (text, type = 'error') => {
    if (!message) return;
    message.textContent = text;
    message.dataset.type = type;
    message.hidden = false;
  };

  const setBusy = (busy) => {
    if (submit) {
      submit.disabled = busy;
      submit.textContent = busy ? 'Please wait…' : (form.dataset.mode === 'register' ? 'Create account' : 'Sign in');
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (!window.supabaseApp?.ready) throw new Error('Supabase is not configured yet. Create js/config.js from js/config.example.js and add your project values.');
      const client = window.supabaseApp.client;
      const email = form.email.value.trim();
      const password = form.password.value;

      if (form.dataset.mode === 'register') {
        const fullName = form.full_name.value.trim();
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        if (data.session) {
          window.location.href = 'dashboard.html';
        } else {
          show('Account created. Check your email to confirm your account, then sign in.', 'success');
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) window.location.href = 'dashboard.html';
      }
    } catch (error) {
      show(error.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  });
})();
