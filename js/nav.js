// ─────────────────────────────────────────────
//  nav.js  —  Page navigation & modal management
// ─────────────────────────────────────────────

const Nav = (() => {

  const PAGE_TITLES = {
    leads:         'Leads',
    dashboard:     'Dashboard',
    settings:      'Settings',
    'sheet-schema':'Sheet Schema',
    'pipeline-view':'Pipeline View',
  };

  function showPage(page) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');

    document.getElementById('topbarTitle').textContent = PAGE_TITLES[page] || page;

    // Trigger page-specific renders
    if (page === 'settings')       Settings.render();
    if (page === 'sheet-schema')   SchemaView.render();
    if (page === 'dashboard')      ActivityView.renderGlobal();
    if (page === 'pipeline-view')  Kanban.render();
    if (page === 'leads')          Table.render(leads);
  }

  function openOverlay(id) {
    document.getElementById(id).classList.add('open');
  }

  function closeOverlay(id) {
    document.getElementById(id).classList.remove('open');
  }

  function switchLeadTab(tabId) {
    document.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const paneIds = ['profile', 'pipeline', 'ai', 'activity'];
    const tabs = document.querySelectorAll('.mtab');
    paneIds.forEach((id, i) => {
      if (tabs[i]) tabs[i].classList.toggle('active', id === tabId);
    });
    const pane = document.getElementById('tab-' + tabId);
    if (pane) pane.classList.add('active');
  }

  // Click on tab element (from onclick attribute)
  function switchTab(el, id) {
    document.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    const pane = document.getElementById('tab-' + id);
    if (pane) pane.classList.add('active');
  }

  // Close overlays on backdrop click
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.overlay').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target === el) el.classList.remove('open');
      });
    });
  });

  return { showPage, openOverlay, closeOverlay, switchLeadTab, switchTab };
})();

// Global shortcuts for inline onclick attributes
const showPage      = p  => Nav.showPage(p);
const openOverlay   = id => Nav.openOverlay(id);
const closeOverlay  = id => Nav.closeOverlay(id);
const switchTab     = (el, id) => Nav.switchTab(el, id);
const switchTabById = id => Nav.switchLeadTab(id);
