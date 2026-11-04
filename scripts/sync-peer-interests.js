#!/usr/bin/env node
// The House of Lords register of interests, into peer_registered_interests (migration 2026-11-04b; owner's go, 4 Nov
// 2026), from Parliament's Members API /api/Members/{id}/RegisteredInterests, for every peer in the peers table, current
// and former. Modelled on scripts/sync-registered-interests.js. For each peer:
//   - an entry that is new or whose content changed is saved in full; first_seen_date is never written, so it stays the
//     day the entry was first seen
//   - an unchanged entry only has last_seen_date moved to today
//   - an entry no longer on the register is kept and set is_current = false, after an empty answer has been asked again
//
// Order: the peers checked longest ago go first, and peers never checked before them, so a run that stops part way still
// rotates through everyone over the following nights. Entries cannot show this, as a peer with an empty register has none,
// so each peer's last successful check is kept in sync_cursor (route 'peer-interests-checked', cursor {"checked": {id:
// day}}). A peer not listed there falls back to the newest last_seen_date of their entries.
//
// Polite: one request at a time, half a second apart. HTTP 429 or 403 stops the whole run at once, with no retry past it
// and no attempt to get round it; run it again later. A server error or network failure is tried twice more for that peer
// only. More than 5% of peers failing stops the run.
// Resumable: --write records each finished peer in the state file (kept 7 days, removed when a run finishes), so running
// it again carries on from where it stopped. --fresh ignores the file.
//
// DRY RUN BY DEFAULT: reads everything and prints counts only (ids and numbers, never the text of an entry). It writes
// nothing to the database. --out=<file> saves the rows it would write to a JSON file, for a local page check.
//
// Usage:
//   node scripts/sync-peer-interests.js --ids=100,5486          # dry run on these peers
//   node scripts/sync-peer-interests.js --limit=5               # dry run on the first 5
//   node scripts/sync-peer-interests.js                         # dry run on every peer
//   node scripts/sync-peer-interests.js --write                 # save

/* eslint-disable @typescript-eslint/no-require-imports -- run directly by Node, as the other sync scripts are */
'use strict';
require('dotenv').config({ path: '.env.local', quiet: true });
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const opt = (name) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const WRITE = process.argv.includes('--write');
const FRESH = process.argv.includes('--fresh');
const IDS = opt('ids') ? opt('ids').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0) : null;
const LIMIT = opt('limit') ? Number(opt('limit')) : null;
const OUT = opt('out');
const STATE = opt('state') || path.join(os.homedir(), 'opengovt-backup', 'peer-interests-progress.json');
const STATE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const API = 'https://members-api.parliament.uk/api/Members';
const UA = 'opengovt-RegisterSync/1.0 (+https://opengovt.uk)';
const GAP_MS = 500;
const RETRY_WAITS_MS = [2000, 5000];
const TABLE = 'peer_registered_interests';
const CHECKED_ROUTE = 'peer-interests-checked';
const CHECKED_SAVE_EVERY = 25;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Date().toISOString().slice(0, 10);

class StopRun extends Error {}

async function getRegister(memberId) {
  const url = `${API}/${memberId}/RegisteredInterests`;
  let lastError = '';
  for (let attempt = 0; attempt <= RETRY_WAITS_MS.length; attempt++) {
    if (attempt) await sleep(RETRY_WAITS_MS[attempt - 1]);
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
    } catch (e) {
      lastError = `request failed: ${e.message}`;
      continue;
    }
    if (res.status === 429 || res.status === 403) {
      const after = res.headers.get('retry-after');
      throw new StopRun(`HTTP ${res.status} at peer ${memberId}${after ? ` (Retry-After: ${after})` : ''}`);
    }
    if (res.status === 404) return []; // no member record, so no register
    if (res.status >= 500) { lastError = `HTTP ${res.status}`; continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json && json.value)) throw new Error('the answer has no value list');
    return json.value;
  }
  throw new Error(`${lastError} after ${RETRY_WAITS_MS.length + 1} tries`);
}

