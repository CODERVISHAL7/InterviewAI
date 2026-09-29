(function () {
  const markReady = () => {
    document.documentElement.dataset.authReady = 'true';
    document.body.classList.add('auth-ready');
  };

  const redirectToLogin = () => {
    const loginPath = 'login.html';
    if (!window.location.pathname.endsWith('/pages/login.html')) {
      window.location.replace(loginPath);
    }
  };

  (async function () {
    try {
      const session = await window.Auth.requireAuth();
      if (!session) return;

      document.querySelectorAll('[data-user-email]').forEach(el => {
        el.textContent = session.user.email || '';
      });

      document.querySelectorAll('[data-sign-out]').forEach(btn => {
        btn.addEventListener('click', async (event) => {
          event.preventDefault();
          btn.disabled = true;
          try {
            await window.Auth.signOut();
          } catch (error) {
            btn.disabled = false;
            const target = document.querySelector('[data-auth-error]');
            if (target) {
              target.textContent = error.message || 'Sign out failed.';
              target.hidden = false;
            } else {
              alert(error.message || 'Sign out failed.');
            }
          }
        });
      });

      markReady();
    } catch (error) {
      console.error('Authentication guard failed:', error);
      const target = document.querySelector('[data-auth-error]');
      if (target) {
        target.textContent = error.message || 'Authentication could not be verified.';
        target.hidden = false;
      }
      redirectToLogin();
    }
  })();
})();
