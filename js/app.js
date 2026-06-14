// ─────────────────────────────────────────────
//  app.js  —  Bootstrap & global wiring
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  /* 1. Hydrate leads from localStorage (overwrite sample pipeline/messages/activity) */
  const saved = Storage.loadLeadsData();
  leads.forEach(l => {
    if (saved[l.id]) {
      l.pipeline        = saved[l.id].pipeline        || l.pipeline;
      l.pipeTimestamps  = saved[l.id].pipeTimestamps  || l.pipeTimestamps;
      l.activity        = saved[l.id].activity        || l.activity;
      l.messages        = saved[l.id].messages        || l.messages;
    }
  });

  /* 2. Restore GS config into UI */
  const gsCfg = Storage.loadGsConfig();
  if (gsCfg.url) {
    document.getElementById('gsStatusText').textContent = 'Sheet connected';
    document.getElementById('gs-banner-sub').textContent =
      `Syncing from "${gsCfg.tab || 'Leads'}" · Auto-refresh: ${gsCfg.interval}`;
  }
  if (document.getElementById('gsUrlModal'))
    document.getElementById('gsUrlModal').value = gsCfg.url || '';
  if (document.getElementById('gsTabModal'))
    document.getElementById('gsTabModal').value = gsCfg.tab || 'Leads';

  /* 3. Initial renders */
  document.getElementById('leadsCountBadge').textContent = leads.length;
  Nav.showPage('leads');

  /* 4. Stats */
  updateStats();
});

function updateStats() {
  document.getElementById('st-total').textContent  = leads.length;
  document.getElementById('st-hot').textContent    = leads.filter(l => l.status === 'Hot').length;
  const sent     = leads.filter(l => l.pipeline.conn_sent === 'done').length;
  const accepted = leads.filter(l => l.pipeline.conn_accepted === 'done').length;
  const replied  = leads.filter(l => l.pipeline.msg1_replied === 'done').length;
  document.getElementById('st-sent').textContent   = sent;
  document.getElementById('st-accept').textContent = sent ? Math.round(accepted / sent * 100) + '%' : '—';
  document.getElementById('st-reply').textContent  = accepted ? Math.round(replied / accepted * 100) + '%' : '—';
}
