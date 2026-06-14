// ─────────────────────────────────────────────
//  modal.js  —  Lead detail modal management
// ─────────────────────────────────────────────

const LeadModal = (() => {

  function open(id, tab) {
    const lead = id ? leads.find(l => l.id === id) : null;

    if (lead) {
      window._currentLead = lead;

      // Header
      const av = document.getElementById('m-avatar');
      av.textContent  = lead.avInit;
      av.className    = `avatar ${lead.avClass}`;
      av.style.cssText = 'width:44px;height:44px;font-size:16px;border-radius:10px;flex-shrink:0';

      document.getElementById('m-name').textContent = lead.name;
      document.getElementById('m-meta').textContent = `${lead.title} · ${lead.company}`;

      const sb = document.getElementById('m-score-badge');
      sb.textContent = lead.score;
      sb.className   = `score-badge ${scoreClass(lead.score)}`;

      const sp = document.getElementById('m-status-pill');
      sp.innerHTML = `<span class="pill-dot"></span>${lead.status}`;
      sp.className = `pill ${STATUS_PILL_CLASS[lead.status] || 'p-new'}`;

      // Profile tab fields
      document.getElementById('pf-name').textContent    = lead.name;
      document.getElementById('pf-title').textContent   = lead.title;
      document.getElementById('pf-company').textContent = lead.company;
      document.getElementById('pf-score').textContent   = lead.score;
      document.getElementById('pf-status').textContent  = lead.status;
      document.getElementById('pf-about').textContent   = lead.about;
      document.getElementById('pf-summary').textContent = lead.summary || '—';
      document.getElementById('pf-linkedin').href       = lead.linkedinUrl;
      document.getElementById('pf-landing').href        = lead.landingUrl;

      // Render sub-components
      Pipeline.renderDetail(lead);
      ActivityView.renderForLead(lead);
      AI.refreshPromptSelect();
      AI.renderSeqList(lead);
    }

    Nav.openOverlay('leadModal');
    Nav.switchLeadTab(tab || 'profile');
  }

  return { open };
})();
