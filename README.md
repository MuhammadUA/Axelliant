# Axelliant — Lead Intelligence Dashboard

A clean, minimal lead intelligence dashboard that connects to **Google Sheets** as a live data backend, tracks full outreach pipeline with timestamps, and generates personalised LinkedIn message sequences using **OpenAI GPT**.

> Designed to migrate to a proper backend (Supabase / Firebase / PostgreSQL) with zero UI changes — only `js/storage.js` needs updating.

---

## Features

| Feature | Details |
|---|---|
| **Live Google Sheets Sync** | Paste your sheet URL, set sync interval, data loads automatically |
| **Lead Table** | Search, filter by status/pipeline stage, export CSV |
| **Pipeline Tracking** | 8 stages per lead · click to toggle · auto-timestamps on completion |
| **AI Message Sequence** | GPT-4o generates Connection Request + 3 follow-up messages |
| **Prompt Templates** | Create named system prompts in Settings, select per lead |
| **Per-Lead Activity Feed** | Every action timestamped and logged |
| **Global Activity Timeline** | Cross-lead dashboard view |
| **Pipeline Kanban** | Visual board grouped by stage |
| **Sheet Schema Page** | 4-tab DB-ready schema with downloadable template |
| **Settings** | API key, model selector, GS config, prompt management |

---

## Project Structure

```
Axelliant/
├── index.html          # Shell + markup (no inline JS/CSS)
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── config.js       # Pipeline stages, sequence defs, schema (constants)
│   ├── data.js         # Sample lead data (replaced by GS sync)
│   ├── storage.js      # localStorage layer → swap for API calls when migrating
│   ├── utils.js        # fmtNow, escHtml, notify, copyToClipboard, etc.
│   ├── nav.js          # Page navigation, modal/tab management
│   ├── render.js       # Table, Kanban, SchemaView, ActivityView renderers
│   ├── pipeline.js     # Stage toggle logic + timestamp logging
│   ├── ai.js           # GPT API integration + sequence generation
│   ├── modal.js        # Lead detail modal orchestration
│   ├── settings.js     # API key, GS config, prompt CRUD
│   └── app.js          # Bootstrap & init
├── docs/
│   └── google-sheets-setup.md
├── .gitignore
└── README.md
```

---

## Quick Start

1. Clone the repo and open `index.html` in any modern browser — no build step needed.
2. Go to **Settings** → paste your OpenAI API key → choose a model.
3. Create a **Prompt Template** (or use the defaults).
4. Click **Sheet Config** → paste your Google Sheet URL → Save & Sync.
5. Open any lead → **✨ AI Sequence** tab → select a prompt → **Generate All**.

---

## Google Sheets Setup

See [`docs/google-sheets-setup.md`](docs/google-sheets-setup.md) for the full 4-tab schema and Apps Script web app snippet.

**Column mapping for the `Leads` tab:**

| Col | Field | Col | Field |
|-----|-------|-----|-------|
| A | id | B | name |
| C | job_title | D | company_name |
| E | company_about | F | gateway_score |
| G | gateway_status | H | linkedin_url |
| I | landing_page_url | J | profile_summary |
| K | created_at | L | updated_at |

---

## AI Message Generation

1. Select a **Prompt Template** (manage in Settings)
2. The following is sent to GPT for each message:
   - **System:** your prompt template
   - **User:** lead name, title, company, company about, profile summary + message type instruction
3. Generates 4 messages: Connection Request (≤300 chars), 1st Message, 2nd Message, 3rd Message
4. Each message is independently copyable and has a **Mark Sent** button that auto-logs the timestamp and ticks the pipeline stage

---

## Migration Path

The `js/storage.js` module is the only abstraction between the UI and the backend. Each function (`loadLeadsData`, `saveLeadsData`, `loadPrompts`, etc.) can be swapped for an API call independently, making migration incremental:

```
Google Sheets  →  Apps Script JSON endpoint  →  Supabase / Firebase / REST API
```

No other files need to change.

---

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no framework, no build step)
- Google Fonts (Inter)
- OpenAI API (GPT-4o / GPT-4o Mini)
- localStorage for persistence (browser-side until backend is connected)
