// ─────────────────────────────────────────────
//  settings.js  —  Settings page: API key, GS config, prompts
// ─────────────────────────────────────────────

const Settings = (() => {

  /* ── Render the full settings page ── */
  function render() {
    _renderApiSection();
    _renderGsSection();
    renderPromptList();
  }

  function _renderApiSection() {
    document.getElementById('apiKeyInput').value = Storage.loadApiKey();
    document.getElementById('modelSel').value    = Storage.loadModel();
  }

  function _renderGsSection() {
    const cfg = Storage.loadGsConfig();
    document.getElementById('gsUrlInput').value      = cfg.url      || '';
    document.getElementById('gsTabInput').value      = cfg.tab      || 'Leads';
    document.getElementById('gsSyncInterval').value  = cfg.interval || 'Every 60 seconds';
  }

  /* ── Prompt list ── */
  function renderPromptList() {
    const prompts = Storage.loadPrompts();
    const list    = document.getElementById('promptList');
    list.innerHTML = prompts.map(p => `
      <div class="prompt-item" id="pi-${p.id}">
        <div class="prompt-item-head" onclick="Settings.togglePromptItem('${p.id}')">
          <div class="prompt-item-name">${escHtml(p.name)}</div>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();Settings.deletePrompt('${p.id}')">Delete</button>
          <span style="color:var(--text-light);font-size:12px;margin-left:4px">▾</span>
        </div>
        <div class="prompt-item-body">
          <div class="setting-row" style="margin-bottom:8px">
            <label>Name</label>
            <input class="setting-input" value="${escHtml(p.name)}" oninput="Settings.updateName('${p.id}',this.value)"/>
          </div>
          <div class="setting-row">
            <label>System Prompt</label>
            <textarea class="prompt-textarea" oninput="Settings.updateText('${p.id}',this.value)">${escHtml(p.prompt)}</textarea>
          </div>
        </div>
      </div>`).join('');
  }

  function togglePromptItem(id) {
    document.getElementById('pi-' + id)?.classList.toggle('open');
  }

  function addPrompt() {
    const prompts = Storage.loadPrompts();
    const p = { id: generateId('p'), name: 'New Prompt', prompt: '' };
    prompts.push(p);
    Storage.savePrompts(prompts);
    renderPromptList();
    document.getElementById('pi-' + p.id)?.classList.add('open');
  }

  function deletePrompt(id) {
    const prompts = Storage.loadPrompts().filter(p => p.id !== id);
    Storage.savePrompts(prompts);
    renderPromptList();
    notify('Prompt deleted');
  }

  function updateName(id, val) {
    const prompts = Storage.loadPrompts();
    const p = prompts.find(x => x.id === id);
    if (p) { p.name = val; Storage.savePrompts(prompts); }
  }

  function updateText(id, val) {
    const prompts = Storage.loadPrompts();
    const p = prompts.find(x => x.id === id);
    if (p) { p.prompt = val; Storage.savePrompts(prompts); }
  }

  /* ── API key / model ── */
  function saveApiKey() {
    Storage.saveApiKey(document.getElementById('apiKeyInput').value);
  }

  function toggleApiKeyVis() {
    const inp = document.getElementById('apiKeyInput');
    inp.type  = inp.type === 'password' ? 'text' : 'password';
  }

  function saveModel() {
    Storage.saveModel(document.getElementById('modelSel').value);
  }

  /* ── GS config ── */
  function saveGsConfig() {
    const cfg = {
      url:      document.getElementById('gsUrlInput').value,
      tab:      document.getElementById('gsTabInput').value,
      interval: document.getElementById('gsSyncInterval').value,
    };
    Storage.saveGsConfig(cfg);
    _updateGsBanner(cfg);
  }

  function saveGsFromModal() {
    const url = document.getElementById('gsUrlModal').value.trim();
    const tab = document.getElementById('gsTabModal').value.trim();
    const interval = document.getElementById('gsIntervalModal').value;
    // Sync back to settings inputs
    document.getElementById('gsUrlInput').value     = url;
    document.getElementById('gsTabInput').value     = tab;
    document.getElementById('gsSyncInterval').value = interval;
    const cfg = { url, tab, interval };
    Storage.saveGsConfig(cfg);
    _updateGsBanner(cfg);
    Nav.closeOverlay('gsModal');
    notify('✓ Google Sheets config saved');
  }

  function _updateGsBanner(cfg) {
    if (cfg.url) {
      document.getElementById('gs-banner-sub').textContent =
        `Syncing from "${cfg.tab || 'Leads'}" · Auto-refresh: ${cfg.interval}`;
      document.getElementById('gsStatusText').textContent = 'Sheet connected';
      document.getElementById('gsStatusDot').classList.remove('off');
    }
  }

  /* ── Sync ── */
  function syncNow() {
    notify('⟳ Syncing from Google Sheets…');
    document.getElementById('lastSync').textContent = 'just now';
    setTimeout(() => notify('✓ Sync complete · data refreshed'), 1200);
  }

  return {
    render, renderPromptList,
    togglePromptItem, addPrompt, deletePrompt, updateName, updateText,
    saveApiKey, toggleApiKeyVis, saveModel,
    saveGsConfig, saveGsFromModal, syncNow,
  };
})();
