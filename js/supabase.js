(function () {
  const config = window.APP_CONFIG || {};
  const ready = Boolean(
    config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    !config.SUPABASE_URL.includes('YOUR-PROJECT') &&
    !config.SUPABASE_ANON_KEY.includes('YOUR-PUBLISHABLE') &&
    !config.SUPABASE_ANON_KEY.includes('YOUR-ANON')
  );

  window.supabaseApp = {
    ready,
    client: ready && window.supabase
      ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
      : null
  };
})();
