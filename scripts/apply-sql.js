// Run a reviewed SQL file against the live database and refresh the site's pages for the tables it changed (owner,
// 15 Nov 2026, COWORK-TO-T1 ENTRY 139 item 4: nothing should rely on someone remembering scripts/revalidate.js).
// For the hand routes that produce a SQL file (scripts/reload-ministers-meetings.ts --sql, one-off fixes):
//
//   node scripts/apply-sql.js --sql=<file.sql> --tables=<table>[,<table>...] [--also=<view>[,<view>...]]
//
// The tables named are fingerprinted before and after (scripts/lib/table-refresh.js); only those that changed are
// refreshed; --also names views built on them (no primary key to fingerprint), refreshed with them. The file runs with the database load limits (scripts/lib/db-timeouts.js) and ON_ERROR_STOP; a failed run
// changes nothing and refreshes nothing. DATABASE_URL and SUPABASE_SECRET_KEY come from .env.local and are never printed.
require('dotenv').config({ path: '.env.local', quiet: true });
const fs = require('fs');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { fingerprint } = require('./lib/table-refresh');
const { refreshTableTags } = require('./lib/refresh-site');
const { withTimeouts } = require('./lib/db-timeouts');

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const file = arg('sql');
const also = arg('also').split(',').map((t) => t.trim()).filter(Boolean);
const tables = arg('tables').split(',').map((t) => t.trim()).filter(Boolean);
if (!file || !fs.existsSync(file)) { console.error('give --sql=<file.sql> (an existing file)'); process.exit(1); }
if (!tables.length) { console.error('give --tables=<table>[,<table>...]: the tables the file changes'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set (.env.local)'); process.exit(1); }

(async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const before = {};
  for (const t of tables) before[t] = await fingerprint(db, t);
  execFileSync('psql', [process.env.DATABASE_URL, '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: withTimeouts(fs.readFileSync(file, 'utf8')), stdio: ['pipe', 'inherit', 'inherit'] });
  const changed = [];
  for (const t of tables) if ((await fingerprint(db, t)) !== before[t]) changed.push(t);
  if (!changed.length) { console.log('The file ran; the tables named are unchanged, so no site refresh is needed.'); return; }
  console.log(`Changed: ${changed.join(', ')}.`);
  await refreshTableTags([...changed, ...also]);
})().catch((e) => { console.error(`FAILED: ${String(e.message || e).replace(/postgres\S+/g, '<address>')}`); process.exit(1); });
