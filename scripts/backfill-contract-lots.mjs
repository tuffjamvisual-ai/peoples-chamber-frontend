// Backfill contract lots (T1-LOT, owner approved 12 Nov 2026; migration 2026-11-12a) for the procurements in our record
// with more than one award, where a lot tells readers which part of the procurement each award or change is for.
//
//   pass 1  for each such procurement, its newest release with an award: tender.lots go to contract_lots, and every
//           stored notice row of an award that release names gets that award's lots (awards[].relatedLots).
//   pass 2  only the stored award releases whose award is still without lots after pass 1, one fetch each.
//
// Night only (Protect the live database): it will not start, and it stops, outside 23:00 to 05:00 UK time (the daily
// live check starts at 05:17), and sits out 01:40 to 02:10 while the contracts sync reads the same feed. One request
// at a time with a 3 second pause. A 429 is waited out once (its Retry-After, at most 150 s); a second 429 in a row stops
// the night's run, and so does any other error after one retry 30 s later. Progress is saved after every procurement,
// so each night carries on where the last stopped. A short report line goes to Claude outputs/STATUS.md (or
// ~/opengovt-backup/lots-backfill/STATUS-pending.md when that cannot be written).
//
// Usage (Node 22):
//   node --experimental-strip-types scripts/backfill-contract-lots.mjs              dry run (fetches, writes nothing)
//   node --experimental-strip-types scripts/backfill-contract-lots.mjs --write      save
//   --limit=N stops after N fetches; --any-time skips the night window (only for a dry run of a few fetches)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { lotRows, lotIdsOf, newerLotRows } from '../lib/contract-notices.ts';

try { (await import('dotenv')).config({ path: '.env.local', quiet: true }); } catch { /* environment set elsewhere */ }

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || null;
const WRITE = process.argv.includes('--write');
const ANY_TIME = process.argv.includes('--any-time');
const LIMIT = Number(arg('limit')) || Infinity;
if (WRITE && ANY_TIME) { console.error('--any-time is for dry runs only'); process.exit(1); }

const API = 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages';
const PAUSE_MS = 3000;
const DIR = path.join(os.homedir(), 'opengovt-backup/lots-backfill');
fs.mkdirSync(DIR, { recursive: true });
const STATE = path.join(DIR, WRITE ? 'state.json' : 'state-dry.json');
const STATUS = '/Volumes/GoliathSSD/opengovt-work/Claude outputs/STATUS.md';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ukParts = () => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' })
  .formatToParts(new Date()).map((p) => [p.type, p.value]));
const ukMinutes = () => { const p = ukParts(); return Number(p.hour) * 60 + Number(p.minute); };
const ukClock = () => { const p = ukParts(); return `${p.hour}:${p.minute} ${p.timeZoneName === 'BST' || p.timeZoneName === 'GMT+1' ? 'BST' : 'GMT'}`; };
const inNight = () => { const m = ukMinutes(); return m >= 23 * 60 || m < 5 * 60; };
const inSyncWindow = () => { const m = ukMinutes(); return m >= 100 && m < 130; };

function report(line) {
  const text = `${ukClock()} ${line}\n`;
  console.log(line);
  if (!WRITE) return;
  try { fs.appendFileSync(STATUS, text); } catch { fs.appendFileSync(path.join(DIR, 'STATUS-pending.md'), text); }
}

if (!ANY_TIME && !inNight()) { console.log('outside 23:00 to 05:00 UK time: not started'); process.exit(0); }

// The work list, read once (read only) and kept in the state file.
function psqlJson(sql) {
  const out = execFileSync('psql', [process.env.DATABASE_URL, '-X', '-q', '-At', '-c', 'BEGIN READ ONLY', '-c', "SET LOCAL statement_timeout='60s'", '-c', sql, '-c', 'ROLLBACK'], { encoding: 'utf8', maxBuffer: 64e6 });
  return JSON.parse(out.trim().split('\n').filter(Boolean).pop() || 'null') ?? [];
}
let state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : null;
if (!state) {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is needed for the work list'); process.exit(1); }
  const list = psqlJson(`with m as (select ocid from contract_notices where award_id is not null group by ocid having count(distinct award_id) > 1)
    select json_agg(json_build_object('ocid', ocid, 'release', release_id) order by ocid) from (
      select distinct on (n.ocid) n.ocid, n.release_id from m join contract_notices n using (ocid)
      where n.award_id is not null order by n.ocid, n.published_at desc) x`);
  state = { created: new Date().toISOString(), pass: 1, queue: list, done: 0, fetched: 0, lotsWritten: 0, noticeRowsLabelled: 0, nights: 0, notFound: 0 };
  fs.writeFileSync(STATE, JSON.stringify(state));
}
const save = () => fs.writeFileSync(STATE, JSON.stringify(state));
// Pass 1's releases: pass 2 never fetches one again (an award that names no lot there names none).
const seen = new Set(state.pass === 1 ? state.queue.slice(0, state.done).map((x) => x.release) : (state.pass1 || []));

