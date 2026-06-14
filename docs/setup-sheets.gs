// ═══════════════════════════════════════════════════════════════════
//  Axelliant — One-time Sheet Setup Script
//
//  HOW TO RUN:
//  1. Open your Google Sheet → Extensions → Apps Script
//  2. Paste this entire file (replace everything)
//  3. Click Run → setupAllSheets
//  4. Grant permissions when prompted
//  5. Done — check your sheet for the 4 tabs
//
//  SAFE TO RE-RUN: existing data rows are preserved.
//  Only the header row is written/fixed.
// ═══════════════════════════════════════════════════════════════════

function setupAllSheets() {
  setupLeads();
  setupPipeline();
  setupMessages();
  setupPrompts();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    '✅ All 4 tabs created/updated successfully!',
    'Axelliant Setup', 5
  );
}

// ── LEADS ─────────────────────────────────────────────────────────
// One row per lead. id column will be auto-filled by the dashboard.
function setupLeads() {
  var headers = [
    'id',               // A — auto-assigned by dashboard on first sync
    'name',             // B
    'job_title',        // C
    'company_name',     // D
    'company_about',    // E
    'gateway_score',    // F — numeric score
    'gateway_status',   // G — AXELLIANT_PRIORITY_1 / AXELLIANT_QUALIFIED / AXELLIANT_LOW_PRIORITY
    'linkedin_url',     // H
    'landing_page_url', // I
    'profile_summary',  // J
    'created_at',       // K
    'updated_at',       // L
  ];

  var sheet = getOrCreate('Leads', '#1a73e8');
  writeHeaders(sheet, headers);
  setColumnWidths(sheet, [120, 160, 200, 200, 300, 90, 160, 220, 220, 300, 140, 140]);
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
}

// ── PIPELINE ──────────────────────────────────────────────────────
// One row per lead. Timestamp written into a stage column when done,
// cleared if toggled back.
function setupPipeline() {
  var headers = [
    'lead_id',           // A — matches Leads.id
    'lead_name',         // B — denormalised for readability
    'conn_sent_at',      // C — Connection Request sent
    'conn_accepted_at',  // D — Connection Accepted
    'msg1_sent_at',      // E — 1st Message sent
    'msg1_replied_at',   // F — 1st Message replied
    'msg2_sent_at',      // G — 2nd Message sent
    'msg2_replied_at',   // H — 2nd Message replied
    'msg3_sent_at',      // I — 3rd Message sent
    'msg3_replied_at',   // J — 3rd Message replied
    'last_updated',      // K
  ];

  var sheet = getOrCreate('Pipeline', '#4F46E5');
  writeHeaders(sheet, headers);
  setColumnWidths(sheet, [220, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160]);
}

// ── MESSAGES ──────────────────────────────────────────────────────
// One row per lead. Each message has a content column + sent_at column.
// system_prompt records which prompt template was used.
function setupMessages() {
  var headers = [
    'lead_id',              // A — matches Leads.id
    'lead_name',            // B
    'system_prompt',        // C — prompt template name (title only, not full text)
    'connection_note',      // D — connection request note (≤300 chars)
    'connection_sent_at',   // E
    'msg1',                 // F — 1st message after connection accepted
    'msg1_sent_at',         // G
    'msg2',                 // H — 2nd message / follow-up 1
    'msg2_sent_at',         // I
    'msg3',                 // J — 3rd message / follow-up 2
    'msg3_sent_at',         // K
    'last_updated',         // L
  ];

  var sheet = getOrCreate('Messages', '#059669');
  writeHeaders(sheet, headers);
  setColumnWidths(sheet, [220, 160, 300, 320, 160, 320, 160, 320, 160, 320, 160, 160]);
}

// ── PROMPTS ───────────────────────────────────────────────────────
// Optional reference tab — prompts are managed in the dashboard UI
// but this gives you a read-only view.
function setupPrompts() {
  var headers = [
    'id',           // A
    'name',         // B
    'system_prompt',// C
    'created_at',   // D
  ];

  var sheet = getOrCreate('Prompts', '#D97706');
  writeHeaders(sheet, headers);
  setColumnWidths(sheet, [120, 180, 500, 160]);
}

// ── Helpers ───────────────────────────────────────────────────────

function getOrCreate(name, color) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    Logger.log('Created tab: ' + name);
  } else {
    Logger.log('Tab already exists, updating headers: ' + name);
  }
  return sheet;
}

function writeHeaders(sheet, headers) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold')
       .setFontColor('#ffffff')
       .setBackground(getTabColor(sheet))
       .setFontSize(11)
       .setVerticalAlignment('middle')
       .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);
}

// Re-read the tab color set during getOrCreate by checking the sheet name
var TAB_COLORS = {
  Leads:    '#1a73e8',
  Pipeline: '#4F46E5',
  Messages: '#059669',
  Prompts:  '#D97706',
};

function getTabColor(sheet) {
  return TAB_COLORS[sheet.getName()] || '#555555';
}

function setColumnWidths(sheet, widths) {
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
}
