// ─────────────────────────────────────────────
//  ai.js  —  GPT API + message sequence generation
// ─────────────────────────────────────────────

const AI = (() => {

  /* ── Populate prompt selector in the modal ── */
  function refreshPromptSelect() {
    const sel = document.getElementById('promptSelect');
    const prompts = Storage.loadPrompts();
    sel.innerHTML = '<option value="">— Select a prompt template —</option>' +
      prompts.map(p => `<option value="${p.id}">${escHtml(p.name)}</option>`).join('');
  }

  /* ── Render the full 4-message sequence ── */
  function renderSeqList(lead) {
    const container = document.getElementById('seqList');
    container.innerHTML = SEQ_DEFS.map((s, i) => {
      const msg   = lead?.messages?.[s.key] || '';
      const sentTs = lead?.messages?.[s.key + '_sent_at'] || '';
      const chars  = msg.length;

      return `
        <div class="seq-card" id="seq-card-${s.key}">
          <div class="seq-card-head">
            <div class="seq-num">${i + 1}</div>
            <div class="seq-title">${s.label}</div>
            ${sentTs
              ? `<span class="seq-sent-ts">✓ Sent ${sentTs}</span>`
              : `<span class="seq-status" id="seq-status-${s.key}" style="color:var(--text-light)">${msg ? 'Generated' : 'Pending'}</span>`}
            <button class="btn btn-ai btn-sm" onclick="AI.generateSingle('${s.key}')">✨ Generate</button>
          </div>
          <div class="seq-body">
            <div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:6px">
              ${s.hint} · Max ${s.maxChars} chars
            </div>
            <textarea
              class="seq-textarea"
              id="seq-ta-${s.key}"
              placeholder="Click Generate to create a personalised message…"
              oninput="AI.onTextareaInput('${s.key}', this)"
            >${escHtml(msg)}</textarea>
          </div>
          <div class="seq-footer">
            <button class="btn btn-outline btn-sm" onclick="AI.copySeq('${s.key}')">⎘ Copy</button>
            <button class="btn btn-success btn-sm" onclick="AI.markSent('${s.key}')">✓ Mark Sent</button>
            <span class="char-c" id="cc-${s.key}">${chars} / ${s.maxChars}</span>
          </div>
        </div>`;
    }).join('');
  }

  /* ── Save textarea edits back to lead ── */
  function onTextareaInput(key, el) {
    const lead = window._currentLead;
    const def  = SEQ_DEFS.find(s => s.key === key);
    const cc   = document.getElementById('cc-' + key);
    if (cc && def) cc.textContent = `${el.value.length} / ${def.maxChars}`;
    if (lead) {
      if (!lead.messages) lead.messages = {};
      lead.messages[key] = el.value;
      Storage.saveLeadsData(leads);
    }
  }

  /* ── Generate a single message via GPT ── */
  async function generateSingle(key) {
    const lead     = window._currentLead;
    const promptId = document.getElementById('promptSelect').value;
    if (!promptId)  { notify('⚠ Select a prompt template first'); return; }

    const apiKey = Storage.loadApiKey();
    if (!apiKey)    { notify('⚠ Add your OpenAI API key in Settings first'); return; }

    const prompts  = Storage.loadPrompts();
    const prompt   = prompts.find(p => p.id === promptId);
    if (!prompt || !lead) return;

    const def = SEQ_DEFS.find(s => s.key === key);
    const ta  = document.getElementById('seq-ta-' + key);
    const statusEl = document.getElementById('seq-status-' + key);

    ta.value = '';
    ta.placeholder = 'Generating…';
    ta.disabled = true;
    if (statusEl) statusEl.textContent = 'Generating…';

    const userMsg = [
      `Lead Name: ${lead.name}`,
      `Job Title: ${lead.title}`,
      `Company: ${lead.company}`,
      `Company About: ${lead.about}`,
      `Profile Summary: ${lead.summary || 'N/A'}`,
      '',
      `Write a "${def.label}" LinkedIn outreach message.`,
      `Maximum ${def.maxChars} characters. Be concise and human.`,
    ].join('\n');

    try {
      const model = Storage.loadModel();
      const res   = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt.prompt },
            { role: 'user',   content: userMsg },
          ],
          max_tokens:  Math.ceil(def.maxChars * 1.6),
          temperature: 0.8,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.choices[0].message.content.trim();

      ta.value       = text;
      ta.disabled    = false;
      ta.placeholder = '';
      if (!lead.messages) lead.messages = {};
      lead.messages[key] = text;

      // Update char count
      const cc = document.getElementById('cc-' + key);
      if (cc) cc.textContent = `${text.length} / ${def.maxChars}`;
      if (statusEl) statusEl.textContent = 'Generated';

      // Log activity
      lead.activity.unshift({
        icon: '✨', cls: 'ad-ai',
        title: `AI Message Generated`,
        body:  `${def.label} written by ${model} · prompt: ${prompt.name}`,
        time:  fmtNow(),
      });

      Storage.saveLeadsData(leads);
      ActivityView.renderForLead(lead);
      notify(`✓ ${def.label} generated`);

    } catch (err) {
      ta.disabled    = false;
      ta.placeholder = `Error: ${err.message}`;
      if (statusEl) statusEl.textContent = 'Error';
      notify(`❌ ${err.message}`);
    }
  }

  /* ── Generate all 4 messages in sequence ── */
  async function generateAll() {
    const promptId = document.getElementById('promptSelect').value;
    if (!promptId) { notify('⚠ Select a prompt template first'); return; }
    const apiKey = Storage.loadApiKey();
    if (!apiKey)   { notify('⚠ Add your OpenAI API key in Settings first'); return; }

    const btn = document.getElementById('genAllBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

    for (const s of SEQ_DEFS) {
      await generateSingle(s.key);
      await new Promise(r => setTimeout(r, 500)); // small gap between calls
    }

    if (btn) { btn.disabled = false; btn.textContent = '✨ Generate All'; }
    notify('✓ Full sequence generated');
  }

  /* ── Copy message to clipboard ── */
  function copySeq(key) {
    const ta = document.getElementById('seq-ta-' + key);
    if (!ta || !ta.value) { notify('Nothing to copy — generate first'); return; }
    copyToClipboard(ta.value).then(() => notify('✓ Copied to clipboard'));
  }

  /* ── Mark message as sent + auto-tick pipeline stage ── */
  function markSent(key) {
    const lead = window._currentLead;
    if (!lead) return;

    const ts  = fmtNow();
    const def = SEQ_DEFS.find(s => s.key === key);
    if (!lead.messages) lead.messages = {};
    lead.messages[key + '_sent_at'] = ts;

    // Tick corresponding pipeline stage
    if (def.pipeKey && lead.pipeline[def.pipeKey] !== 'done') {
      lead.pipeline[def.pipeKey]        = 'done';
      lead.pipeTimestamps[def.pipeKey]  = ts;
    }

    lead.activity.unshift({
      icon: '✓', cls: 'ad-ok',
      title: `${def.label} Sent`,
      body:  `Marked as sent at ${ts}`,
      time:  fmtNow(),
    });

    Storage.saveLeadsData(leads);
    renderSeqList(lead);
    Pipeline.renderDetail(lead);
    ActivityView.renderForLead(lead);
    Table.render(leads);
    notify(`✓ Marked as sent · ${ts}`);
  }

  return { refreshPromptSelect, renderSeqList, generateSingle, generateAll, copySeq, markSent, onTextareaInput };
})();