const db = WRITE ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } }) : null;
if (WRITE && !process.env.SUPABASE_SECRET_KEY) { console.error('--write needs SUPABASE_SECRET_KEY'); process.exit(1); }

class Stop extends Error {}
async function getRelease(id) {
  let waited = false, retried = false;
  for (;;) {
    let res, err = null;
    try { res = await fetch(`${API}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json', 'User-Agent': 'opengovt.uk contract lots backfill' }, signal: AbortSignal.timeout(60_000) }); }
    catch (e) { err = e.message; }
    state.fetched++;
    if (res?.status === 429) {
      const wait = Number(res.headers.get('retry-after')) || 60;
      if (waited || wait > 150) throw new Stop(`Find a Tender answered 429 (Retry-After ${wait}s)`);
      waited = true; console.log(`  429: waiting ${wait}s once`); await sleep(wait * 1000); continue;
    }
    if (res?.status === 404) { await sleep(PAUSE_MS); return null; }
    if (res?.ok) { const j = await res.json(); await sleep(PAUSE_MS); return j?.releases?.[0] ?? null; }
    const why = err || `HTTP ${res.status}`;
    if (!retried) { retried = true; console.log(`  ${why}: retrying once in 30s`); await sleep(30_000); continue; }
    throw new Stop(`${why} on ${id}`);
  }
}

async function store(release) {
  const lots = lotRows(release);
  const awards = (release.awards || []).map((a) => ({ id: a.id != null ? String(a.id) : null, lots: lotIdsOf(a) })).filter((a) => a.id && a.lots);
  if (!WRITE) return { lots: lots.length, labelled: awards.length };
  if (lots.length) {
    const { data: stored, error } = await db.from('contract_lots').select('ocid, lot_id, released_at, title, description, value, currency').eq('ocid', release.ocid);
    if (error) throw new Stop(`contract_lots read: ${error.message}`);
    const write = newerLotRows(lots, stored ?? []);
    if (write.length) { const { error: e } = await db.from('contract_lots').upsert(write, { onConflict: 'ocid,lot_id' }); if (e) throw new Stop(`contract_lots upsert: ${e.message}`); }
    state.lotsWritten += write.length;
  }
  let labelled = 0;
  for (const a of awards) {
    const { data, error } = await db.from('contract_notices').update({ lot_ids: a.lots }).eq('ocid', release.ocid).eq('award_id', a.id).is('lot_ids', null).select('id');
    if (error) throw new Stop(`contract_notices update: ${error.message}`);
    labelled += data?.length ?? 0;
  }
  state.noticeRowsLabelled += labelled;
  return { lots: lots.length, labelled };
}

const t0 = Date.now(), fetched0 = state.fetched, done0 = state.done;
let stopReason = null;
state.nights++;
try {
  for (;;) {
    if (state.done >= state.queue.length) {
      if (state.pass === 2) { stopReason = 'finished'; break; }
      // Pass 2: stored award releases of these procurements whose award still has no lots.
      if (!WRITE) { stopReason = 'pass 1 finished (dry run: pass 2 needs the writes)'; break; }
      state.queue = psqlJson(`with m as (select ocid from contract_notices where award_id is not null group by ocid having count(distinct award_id) > 1)
        select coalesce(json_agg(json_build_object('ocid', ocid, 'release', release_id)), '[]') from (
          select distinct n.ocid, n.release_id from m join contract_notices n using (ocid)
          where n.award_id is not null and n.lot_ids is null) x`).filter((x) => !seen.has(x.release));
      state.pass1 = [...seen]; state.pass = 2; state.done = 0; save();
      report(`T1-LOT backfill: pass 1 done; pass 2 has ${state.queue.length} releases whose award has no lots yet`);
      continue;
    }
    if (!ANY_TIME && !inNight()) { stopReason = 'night window over (05:00 UK)'; break; }
    if (!ANY_TIME && inSyncWindow()) { console.log('  sitting out the contracts sync (01:40 to 02:10 UK)'); await sleep(60_000); continue; }
    if (state.fetched - fetched0 >= LIMIT) { stopReason = `--limit ${LIMIT} reached`; break; }
    const item = state.queue[state.done];
    if (state.pass === 1) seen.add(item.release);
    const rel = await getRelease(item.release);
    if (!rel) state.notFound++;
    else { const r = await store(rel); if (!WRITE) console.log(`  ${item.ocid} ${item.release}: ${r.lots} lots, ${r.labelled} awards with lots`); }
    state.done++;
    if (state.done % 20 === 0) save();
  }
} catch (e) {
  if (!(e instanceof Stop)) throw e;
  stopReason = e.message;
} finally {
  save();
}
const mins = Math.round((Date.now() - t0) / 60000);
report(`T1-LOT backfill ${WRITE ? '' : '(dry run) '}night ${state.nights}: pass ${state.pass}, ${state.done} of ${state.queue.length} done (${state.done - (state.pass === 1 ? done0 : 0)} tonight), ${state.fetched - fetched0} fetches in ${mins} min; totals: ${state.lotsWritten} lots stored, ${state.noticeRowsLabelled} notice rows given their lots, ${state.notFound} releases not found; stopped: ${stopReason}`);
