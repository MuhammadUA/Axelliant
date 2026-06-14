// ─────────────────────────────────────────────
//  pipeline.js  —  Pipeline stage logic + timestamps
// ─────────────────────────────────────────────

const Pipeline = (() => {

  /* Render the 8-stage grid inside the lead modal */
  function renderDetail(lead) {
    if (!lead) return;
    const doneCount = PIPELINE_STAGES.filter(d => lead.pipeline[d.key] === 'done').length;
    document.getElementById('pipe-done-count').textContent = `${doneCount}/${PIPELINE_STAGES.length}`;

    const grid = document.getElementById('pipeGrid');
    grid.innerHTML = PIPELINE_STAGES.map(d => {
      const s = lead.pipeline[d.key] || 'pending';
      const cardCls = s === 'done' ? 'st-done' : s === 'active' ? 'st-active' : 'st-pending';
      const icCls   = s === 'done' ? 'ic-done' : s === 'active' ? 'ic-active' : 'ic-pending';
      const check   = s === 'done' ? '<div class="pipe-check">✓</div>' : '';
      const meta    = s === 'done' ? 'Completed' : s === 'active' ? 'In progress' : 'Pending';
      const ts      = lead.pipeTimestamps[d.key]
        ? `<div class="pipe-card-ts">✓ ${lead.pipeTimestamps[d.key]}</div>` : '';

      return `
        <div class="pipe-card ${cardCls}" onclick="Pipeline.toggleStage('${d.key}')">
          ${check}
          <div class="pipe-card-icon ${icCls}">${d.emoji}</div>
          <div class="pipe-card-label">${d.label}</div>
          <div class="pipe-card-meta">${meta}</div>
          ${ts}
        </div>`;
    }).join('');

    _renderLog(lead);
  }

  function _renderLog(lead) {
    const log = document.getElementById('pipeLog');
    const entries = Object.entries(lead.pipeTimestamps)
      .map(([k, ts]) => ({ k, ts }))
      .reverse();

    if (!entries.length) {
      log.innerHTML = '<div style="font-size:12.5px;color:var(--text-secondary)">No stage actions recorded yet. Click a stage above to log it.</div>';
      return;
    }
    log.innerHTML = entries.map(({ k, ts }) => {
      const def = PIPELINE_STAGES.find(d => d.key === k);
      return `
        <div class="act-item">
          <div class="act-dot ad-ok" style="font-size:11px">✓</div>
          <div class="act-text">
            <div class="at-title">${def ? def.label : k}</div>
            <div class="at-body">Marked as done</div>
          </div>
          <div class="act-time">${ts}</div>
        </div>`;
    }).join('');
  }

  /* Toggle stage status and auto-timestamp when → done */
  function toggleStage(key) {
    const lead = window._currentLead;
    if (!lead) return;

    const prev = lead.pipeline[key] || 'pending';
    const next = prev === 'done' ? 'pending' : prev === 'active' ? 'done' : 'active';
    lead.pipeline[key] = next;

    const ts = fmtNow();
    if (next === 'done') {
      lead.pipeTimestamps[key] = ts;
      const def = PIPELINE_STAGES.find(d => d.key === key);
      _logActivity(lead, `${def.emoji} ${def.label}`, `Marked as done · ${ts}`, 'ad-ok', '✓');
      _logGlobal(`${lead.name} — ${def.label}`, `${lead.company} · marked done`, ts);
      notify(`✓ ${def.label} logged at ${ts}`);
    } else {
      delete lead.pipeTimestamps[key];
    }

    Storage.saveLeadsData(leads);
    renderDetail(lead);
    ActivityView.renderForLead(lead);
    Table.render(leads);
  }

  /* Called from mini pipeline in table row */
  function quickToggle(leadId, key) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    window._currentLead = lead;
    toggleStage(key);
  }

  function _logActivity(lead, title, body, cls, icon) {
    lead.activity.unshift({ icon, cls, title, body, time: fmtNow() });
  }

  function _logGlobal(title, body, time) {
    const feed = Storage.loadGlobalActivity();
    feed.unshift({ icon: '✓', cls: 'ad-ok', title, body, time, lead: '' });
    Storage.saveGlobalActivity(feed);
  }

  return { renderDetail, toggleStage, quickToggle };
})();
