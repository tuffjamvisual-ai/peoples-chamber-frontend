// The changes that used to be made by hand in the database, each followed by the site refresh of the pages that show
// it (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 139 item 4: nothing should rely on someone remembering
// scripts/revalidate.js). Pages keep their data until a table's tag is refreshed (A16), so a change made any other way
// stays unseen.
//
// DRY RUN BY DEFAULT: shows the row and what would change. Add --write to make the change.
//
//   node scripts/site-content.js briefing publish <slug>        publish a draft briefing (published_at now if empty)
//   node scripts/site-content.js briefing unpublish <slug>
//   node scripts/site-content.js programme live <slug>          put a policy programme live (went_live_at now if empty)
//   node scripts/site-content.js programme withdraw <slug>
//   node scripts/site-content.js timeline approve <id>          approve a programme timeline entry
//   node scripts/site-content.js timeline unapprove <id>
//   node scripts/site-content.js poll add "<question>" [--explainer="<text>"] [--type=yesno]
//   node scripts/site-content.js poll archive <id>
//   node scripts/site-content.js poll unarchive <id>
//
// The refresh covers only tables that really changed (scripts/lib/table-refresh.js). Uses .env.local; prints no keys.
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { trackTables } = require('./lib/table-refresh');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opt = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const WRITE = process.argv.includes('--write');
const [kind, action, key] = args;
const fail = (m) => { console.error(m); process.exit(1); };

const raw = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const db = trackTables(raw);
const now = () => new Date().toISOString();

// table, the column to find the row by, the read columns, and the change for each action (from the row as it is)
const PLAN = {
  briefing: { table: 'briefings', by: 'slug', cols: 'id, slug, headline, is_published, published_at', actions: {
    publish: (r) => ({ is_published: true, ...(r.published_at ? {} : { published_at: now() }) }),
    unpublish: () => ({ is_published: false }),
  } },
  programme: { table: 'policy_programmes', by: 'slug', cols: 'id, slug, name, status, is_live, went_live_at', actions: {
    live: (r) => ({ is_live: true, ...(r.went_live_at ? {} : { went_live_at: now() }), updated_at: now() }),
    withdraw: () => ({ is_live: false, updated_at: now() }),
  } },
  timeline: { table: 'programme_timeline', by: 'id', cols: 'id, programme_id, entry_date, title, is_approved, approved_at', actions: {
    approve: (r) => ({ is_approved: true, ...(r.approved_at ? {} : { approved_at: now() }) }),
    unapprove: () => ({ is_approved: false }),
  } },
  poll: { table: 'polls', by: 'id', cols: 'id, question, archived, poll_type, created_at', actions: {
    archive: () => ({ archived: true }),
    unarchive: () => ({ archived: false }),
  } },
};

async function addPoll(question) {
  if (!question || question.trim().length < 10) fail('give the poll question in quotes (at least 10 characters)');
  const row = { question: question.trim(), archived: false, poll_type: opt('type') || 'yesno', vote_count_yes: 0, vote_count_no: 0,
    ...(opt('explainer') ? { explainer: opt('explainer') } : {}) };
  console.log('New poll:', JSON.stringify(row));
  if (!WRITE) { console.log('Dry run: nothing written. Add --write to add it.'); return; }
  const { data, error } = await db.from('polls').insert(row).select('id').single();
  if (error) fail(`polls insert: ${error.message}`);
  console.log(`Added poll ${data.id}.`);
}

(async () => {
  const plan = PLAN[kind];
  if (kind === 'poll' && action === 'add') await addPoll(key);
  else {
    if (!plan || !plan.actions[action] || !key) fail('see the usage at the top of scripts/site-content.js');
    const value = plan.by === 'id' ? Number(key) : key;
    if (plan.by === 'id' && !Number.isInteger(value)) fail(`${key} is not an id`);
    const { data: row, error } = await raw.from(plan.table).select(plan.cols).eq(plan.by, value).maybeSingle();
    if (error) fail(`${plan.table}: ${error.message}`);
    if (!row) fail(`no ${kind} with ${plan.by} ${key}`);
    const change = plan.actions[action](row);
    console.log(`${kind} now:`, JSON.stringify(row));
    console.log('change:', JSON.stringify(change));
    if (Object.entries(change).every(([c, v]) => c.endsWith('_at') || row[c] === v)) { console.log('Already so: nothing to do.'); return; }
    if (!WRITE) { console.log('Dry run: nothing written. Add --write to make the change.'); return; }
    const { error: upErr } = await db.from(plan.table).update(change).eq('id', row.id);
    if (upErr) fail(`${plan.table} update: ${upErr.message}`);
    console.log('Done.');
  }
  await db.finishRefresh();
})().catch((e) => fail(`FAILED: ${e.message}`));
