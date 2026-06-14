// ─────────────────────────────────────────────
//  render.js  —  Table, Kanban, Schema, Activity renders
// ─────────────────────────────────────────────

/* ══════════ TABLE ══════════ */
const Table = (() => {

  function pipelineMiniHtml(l) {
    return PIPELINE_STAGES.map((d, i) => {
      const s = l.pipeline[d.key] || 'pending';
      const cls = s === 'done' ? 'done' : s === 'active' ? 'active' : 'pending';
      const conn = i < PIPELINE_STAGES.length - 1
        ? `<div class="pc ${s === 'done' ? 'done' : ''}"></div>` : '';
      return `<div class="ps ${cls}" data-tip="${d.label}" onclick="event.stopPropagation();Pipeline.quickToggle('${l.id}','${d.key}')">${d.short}</div>${conn}`;
    }).join('');
  }

  function render(data) {
    const tb = document.getElementById('leadsTable');
    if (!data || !data.length) {
      tb.innerHTML = `<tr><td colspan="8"><div style="padding:40px;text-align:center;color:var(--text-secondary)">No leads match your filter.</div></td></tr>`;
      return;
    }
    tb.innerHTML = data.map(l => `
      <tr onclick="LeadModal.open('${l.id}','profile')">
        <td onclick="event.stopPropagation()"><input type="checkbox" class="row-check"/></td>
        <td>
          <div class="person-cell">
            <div class="avatar ${l.avClass}">${l.avInit}</div>
            <div class="person-info">
              <div class="pname">${escHtml(l.name)}</div>
              <div class="prole">${escHtml(l.title)}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="company-cell">
            <div class="cname">${escHtml(l.company)}</div>
            <div class="cabout">${escHtml(l.about)}</div>
          </div>
        </td>
        <td><div class="score-badge ${scoreClass(l.score)}">${l.score}</div></td>
        <td><span class="pill ${STATUS_PILL_CLASS[l.status] || 'p-new'}"><span class="pill-dot"></span>${l.status}</span></td>
        <td><div class="pipeline-mini">${pipelineMiniHtml(l)}</div></td>
        <td onclick="event.stopPropagation()">
          <a href="${l.linkedinUrl}" target="_blank" class="lnk" data-tip="LinkedIn">in</a>
          ${l.landingUrl && l.landingUrl !== '#'
            ? `<a href="${l.landingUrl}" target="_blank" class="lnk" data-tip="Landing Page">🔗</a>` : ''}
        </td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;align-items:center;gap:3px;justify-content:flex-end">
            <button class="icon-btn ai" data-tip="Generate Messages" onclick="LeadModal.open('${l.id}','ai')">✨</button>
            <button class="icon-btn" data-tip="Pipeline"             onclick="LeadModal.open('${l.id}','pipeline')">🔀</button>
            <button class="icon-btn" data-tip="Profile"              onclick="LeadModal.open('${l.id}','profile')">👁</button>
          </div>
        </td>
      </tr>`).join('');
  }

  function filterByText(q) {
    const s = q.toLowerCase();
    render(leads.filter(l =>
      l.name.toLowerCase().includes(s) ||
      l.company.toLowerCase().includes(s) ||
      l.title.toLowerCase().includes(s)
    ));
  }

  function filterByStatus(v) {
    render(v ? leads.filter(l => l.status === v) : leads);
  }

  function filterByPipe(v) {
    if (!v) { render(leads); return; }
    const map = {
      'Connection Sent':     'conn_sent',
      'Connection Accepted': 'conn_accepted',
      '1st Message Sent':    'msg1_sent',
      'Replied':             'msg1_replied',
    };
    const key = map[v];
    if (!key) { render(leads); return; }
    render(leads.filter(l => l.pipeline[key] === 'done' || l.pipeline[key] === 'active'));
  }

  function toggleAllCheck(el) {
    document.querySelectorAll('.row-check').forEach(c => c.checked = el.checked);
  }

  function exportCSV() {
    downloadBlob(leadsToCSV(leads), 'axelliant-leads.csv', 'text/csv');
    notify('✓ CSV exported');
  }

  return { render, filterByText, filterByStatus, filterByPipe, toggleAllCheck, exportCSV };
})();