// The API repeats a category for each of its entries, so entries are keyed by their own id.
function flatten(memberId, categories) {
  const rows = new Map();
  for (const cat of categories) {
    for (const it of cat.interests || []) {
      if (it.deletedWhen || rows.has(it.id)) continue;
      rows.set(it.id, {
        member_id: memberId,
        category_id: cat.id,
        category_name: cat.name,
        category_sort_order: cat.sortOrder ?? null,
        interest_id: it.id,
        interest_text: String(it.interest ?? '').trim(),
        child_interests: (it.childInterests || []).filter((c) => !c.deletedWhen).map((c) => ({
          id: c.id,
          interest: String(c.interest ?? '').trim(),
          createdWhen: c.createdWhen ?? null,
          lastAmendedWhen: c.lastAmendedWhen ?? null,
          isCorrection: Boolean(c.isCorrection),
          childInterests: c.childInterests || [],
        })),
        created_when: it.createdWhen ?? null,
        last_amended_when: it.lastAmendedWhen ?? null,
        is_correction: Boolean(it.isCorrection),
        is_current: true,
        last_seen_date: today,
        source: 'members-api',
      });
    }
  }
  return [...rows.values()];
}

// Compared on everything the sync writes except the last_seen_date stamp.
const COMPARED = ['category_id', 'category_name', 'category_sort_order', 'interest_text', 'child_interests', 'created_when', 'last_amended_when', 'is_correction', 'is_current', 'source'];
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] != null).map((k) => [k, canon(v[k])])) : v ?? null);
const asInstant = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) ? new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(v) ? v : `${v}Z`).toISOString() : v);
const sameRow = (stored, row) => COMPARED.every((k) => JSON.stringify(canon(asInstant(stored[k]))) === JSON.stringify(canon(asInstant(row[k]))));

async function pageAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function storedRows(memberId, tableExists) {
  if (!tableExists) return [];
  return pageAll(() => db.from(TABLE).select(`interest_id, last_seen_date, ${COMPARED.join(', ')}`).eq('member_id', memberId).order('interest_id'));
}

async function saveRows(memberId, changed, restamp, ended) {
  if (changed.length) {
    const { error } = await db.from(TABLE).upsert(changed, { onConflict: 'member_id,interest_id' });
    if (error) throw new Error(`upsert: ${error.message}`);
  }
  for (const [ids, values, label] of [[restamp, { last_seen_date: today }, 'restamp'], [ended, { is_current: false }, 'mark ended']]) {
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await db.from(TABLE).update(values).eq('member_id', memberId).in('interest_id', ids.slice(i, i + 500));
      if (error) throw new Error(`${label}: ${error.message}`);
    }
  }
}

async function loadChecked() {
  const { data, error } = await db.from('sync_cursor').select('cursor').eq('route', CHECKED_ROUTE).maybeSingle();
  if (error) throw new Error(`sync_cursor read: ${error.message}`);
  return (data && data.cursor && data.cursor.checked) || {};
}
// A failed save only means some peers are checked again sooner, so it warns and carries on.
async function saveChecked(checked) {
  if (!WRITE) return;
  const { error } = await db.from('sync_cursor').upsert({ route: CHECKED_ROUTE, cursor: { checked }, updated_at: new Date().toISOString() }, { onConflict: 'route' });
  if (error) console.error(`could not save the last checked days: ${error.message}`);
}
// Each peer's last check: '' for never, so those sort first; ties by member id.
async function oldestFirst(peers, checked, tableExists) {
  const seen = new Map();
  if (tableExists) {
    const rows = await pageAll(() => db.from(TABLE).select('member_id, last_seen_date').order('id'));
    for (const r of rows) if (!seen.has(r.member_id) || r.last_seen_date > seen.get(r.member_id)) seen.set(r.member_id, r.last_seen_date);
  }
  const lastCheck = (id) => checked[id] || seen.get(id) || '';
  const sorted = [...peers].sort((a, b) => lastCheck(a.member_id).localeCompare(lastCheck(b.member_id)) || a.member_id - b.member_id);
  const never = sorted.filter((p) => !lastCheck(p.member_id)).length;
  const dated = sorted.find((p) => lastCheck(p.member_id));
  return { sorted, never, oldest: dated ? lastCheck(dated.member_id) : null };
}

function loadState() {
  if (!WRITE || FRESH) return new Set();
  try {
    if (Date.now() - fs.statSync(STATE).mtimeMs > STATE_MAX_AGE_MS) return new Set();
    return new Set(JSON.parse(fs.readFileSync(STATE, 'utf8')).done);
  } catch {
    return new Set();
  }
}
function saveState(done) {
  if (!WRITE) return;
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify({ done: [...done] }));
}

