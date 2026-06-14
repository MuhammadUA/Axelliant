// ─────────────────────────────────────────────
//  storage.js  —  localStorage persistence layer
//  All keys prefixed with 'ax_' for easy migration.
// ─────────────────────────────────────────────

const Storage = (() => {

  /* ── Generic helpers ── */
  const get = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const set = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  /* ── Prompts ── */
  function loadPrompts() {
    const saved = get('ax_prompts');
    if (saved) return saved;
    const defaults = [
      {
        id: 'p1',
        name: 'SaaS Sales Outreach',
        prompt: 'You are an expert LinkedIn outreach specialist for Axelliant, a B2B intelligence platform. Write a highly personalized, concise, and non-salesy message. Be genuine, reference specifics from their profile, and focus on value. Never use filler phrases like "I hope this message finds you well." Keep it short and human.',
      },
      {
        id: 'p2',
        name: 'Partnership Intro',
        prompt: 'You are writing on behalf of Axelliant to explore potential partnerships. The tone should be peer-to-peer, collaborative, and focused on mutual value. Reference their company\'s work and suggest a short exploratory conversation.',
      },
    ];
    savePrompts(defaults);
    return defaults;
  }
  function savePrompts(prompts) { set('ax_prompts', prompts); }

  /* ── API / model ── */
  function loadApiKey()  { return localStorage.getItem('ax_api_key') || ''; }
  function saveApiKey(v) { localStorage.setItem('ax_api_key', v); }
  function loadModel()   { return localStorage.getItem('ax_model') || 'gpt-4o'; }
  function saveModel(v)  { localStorage.setItem('ax_model', v); }

  /* ── Google Sheets config ── */
  function loadGsConfig() {
    return get('ax_gs_config') || { url: '', tab: 'Leads', interval: 'Every 60 seconds' };
  }
  function saveGsConfig(cfg) { set('ax_gs_config', cfg); }

  /* ── Apps Script Web App URL ── */
  function loadScriptUrl()  { return localStorage.getItem('ax_script_url') || ''; }
  function saveScriptUrl(v) { localStorage.setItem('ax_script_url', v.trim()); }

  /* ── Per-lead mutable data (pipeline, messages, activity) ── */
  function loadLeadsData() { return get('ax_leads_pipeline') || {}; }
  function saveLeadsData(leads) {
    const data = {};
    leads.forEach(l => {
      data[l.id] = {
        pipeline:       l.pipeline,
        pipeTimestamps: l.pipeTimestamps,
        activity:       l.activity,
        messages:       l.messages,
      };
    });
    set('ax_leads_pipeline', data);
  }

  /* ── Global activity feed ── */
  function loadGlobalActivity() { return get('ax_global_activity') || []; }
  function saveGlobalActivity(feed) { set('ax_global_activity', feed.slice(0, 200)); }

  return {
    loadPrompts, savePrompts,
    loadApiKey, saveApiKey,
    loadModel, saveModel,
    loadGsConfig, saveGsConfig,
    loadScriptUrl, saveScriptUrl,
    loadLeadsData, saveLeadsData,
    loadGlobalActivity, saveGlobalActivity,
  };
})();
