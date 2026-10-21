// Backfill contract_notices (migration 2026-10-21k) from Find a Tender's OCDS release feed, from 1 January 2025
// (owner's approval, 21 Oct 2026). Same parsing as the daily route (lib/contract-notices.ts).
//
// Polite fetching: one request at a time, a 2-second pause after each response, Retry-After honoured on HTTP 429
// (60 s when missing, up to 4 tries), any other error retried once after 30 s. A page that still fails is
// recorded with the page it stopped at, and the next run resumes there.
//
// One pass through the feed from updatedFrom (default 2025-01-01), following its links.next cursor to the newest
// release. The feed ignores updatedTo (tested 21 Oct 2026: a 31 Jan to 1 Feb 2025 window returned releases dated up
// to 21 Feb with a next page), so it cannot be read month by month. The cursor is saved after every page, so a
// stopped run resumes where it stopped; counts are kept by the month each release is dated.
//
// Usage (Node 22, which runs the TypeScript parser directly):
//   node --experimental-strip-types scripts/backfill-contract-notices.mjs --state=<file.json>           dry run
//   node --experimental-strip-types scripts/backfill-contract-notices.mjs --state=<file.json> --write   save
//   --from=2025-01-01 to start elsewhere (ignored once the state file holds a cursor)

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { noticeRows, uniqueNoticeRows } from '../lib/contract-notices.ts';

try { (await import('dotenv')).config({ path: '.env.local', quiet: true }); } catch { /* CI sets the environment */ }

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || null;
const WRITE = process.argv.includes('--write');
const STATE = arg('state');
if (!STATE) { console.error('--state=<file.json> is required (progress is kept there so the run can resume)'); process.exit(1); }
const API = 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages';
const PAUSE_MS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FROM = `${arg('from') || '2025-01-01'}T00:00:00`;

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { from: FROM, cursor: null, done: false, pages: 0, months: {}, error: null };
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1));

const db = WRITE ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
if (WRITE && !process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('--write needs SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

let requests = 0;
async function getPage(url) {
  let tries429 = 0, triesOther = 0;
  for (;;) {
    let res, err = null;
    try { res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'opengovt.uk contract histories backfill' } }); requests++; }
    catch (e) { err = e.message; }
    if (res && res.status === 429 && tries429 < 4) {
      tries429++;
      const wait = Number(res.headers.get('retry-after')) || 60;
      console.log(`  429: waiting ${wait}s as Retry-After asks`);
      await sleep(wait * 1000);
      continue;
    }
    if (res && res.ok) {
      const text = await res.text();
      await sleep(PAUSE_MS);
      if (!text) throw new Error('empty response body');
      return JSON.parse(text);
    }
    const why = err || `HTTP ${res.status}`;
    if (triesOther < 1) { triesOther++; console.log(`  ${why}: retrying once in 30s`); await sleep(30_000); continue; }
    throw new Error(why);
  }
}

async function writeRows(rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from('contract_notices').upsert(rows.slice(i, i + 200), { onConflict: 'ocid,release_id,contract_key,value_type' });
    if (error) throw new Error(`contract_notices upsert: ${error.message}`);
  }
}

const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

const tally = (ym) => (state.months[ym] ||= { releases: 0, rows: 0, tags: {}, noticeTypes: {}, valueTypes: {} });
let url = state.cursor || `${API}?${new URLSearchParams({ updatedFrom: state.from, limit: '100' })}`;
const t0 = Date.now();
state.error = null;
while (!state.done) {
  let data;
  try { data = await getPage(url); }
  catch (e) { state.error = `${e.message} (at page ${state.pages + 1})`; save(); break; }
  const releases = Array.isArray(data.releases) ? data.releases : [];
  const rows = uniqueNoticeRows(releases.flatMap((r) => noticeRows(r)));
  if (WRITE && rows.length) {
    try { await writeRows(rows); }
    catch (e) { state.error = `${e.message} (at page ${state.pages + 1})`; save(); break; }
  }
  const typeOf = new Map(rows.map((r) => [r.release_id, r.notice_type || 'none']));
  for (const r of releases) {
    const m = tally(String(r.date || 'undated').slice(0, 7));
    m.releases++;
    bump(m.tags, (r.tag || []).join('+') || 'none');
    bump(m.noticeTypes, typeOf.get(String(r.id)) || 'none');
  }
  for (const row of rows) { const m = tally(String(row.published_at).slice(0, 7)); m.rows++; bump(m.valueTypes, row.value_type); }
  state.pages++;
  const next = data?.links?.next;
  if (!next || releases.length === 0) state.done = true;
  else state.cursor = url = next;
  save();
  if (state.pages % 25 === 0 || state.done) {
    const last = releases.length ? String(releases[releases.length - 1].date).slice(0, 10) : '-';
    console.log(`page ${state.pages}: releases dated up to ${last}, ${Math.round((Date.now() - t0) / 1000)}s this run`);
  }
}

const all = Object.values(state.months);
const sum = (k) => all.reduce((s, m) => s + (m[k] || 0), 0);
const merge = (k) => all.reduce((o, m) => { for (const [a, n] of Object.entries(m[k] || {})) bump(o, a, n); return o; }, {});
console.log(`\nTotal: ${sum('releases')} releases, ${sum('rows')} rows, ${requests} requests this run`);
console.log(`notice types: ${JSON.stringify(merge('noticeTypes'))}`);
console.log(`tags: ${JSON.stringify(merge('tags'))}`);
console.log(`value types: ${JSON.stringify(merge('valueTypes'))}`);
console.log(`pages read in all: ${state.pages}; finished: ${state.done ? 'yes' : `no, stopped: ${state.error} (run again to resume)`}`);
console.log(WRITE ? 'WRITE complete.' : 'DRY RUN complete. Nothing was written.');
if (!state.done) process.exit(1);
