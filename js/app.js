// ─────────────────────────────────────────────
//  app.js  —  Bootstrap & global wiring
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {

  /* 1. Pre-configure sheet URL if not already saved */
  const gsCfg = Storage.loadGsConfig();
  if (!gsCfg.url) {
    const defaultCfg = {
      url:      GoogleSheets.defaultSheetUrl(),
      tab:      'Leads',
      interval: 'Every 60 seconds',
    };
    Storage.saveGsConfig(defaultCfg);
    // Populate UI inputs
    const urlIn = document.getElementById('gsUrlInput');
    if (urlIn) urlIn.value = defaultCfg.url;
    const tabIn = document.getElementById('gsTabInput');
    if (tabIn) tabIn.value = defaultCfg.tab;
  }

  /* 2. Restore GS config into UI */
  const cfg = Storage.loadGsConfig();
  if (cfg.url) {
    document.getElementById('gsStatusText').textContent = 'Sheet connected';
    document.getElementById('gsStatusDot').classList.remove('off');
    document.getElementById('gs-banner-sub').textContent =
      `Syncing from "${cfg.tab || 'Leads'}" · Auto-refresh: ${cfg.interval}`;
  }
  const gsUrlModal = document.getElementById('gsUrlModal');
  if (gsUrlModal) gsUrlModal.value = cfg.url || '';
  const gsTabModal = document.getElementById('gsTabModal');
  if (gsTabModal) gsTabModal.value = cfg.tab || 'Leads';

  /* 3. Initial render with empty state */
  document.getElementById('leadsCountBadge').textContent = '…';
  Nav.showPage('leads');

  /* 4. Fetch from Google Sheets */
  await _syncAndRender();

  /* 5. Auto-sync interval */
  _scheduleAutoSync(cfg.interval);
});

/* ── Fetch sheet data, update UI ── */
async function _syncAndRender() {
  try {
    notify('⟳ Syncing from Google Sheets…');
    await GoogleSheets.sync();
    document.getElementById('lastSync').textContent = new Date().toLocaleTimeString();
    document.getElementById('leadsCountBadge').textContent = leads.length;
    Nav.showPage('leads');
    updateStats();
    notify('✓ Sync complete · ' + leads.length + ' lead' + (leads.length !== 1 ? 's' : '') + ' loaded');
  } catch (err) {
    console.error('Sheet sync failed:', err);
    // Fall back to any cached data in localStorage
    const saved = Storage.loadLeadsData();
    const cachedIds = Object.keys(saved);
    if (leads.length === 0 && cachedIds.length > 0) {
      notify('⚠ Sheet unreachable — showing cached data');
    } else if (leads.length === 0) {
      notify('⚠ Could not load sheet — add leads via Google Sheets');
      document.getElementById('gs-banner-sub').textContent =
        'Sheet unreachable — check that the sheet is publicly shared';
    }
    document.getElementById('leadsCountBadge').textContent = leads.length;
    Nav.showPage('leads');
    updateStats();
  }
}

let _syncTimer = null;

function _scheduleAutoSync(interval) {
  clearInterval(_syncTimer);
  const ms = interval === 'Every 30 seconds' ? 30000
           : interval === 'Every 5 minutes'  ? 300000
           : interval === 'Manual only'      ? 0
           : 60000; // default: Every 60 seconds
  if (ms > 0) _syncTimer = setInterval(_syncAndRender, ms);
}

function updateStats() {
  document.getElementById('st-total').textContent  = leads.length;
  document.getElementById('st-hot').textContent    = leads.filter(l => l.status === 'Hot').length;
  const sent     = leads.filter(l => l.pipeline.conn_sent     === 'done').length;
  const accepted = leads.filter(l => l.pipeline.conn_accepted === 'done').length;
  const replied  = leads.filter(l => l.pipeline.msg1_replied  === 'done').length;
  document.getElementById('st-sent').textContent   = sent;
  document.getElementById('st-accept').textContent = sent     ? Math.round(accepted / sent     * 100) + '%' : '—';
  document.getElementById('st-reply').textContent  = accepted ? Math.round(replied  / accepted * 100) + '%' : '—';
}