/* ══════════ KANBAN ══════════ */
const Kanban = (() => {
  function render() {
    const board = document.getElementById('kanbanBoard');
    const stages = [
      { label: 'Not Started', key: null },
      ...PIPELINE_STAGES.slice(0, 4).map(s => ({ label: s.label, key: s.key })),
    ];
    board.innerHTML = stages.map(stage => {
      const stageLeads = stage.key === null
        ? leads.filter(l => PIPELINE_STAGES.every(d => l.pipeline[d.key] === 'pending'))
        : leads.filter(l => l.pipeline[stage.key] === 'done' || l.pipeline[stage.key] === 'active');

      return `
        <div style="min-width:200px;flex:1;max-width:240px">
          <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r) var(--r) 0 0;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12.5px;font-weight:600">${stage.label}</span>
            <span style="background:var(--border);border-radius:10px;padding:1px 7px;font-size:11px;font-weight:600;color:var(--text-secondary)">${stageLeads.length}</span>
          </div>
          <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 var(--r) var(--r);padding:8px;min-height:120px;display:flex;flex-direction:column;gap:6px">
            ${stageLeads.map(l => `
              <div onclick="LeadModal.open('${l.id}','pipeline')"
                style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;cursor:pointer;transition:box-shadow .15s"
                onmouseover="this.style.boxShadow='var(--shadow)'" onmouseout="this.style.boxShadow='none'">
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="avatar ${l.avClass}" style="width:24px;height:24px;font-size:9px;flex-shrink:0">${l.avInit}</div>
                  <div style="font-size:12.5px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(l.name)}</div>
                  <div class="score-badge ${scoreClass(l.score)}" style="width:26px;height:26px;font-size:10px">${l.score}</div>
                </div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">${escHtml(l.company)}</div>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');
  }
  return { render };
})();


/* ══════════ SCHEMA VIEW ══════════ */
const SchemaView = (() => {
  function render() {
    const wrap = document.getElementById('schemaWrap');
    wrap.innerHTML = SCHEMA.map((s, i) => `
      <div class="schema-tab-card">
        <div class="schema-tab-head">
          <div class="tab-badge"><span>${i + 1}</span>${s.tab}</div>
          <span style="font-size:12px;color:var(--text-secondary);margin-left:8px">— ${s.desc}</span>
          <span style="margin-left:auto;font-size:11px;color:var(--text-light)">${s.cols.length} columns</span>
        </div>
        <div class="schema-cols">
          ${s.cols.map(c => `
            <div class="col-pill ${c.pk ? 'pk' : c.fk ? 'fk' : ''}">
              ${c.name} <span class="col-type">${c.type}</span>
            </div>`).join('')}
        </div>
      </div>`).join('');
  }

  function downloadTemplate() {
    const csv = SCHEMA.map(s =>
      `# Tab: ${s.tab}\n${s.cols.map(c => c.name).join(',')}\n# (add rows below)\n\n`
    ).join('');
    downloadBlob(csv, 'axelliant-sheet-schema.csv', 'text/csv');
    notify('✓ Schema template downloaded');
  }

  return { render, downloadTemplate };
})();


/* ══════════ ACTIVITY VIEW ══════════ */
const ActivityView = (() => {
  function actItemHtml(a, leadName) {
    const who = leadName ? `${escHtml(leadName)} — ` : '';
    return `
      <div class="act-item">
        <div class="act-dot ${a.cls}">${a.icon}</div>
        <div class="act-text">
          <div class="at-title">${who}${escHtml(a.title)}</div>
          <div class="at-body">${escHtml(a.body)}</div>
        </div>
        <div class="act-time">${a.time}</div>
      </div>`;
  }

  function renderForLead(lead) {
    const feed = document.getElementById('actFeed');
    if (!lead.activity || !lead.activity.length) {
      feed.innerHTML = '<div style="font-size:12.5px;color:var(--text-secondary)">No activity yet.</div>';
      return;
    }
    feed.innerHTML = lead.activity.map(a => actItemHtml(a)).join('');
  }

  function renderGlobal() {
    const feed = document.getElementById('globalActivity');
    const all = [];
    leads.forEach(l => l.activity.forEach(a => all.push({ ...a, lead: l.name })));
    // merge stored global activity
    const stored = Storage.loadGlobalActivity();
    stored.forEach(a => all.push(a));
    // sort descending by time string (good enough for display)
    all.sort((a, b) => (b.time > a.time ? 1 : -1));
    if (!all.length) {
      feed.innerHTML = '<div style="font-size:13px;color:var(--text-secondary);padding:20px 0;text-align:center">No activity yet.</div>';
      return;
    }
    feed.innerHTML = all.slice(0, 50).map(a => actItemHtml(a, a.lead)).join('');
  }

  return { renderForLead, renderGlobal };
})();
