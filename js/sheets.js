// ─────────────────────────────────────────────
//  sheets.js  —  Google Sheets CSV fetch & parse
// ─────────────────────────────────────────────

const GoogleSheets = (() => {

  const SHEET_ID = '18456AQqhWLtwnuglDbrY7TiDfHArR1t6QjujW3ZMD4U';
  const DEFAULT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

  function extractSheetId(url) {
    const m = (url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }

  /* ── CSV parser (handles quoted fields & embedded commas) ── */
  function parseCSVRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  /* Stable slug from name + company — used when the id column is blank */
  function _slugId(name, company) {
    return 'gs_' + (name + '_' + company).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 1) return [];
    const headers = parseCSVRow(lines[0]).map(h => h.trim());
    return lines.slice(1).map((line, idx) => {
      const vals = parseCSVRow(line);
      const obj  = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
      // Auto-generate a stable id if the sheet row has none
      if (!obj.id) obj.id = _slugId(obj.name || '', obj.company_name || '') || ('row_' + (idx + 2));
      return obj;
    }).filter(r => r.name); // skip completely blank rows
  }

  /* Map sheet gateway_status values to app display labels */
  const STATUS_MAP = {
    'AXELLIANT_PRIORITY_1':    'Hot',
    'AXELLIANT_PRIORITY_2':    'Hot',
    'AXELLIANT_QUALIFIED':     'Qualified',
    'AXELLIANT_WARM':          'Warm',
    'AXELLIANT_LOW_PRIORITY':  'Cold',
    'HOT':       'Hot',
    'WARM':      'Warm',
    'COLD':      'Cold',
    'QUALIFIED': 'Qualified',
    'NEW':       'New',
  };

  function _mapStatus(raw) {
    if (!raw) return 'New';
    const key = raw.toUpperCase().trim();
    return STATUS_MAP[key] || (STATUS_MAP[raw.trim()] || 'New');
  }

  /* ── Map a sheet row → app lead object ── */
  function rowToLead(row) {
    const name     = row.name || '';
    const initials = name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
    const score    = parseInt(row.gateway_score) || 0;

    return {
      id:          row.id,
      name:        name,
      title:       row.job_title || '',
      company:     row.company_name || '',
      about:       row.company_about || '',
      summary:     row.profile_summary || '',
      score:       score,
      status:      _mapStatus(row.gateway_status),
      linkedinUrl: row.linkedin_url   || '#',
      landingUrl:  row.landing_page_url || '#',
      avClass:     '',
      avInit:      initials,
      pipeline: {
        conn_sent: 'pending', conn_accepted: 'pending',
        msg1_sent: 'pending', msg1_replied:  'pending',
        msg2_sent: 'pending', msg2_replied:  'pending',
        msg3_sent: 'pending', msg3_replied:  'pending',
      },
      pipeTimestamps: {},
      messages: { connection: '', msg1: '', msg2: '', msg3: '' },
      activity: [
        {
          icon: '+', cls: 'ad-neutral',
          title: 'Lead Added',
          body:  `Imported from Google Sheets · Score: ${score}`,
          time:  row.created_at || new Date().toLocaleString(),
        },
      ],
    };
  }

  /* ── Fetch leads from the sheet, merge with saved pipeline state ── */
  async function sync() {
    const cfg = Storage.loadGsConfig();
    const id  = extractSheetId(cfg.url) || SHEET_ID;
    const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;

    const resp = await fetch(exportUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();

    const rows    = parseCSV(text);
    const saved   = Storage.loadLeadsData();
    const fetched = rows.map(rowToLead).map(lead => {
      // Merge saved pipeline / activity / messages onto fresh row
      if (saved[lead.id]) {
        lead.pipeline       = saved[lead.id].pipeline       || lead.pipeline;
        lead.pipeTimestamps = saved[lead.id].pipeTimestamps || lead.pipeTimestamps;
        lead.activity       = saved[lead.id].activity       || lead.activity;
        lead.messages       = saved[lead.id].messages       || lead.messages;
      }
      return lead;
    });

    // Replace global leads array in place
    leads.length = 0;
    fetched.forEach(l => leads.push(l));

    return leads;
  }

  /* ── Returns the pre-configured sheet URL ── */
  function defaultSheetUrl() { return DEFAULT_URL; }

  return { sync, extractSheetId, defaultSheetUrl, SHEET_ID };
})();