(async () => {
  const probe = await db.from(TABLE).select('id').limit(1);
  const tableExists = !probe.error;
  if (!tableExists && WRITE) throw new Error(`${TABLE} cannot be read (${probe.error.message}); apply the migration first`);

  let peers = await pageAll(() => db.from('peers').select('member_id, is_current').order('member_id'));
  if (IDS) peers = IDS.map((id) => peers.find((p) => p.member_id === id)).filter(Boolean);
  const checked = await loadChecked();
  const order = await oldestFirst(peers, checked, tableExists);
  peers = order.sorted;
  if (LIMIT) peers = peers.slice(0, LIMIT);
  const done = loadState();
  const left = peers.filter((p) => !done.has(p.member_id));
  console.log(`${WRITE ? 'WRITE' : 'DRY RUN, nothing is written'}. peers: ${peers.length}; already done in an earlier run: ${peers.length - left.length}; table ${TABLE}: ${tableExists ? 'exists' : 'not created yet, so every entry counts as new'}`);
  console.log(`order: ${order.never} never checked go first, then the oldest check first${order.oldest ? ` (oldest ${order.oldest})` : ''}`);

  const totals = { read: 0, withEntries: 0, entries: 0, children: 0, added: 0, changed: 0, unchanged: 0, ended: 0, failed: 0 };
  const failures = [];
  const dump = [];
  let stopped = null;
  for (const p of left) {
    const id = p.member_id;
    try {
      let rows = flatten(id, await getRegister(id));
      const stored = await storedRows(id, tableExists);
      const live = stored.filter((s) => s.is_current);
      if (!rows.length && live.length) {
        // An empty answer is asked again once before it is believed, so a passing fault cannot end a register.
        await sleep(GAP_MS);
        rows = flatten(id, await getRegister(id));
      }
      const byId = new Map(stored.map((s) => [s.interest_id, s]));
      const onRegister = new Set(rows.map((r) => r.interest_id));
      const added = rows.filter((r) => !byId.has(r.interest_id));
      const changed = rows.filter((r) => byId.has(r.interest_id) && !sameRow(byId.get(r.interest_id), r));
      const restamp = rows.filter((r) => byId.has(r.interest_id) && sameRow(byId.get(r.interest_id), r) && byId.get(r.interest_id).last_seen_date !== today).map((r) => r.interest_id);
      const ended = live.filter((s) => !onRegister.has(s.interest_id)).map((s) => s.interest_id);
      const children = rows.reduce((n, r) => n + r.child_interests.length, 0);
      const categories = new Set(rows.map((r) => r.category_id)).size;
      console.log(`peer ${id} (${p.is_current ? 'current' : 'former'}): ${categories} categories, ${rows.length} entries, ${children} child items; new ${added.length}, changed ${changed.length}, unchanged ${rows.length - added.length - changed.length}, ended ${ended.length}`);
      if (WRITE) await saveRows(id, [...added, ...changed], restamp, ended);
      if (OUT) dump.push(...rows);
      totals.read++; totals.entries += rows.length; totals.children += children; totals.added += added.length; totals.changed += changed.length;
      totals.unchanged += rows.length - added.length - changed.length; totals.ended += ended.length;
      if (rows.length) totals.withEntries++;
      done.add(id);
      saveState(done);
      checked[id] = today;
      if (totals.read % CHECKED_SAVE_EVERY === 0) await saveChecked(checked);
    } catch (e) {
      if (e instanceof StopRun) { stopped = e.message; break; }
      totals.failed++;
      if (failures.length < 20) failures.push(`${id}: ${e.message}`);
      if (totals.failed > Math.max(5, peers.length * 0.05)) { stopped = `${totals.failed} peers failed`; break; }
    }
    await sleep(GAP_MS);
  }

  await saveChecked(checked);
  console.log(`peers read: ${totals.read}, with entries: ${totals.withEntries}, failed: ${totals.failed}${failures.length ? `\n  ${failures.join('\n  ')}` : ''}`);
  console.log(`rows: ${totals.entries} entries on the register, ${totals.children} child items inside them`);
  console.log(`rows ${WRITE ? '' : 'that would be '}inserted ${totals.added}, updated ${totals.changed}, left unchanged ${totals.unchanged}, set not current ${totals.ended}`);
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(dump)); console.log(`${dump.length} rows saved to the --out file`); }
  if (stopped) {
    console.error(`STOPPED: ${stopped}. ${done.size} of ${peers.length} peers done${WRITE ? '; run it again later and it carries on from here' : ''}.`);
    process.exit(2);
  }
  if (WRITE && !totals.failed) fs.rmSync(STATE, { force: true });
  console.log(WRITE ? 'WRITE complete.' : 'DRY RUN complete. Nothing was written.');
  if (totals.failed) process.exit(1);
})().catch((e) => { console.error(`FAILED: ${e.message}`); process.exit(1); });
