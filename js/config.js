// ─────────────────────────────────────────────
//  config.js  —  Static definitions
// ─────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: 'conn_sent',      label: 'Connection Sent',     emoji: '📤', short: 'CS' },
  { key: 'conn_accepted',  label: 'Connection Accepted', emoji: '✅', short: 'CA' },
  { key: 'msg1_sent',      label: '1st Message Sent',    emoji: '💬', short: 'M1' },
  { key: 'msg1_replied',   label: '1st Message Replied', emoji: '↩',  short: 'R1' },
  { key: 'msg2_sent',      label: '2nd Message Sent',    emoji: '📨', short: 'M2' },
  { key: 'msg2_replied',   label: '2nd Message Replied', emoji: '↩',  short: 'R2' },
  { key: 'msg3_sent',      label: '3rd Message Sent',    emoji: '📩', short: 'M3' },
  { key: 'msg3_replied',   label: '3rd Message Replied', emoji: '🎯', short: 'R3' },
];

const SEQ_DEFS = [
  { key: 'connection', label: 'Connection Request',       hint: 'Short note (≤300 chars) to attach to LinkedIn connection request', maxChars: 300, pipeKey: 'conn_sent' },
  { key: 'msg1',       label: '1st Message',              hint: 'First message after connection is accepted',                        maxChars: 500, pipeKey: 'msg1_sent' },
  { key: 'msg2',       label: '2nd Message (Follow-up 1)',hint: 'Follow-up if no reply to 1st message',                              maxChars: 500, pipeKey: 'msg2_sent' },
  { key: 'msg3',       label: '3rd Message (Follow-up 2)',hint: 'Final follow-up message',                                           maxChars: 500, pipeKey: 'msg3_sent' },
];

const SCHEMA = [
  {
    tab: 'Leads',
    desc: 'One row per lead — the master record',
    cols: [
      { name: 'id',                  pk: true, type: 'TEXT'     },
      { name: 'name',                          type: 'TEXT'     },
      { name: 'job_title',                     type: 'TEXT'     },
      { name: 'company_name',                  type: 'TEXT'     },
      { name: 'company_about',                 type: 'TEXT'     },
      { name: 'gateway_score',                 type: 'NUMBER'   },
      { name: 'gateway_status',                type: 'TEXT'     },
      { name: 'linkedin_url',                  type: 'URL'      },
      { name: 'landing_page_url',              type: 'URL'      },
      { name: 'profile_summary',               type: 'TEXT'     },
      { name: 'created_at',                    type: 'DATETIME' },
      { name: 'updated_at',                    type: 'DATETIME' },
    ],
  },
  {
    tab: 'Pipeline',
    desc: 'One row per stage action per lead (append-only log)',
    cols: [
      { name: 'id',        pk: true,  type: 'TEXT'                  },
      { name: 'lead_id',   fk: true,  type: 'TEXT → Leads.id'       },
      { name: 'stage',               type: 'TEXT'                  },
      { name: 'status',              type: 'TEXT (done/active/pending)' },
      { name: 'timestamp',           type: 'DATETIME'              },
      { name: 'notes',               type: 'TEXT'                  },
    ],
  },
  {
    tab: 'Messages',
    desc: 'Generated & sent messages per lead',
    cols: [
      { name: 'id',           pk: true,  type: 'TEXT'           },
      { name: 'lead_id',      fk: true,  type: 'TEXT → Leads.id'},
      { name: 'sequence',                type: 'NUMBER (1–4)'   },
      { name: 'message_type',            type: 'TEXT'           },
      { name: 'content',                 type: 'TEXT'           },
      { name: 'prompt_used',             type: 'TEXT'           },
      { name: 'generated_at',            type: 'DATETIME'       },
      { name: 'sent_at',                 type: 'DATETIME'       },
    ],
  },
  {
    tab: 'Prompts',
    desc: 'Reusable AI prompt templates',
    cols: [
      { name: 'id',            pk: true, type: 'TEXT'     },
      { name: 'name',                    type: 'TEXT'     },
      { name: 'system_prompt',           type: 'TEXT'     },
      { name: 'created_at',              type: 'DATETIME' },
    ],
  },
];

const STATUS_PILL_CLASS = {
  Hot: 'p-hot', Warm: 'p-warm', Cold: 'p-cold', New: 'p-new', Qualified: 'p-qualified',
};
const scoreClass = s => (s >= 85 ? 'sh' : s >= 65 ? 'sm' : 'sl');
