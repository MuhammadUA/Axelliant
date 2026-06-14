// ─────────────────────────────────────────────
//  utils.js  —  Shared helpers
// ─────────────────────────────────────────────

function fmtNow() {
  return new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function notify(msg, duration = 2800) {
  // Remove existing
  document.querySelectorAll('.notify').forEach(n => n.remove());
  const n = document.createElement('div');
  n.className = 'notify';
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), duration);
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    // Fallback for browsers without clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  });
}

function downloadBlob(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Convert leads array → CSV string */
function leadsToCSV(data) {
  const headers = [
    'id', 'name', 'job_title', 'company_name', 'company_about',
    'gateway_score', 'gateway_status', 'linkedin_url', 'landing_page_url',
    'profile_summary',
    ...PIPELINE_STAGES.map(s => s.key),
  ];
  const rows = data.map(l => [
    l.id, l.name, l.title, l.company,
    `"${(l.about || '').replace(/"/g, '""')}"`,
    l.score, l.status, l.linkedinUrl, l.landingUrl,
    `"${(l.summary || '').replace(/"/g, '""')}"`,
    ...PIPELINE_STAGES.map(s => l.pipeline[s.key] || 'pending'),
  ]);
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}
