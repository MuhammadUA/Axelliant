# Google Sheets Setup Guide

## Overview

The dashboard uses Google Sheets as its live data backend. Data is read on page load and can be force-synced at any time. When you move to a proper backend (Supabase, Firebase, PostgreSQL, etc.), the `Storage` module in `js/storage.js` is the only file that needs to change.

---

## Sheet Structure

Create a Google Spreadsheet with **4 tabs** named exactly as below.

### Tab 1: `Leads`

| Column | Field           | Type     | Notes                        |
|--------|-----------------|----------|------------------------------|
| A      | id              | TEXT     | Unique identifier (e.g. `l1`) |
| B      | name            | TEXT     | Full name                    |
| C      | job_title       | TEXT     |                              |
| D      | company_name    | TEXT     |                              |
| E      | company_about   | TEXT     | Short company description    |
| F      | gateway_score   | NUMBER   | 0–100                        |
| G      | gateway_status  | TEXT     | Hot / Warm / Cold / New / Qualified |
| H      | linkedin_url    | URL      |                              |
| I      | landing_page_url| URL      | Profile summary landing page |
| J      | profile_summary | TEXT     | AI-enriched bio paragraph    |
| K      | created_at      | DATETIME | ISO 8601 or Google Sheets date |
| L      | updated_at      | DATETIME |                              |

### Tab 2: `Pipeline`

Append-only log — one row per stage action per lead.

| Column | Field     | Type     | Notes                              |
|--------|-----------|----------|------------------------------------|
| A      | id        | TEXT     | Unique row ID                      |
| B      | lead_id   | TEXT     | Foreign key → Leads.id             |
| C      | stage     | TEXT     | e.g. `conn_sent`, `msg1_replied`   |
| D      | status    | TEXT     | `done` / `active` / `pending`      |
| E      | timestamp | DATETIME |                                    |
| F      | notes     | TEXT     | Optional                           |

### Tab 3: `Messages`

| Column | Field        | Type     | Notes                          |
|--------|--------------|----------|--------------------------------|
| A      | id           | TEXT     |                                |
| B      | lead_id      | TEXT     | → Leads.id                     |
| C      | sequence     | NUMBER   | 1 = Connection, 2 = Msg1, etc. |
| D      | message_type | TEXT     | `connection` / `msg1` / `msg2` / `msg3` |
| E      | content      | TEXT     | Full message text              |
| F      | prompt_used  | TEXT     | Prompt template name           |
| G      | generated_at | DATETIME |                                |
| H      | sent_at      | DATETIME | Null until marked sent         |

### Tab 4: `Prompts`

| Column | Field         | Type     |
|--------|---------------|----------|
| A      | id            | TEXT     |
| B      | name          | TEXT     |
| C      | system_prompt | TEXT     |
| D      | created_at    | DATETIME |

---

## Connecting to the Dashboard

1. Open the dashboard → click **Sheet Config** (sidebar or topbar)
2. Paste your Google Sheet URL
3. Enter the tab name (`Leads`)
4. Click **Save & Sync**

The dashboard currently reads a local sample dataset. To wire in live Sheets data, implement a fetch inside `Storage.loadLeadsData()` using the [Google Sheets API v4](https://developers.google.com/sheets/api) or a [Google Apps Script Web App](https://developers.google.com/apps-script/guides/web) endpoint.

---

## Apps Script Web App (Recommended for v1)

Deploy a Google Apps Script as a Web App that returns JSON:

```javascript
function doGet(e) {
  const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getSheetByName('Leads');
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const data = rows.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Then in `Storage.loadLeadsData()`, replace the localStorage read with:
```javascript
const res  = await fetch('YOUR_WEB_APP_URL');
const data = await res.json();
```

---

## Migration to a Proper Backend

When ready to move off Google Sheets:

1. The 4-tab schema maps directly to 4 database tables.
2. Only `js/storage.js` needs updating — swap each function to call your API.
3. All other modules (pipeline, ai, settings, render) are backend-agnostic.
