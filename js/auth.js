(function () {
  const app = window.supabaseApp;
  const client = app && app.client;

  function requireSupabase() {
    if (!app?.ready || !client) {
      throw new Error('Supabase is not configured. Copy js/config.example.js to js/config.js and add your project URL and publishable/anon key.');
    }
  }

  async function getSession() {
    requireSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  async function signOut() {
    requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    window.location.href = '../index.html';
  }

  async function loadProfile(userId) {
    requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, email, education, skills, target_role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function upsertProfile(profile) {
    requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  window.Auth = { getSession, requireAuth, signOut, loadProfile, upsertProfile };
})();
