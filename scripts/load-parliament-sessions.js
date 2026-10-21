#!/usr/bin/env node
// Loads parliament_sessions (names and dates of each parliamentary session) from Parliament's calendar API:
//   https://whatson-api.parliament.uk/calendar/sessions/list.json
// The Bills API has no Sessions endpoint (/api/v1/Sessions returns 404); the calendar's SessionId is the same number
// the Bills API uses for introducedSessionId and each stage's sessionId (checked 20 Oct 2026: every session's bills
// were introduced between its start and end dates). There are no sessions 31 to 33: the calendar goes from 30
// (2017-19) to 34 (2019).
//
// DRY RUN BY DEFAULT: prints the sessions and checks every introduced_session_id in bill has a row.
//   --sql=file.sql  writes one guarded transaction that replaces the table (for psql).
//   --write         upserts the rows through the API with SUPABASE_SERVICE_ROLE_KEY; nothing is deleted. The daily
//                   sync (.github/workflows/daily-sync.yml) runs this after the bills sync, so a new session gets its
//                   name the day its first bill arrives (until then the site shows "Session 41").
//
// Usage: node scripts/load-parliament-sessions.js [--cache=dir] [--sql=file.sql | --write]
try { require('dotenv').config({ path: '.env.local', quiet: true }); } catch { /* CI sets the environment itself */ }
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { makePoliteFetch } = require('./lib/polite-fetch');

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const SOURCE = 'https://whatson-api.parliament.uk/calendar/sessions/list.json';
const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

// '2024-26' stays; '2019-19' (the short October to December 2019 session) becomes '2019'.
function sessionName(desc) {
  const m = String(desc || '').match(/^(\d{4})-(\d{2})$/);
  if (m && m[1].slice(2) === m[2]) return m[1];
  return String(desc || '').trim();
}

(async () => {
  const { getJson, requestCount } = makePoliteFetch({ cacheDir: arg('cache') || null });
  const res = await getJson(SOURCE);
  if (res.status !== 200 || !Array.isArray(res.json)) throw new Error(`calendar API returned HTTP ${res.status}`);
  const rows = res.json.map((s) => ({
    id: s.SessionId, number: s.Number, parliament_number: Number(s.ParliamentNumber), session_number: Number(s.SessionNumber),
    name: sessionName(s.CommonsDescription), commons_description: s.CommonsDescription,
    start_date: String(s.StartDate).slice(0, 10), end_date: s.EndDate ? String(s.EndDate).slice(0, 10) : null,
  }));
  for (const r of rows) {
    if (!Number.isInteger(r.id) || !r.name || !/^\d{4}-\d{2}-\d{2}$/.test(r.start_date)) throw new Error(`unexpected session row ${JSON.stringify(r)}`);
  }
  console.log(`${rows.length} sessions from ${SOURCE} (requests made: ${requestCount()})`);
  for (const r of rows.filter((x) => x.id >= 18)) console.log(`  ${r.id}  ${r.number.padEnd(5)} ${r.name.padEnd(8)} ${r.start_date} to ${r.end_date}`);
  const ids = new Set(rows.map((r) => r.id));
  console.log(`IDs 31, 32, 33 in the calendar: ${[31, 32, 33].filter((i) => ids.has(i)).join(', ') || 'none'}`);

  // The service role key when there is one (the nightly workflow): the anon key written into daily-sync.yml was
  // no longer valid ("Invalid API key"), which is what failed this step on 21 Oct 2026.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const used = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('bill').select('introduced_session_id').order('id').range(from, from + 999);
    // Throw the message, not the error object: the 21 Oct 2026 failure printed only "[object Object]".
    if (error) throw new Error(`bill read at row ${from}: ${error.message}`);
    for (const b of data) if (b.introduced_session_id != null) used.add(b.introduced_session_id);
    if (data.length < 1000) break;
  }
  const missing = [...used].filter((i) => !ids.has(i));
  console.log(`sessions used by bills: ${[...used].sort((a, b) => a - b).join(', ')}; without a calendar row: ${missing.join(', ') || 'none'}`);
  if (missing.length) throw new Error('some bill sessions have no calendar row; not writing');

  if (process.argv.includes('--write')) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('--write needs SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });
    const now = new Date().toISOString();
    const { error } = await admin.from('parliament_sessions').upsert(rows.map((r) => ({ ...r, source_url: SOURCE, fetched_at: now })), { onConflict: 'id' });
    if (error) throw new Error(`upsert failed: ${error.message}`);
    const { count, error: e2 } = await admin.from('parliament_sessions').select('id', { count: 'exact', head: true });
    if (e2) throw new Error(e2.message);
    if ((count ?? 0) < rows.length) throw new Error(`expected at least ${rows.length} sessions after the upsert, found ${count}`);
    console.log(`\nUpserted ${rows.length} sessions; parliament_sessions now has ${count}.`);
    return;
  }
  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql or --write to write.'); return; }
  const C = ['id', 'number', 'parliament_number', 'session_number', 'name', 'commons_description', 'start_date', 'end_date'];
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;', 'DELETE FROM public.parliament_sessions;',
    `INSERT INTO public.parliament_sessions (${C.join(', ')}, source_url) VALUES`,
    rows.map((r) => `(${C.map((c) => q(r[c])).join(', ')}, ${q(SOURCE)})`).join(',\n') + ';',
    'DO $$ DECLARE n int; BEGIN',
    `  SELECT count(*) INTO n FROM public.parliament_sessions; IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} sessions, found %', n; END IF;`,
    `  SELECT count(DISTINCT b.introduced_session_id) INTO n FROM public.bill b LEFT JOIN public.parliament_sessions p ON p.id = b.introduced_session_id WHERE b.introduced_session_id IS NOT NULL AND p.id IS NULL;`,
    `  IF n <> 0 THEN RAISE EXCEPTION '% bill sessions have no name', n; END IF;`,
    'END $$;', 'COMMIT;'];
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${rows.length} sessions). Not run.`);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
