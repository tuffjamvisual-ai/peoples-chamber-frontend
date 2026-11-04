#!/usr/bin/env node
// Staff register (owner, 4 Nov 2026): the only writer of mp_staff_interests. Every edition of the Commons register of
// interests of MPs' staff not yet read, from Parliament's interests API v2 (Open Parliament Licence v3.0): the CSV of
// an edition (lib/staff-interests.js) gives what the MP pages list, and /Interests?RegisterId=N adds the anonymous staff
// identifier and the published date. One row per entry and per MP the staff member works for. No staff name and no
// summary text is stored: the API's name and summary fields never reach a row.
//
// A row keeps the newest content it has been seen with, first_seen_date (the earliest edition holding it) and
// last_seen_date (the latest). A row missing from the newest edition is marked is_current = false, never deleted, so
// the MP pages stop listing it and the history stays. Nothing is written until every edition has been read, and an
// edition far smaller than the last known is treated as a broken file (MIN_ROWS).
//
// Polite: one request at a time, half a second apart. HTTP 429 or 403 stops the whole run at once, with no retry past it.
// Resumable: --write records each page read in a state file (kept 7 days), so running it again carries on from there;
// --fresh ignores the file. The newest edition read is kept in sync_cursor, so with no new edition a run is one request.
//
// DRY RUN BY DEFAULT: writes nothing and prints counts only, never the text of an entry.
//   node scripts/sync-staff-register.js --register=824      counts for one edition
//   node scripts/sync-staff-register.js                     what a --write would change
//   node scripts/sync-staff-register.js --write             saves, and queues the changed MPs' pages for a refresh

/* eslint-disable @typescript-eslint/no-require-imports -- run directly by Node, as the other sync scripts are */
'use strict';
require('dotenv').config({ path: '.env.local', quiet: true });
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { COLS, CMP_COLS, MIN_ROWS, CURSOR_ROUTE, csvUrl, buildRows } = require('../lib/staff-interests');
const { queueMpRefresh } = require('./mp-refresh-queue');

const opt = (name) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const WRITE = process.argv.includes('--write');
const FRESH = process.argv.includes('--fresh');
const ONE = opt('register') ? Number(opt('register')) : null;
const STATE = path.join(os.homedir(), 'opengovt-backup', 'staff-register-progress.json');
const STATE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const API = 'https://interests-api.parliament.uk/api/v2';
const UA = 'opengovt-StaffRegisterSync/1.0 (+https://opengovt.uk)';
const GAP_MS = 500;
const PAGE = 20;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class Stop extends Error {}

async function request(url) {
  await sleep(GAP_MS);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status === 429 || res.status === 403) throw new Stop(`HTTP ${res.status}: stopped, run it again later`);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res;
}

// The anonymous identifier and published date of each entry and MP, only those fields.
function identifiersOf(item) {
  const staff = item.registrant?.memberStaffDetail;
  if (!staff) return [];
  const versions = item.versions || [];
  const published = (versions[versions.length - 1]?.publishedDate || '').slice(0, 10) || null;
  return (staff.employment || []).filter((e) => Number.isInteger(e.member?.id))
    .map((e) => ({ key: `${item.id}|${e.member.id}`, staff_identifier: staff.identifier ?? null, published_date: published }));
}

const loadState = () => {
  if (!WRITE || FRESH || !fs.existsSync(STATE) || Date.now() - fs.statSync(STATE).mtimeMs > STATE_MAX_AGE_MS) return {};
  return JSON.parse(fs.readFileSync(STATE, 'utf8'));
};
const saveState = (state) => {
  if (!WRITE) return;
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state));
};

// One edition: the CSV rows with the identifier and published date added. entries counts what the API lists.
async function readEdition(register, state) {
  const saved = (state[register.id] ??= { skip: 0, ids: [], entries: 0, total: null });
  while (saved.total === null || saved.skip < saved.total) {
    const j = await (await request(`${API}/Interests?RegisterId=${register.id}&Skip=${saved.skip}&Take=${PAGE}`)).json();
    saved.total = j.totalResults;
    const items = j.items || [];
    saved.ids.push(...items.flatMap(identifiersOf));
    saved.entries += items.length;
    saved.skip += PAGE;
    saveState(state);
    if (!items.length) break;
  }
  const zip = new Uint8Array(await (await request(csvUrl(register.id))).arrayBuffer());
  const built = buildRows(zip, register.id, register.publishedDate);
  const byKey = new Map(saved.ids.map((i) => [i.key, i]));
  const rows = built.rows.map((r) => {
    const i = byKey.get(`${r.interest_id}|${r.member_id}`);
    return { ...r, staff_identifier: i?.staff_identifier ?? null, published_date: i?.published_date ?? null };
  });
  const csvKeys = new Set(rows.map((r) => `${r.interest_id}|${r.member_id}`));
  const unmatched = { csv_without_identifier: rows.filter((r) => !r.staff_identifier).length, api_not_in_csv: [...byKey.keys()].filter((k) => !csvKeys.has(k)).length };
  return { rows, entries: saved.entries, unmatched, malformed: built.malformed, noMp: built.noMp };
}

function counts(e) {
  const per = {};
  for (const r of e.rows) per[r.category] = (per[r.category] || 0) + 1;
  return {
    entries: e.entries, rows: e.rows.length, distinct_staff: new Set(e.rows.map((r) => r.staff_identifier).filter(Boolean)).size,
    distinct_mps: new Set(e.rows.map((r) => r.member_id)).size, rows_per_category: per, ...e.unmatched,
    malformed_skipped: Object.values(e.malformed).reduce((a, b) => a + b, 0), no_mp_skipped: Object.values(e.noMp).reduce((a, b) => a + b, 0),
  };
}

async function readStored(db) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('mp_staff_interests')
      .select(['id', 'interest_id', 'member_id', ...COLS, 'staff_identifier', 'published_date', 'first_seen_date', 'last_seen_date', 'is_current'].join(', '))
      .order('id').range(from, from + 999);
    if (error) throw new Error(`mp_staff_interests read: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const same = (a, b) => CMP_COLS.every((c) => (a[c] ?? null) === (b[c] ?? null));

(async () => {
  const list = await (await request(`${API}/Registers?Type=CommonsStaff&Skip=0&Take=50`)).json();
  const registers = (list.items || []).filter((r) => r.type === 'CommonsStaff')
    .map((r) => ({ id: r.id, publishedDate: r.publishedDate.slice(0, 10) }))
    .sort((a, b) => a.publishedDate.localeCompare(b.publishedDate));
  if (!registers.length) throw new Error('no CommonsStaff register listed');
  const newest = registers[registers.length - 1];
  const state = loadState();

  if (ONE) {
    const register = registers.find((r) => r.id === ONE);
    if (!register) throw new Error(`no CommonsStaff register ${ONE}`);
    console.log(`register ${ONE} (${register.publishedDate}): ${JSON.stringify(counts(await readEdition(register, {})))}`);
    return;
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { data: cur, error: curErr } = await db.from('sync_cursor').select('cursor').eq('route', CURSOR_ROUTE).maybeSingle();
  if (curErr) throw new Error(`sync_cursor read: ${curErr.message}`);
  // history_through: the newest edition this script has read. Before its first run there is none, so it reads them all.
  const through = cur?.cursor?.history_through ?? null;
  const editions = registers.filter((r) => through === null || r.id > through);
  if (!editions.length) { console.log(`no new edition (newest ${newest.id}, ${newest.publishedDate})`); return; }

  const merged = new Map();
  const stored = new Map((await readStored(db)).map((r) => [`${r.interest_id}|${r.member_id}`, r]));
  let newestKeys = null;
  for (const register of editions) {
    const e = await readEdition(register, state);
    console.log(`register ${register.id} (${register.publishedDate}): ${JSON.stringify(counts(e))}`);
    if (register.id === newest.id) {
      if (e.rows.length < MIN_ROWS) throw new Error(`register ${register.id} looks incomplete: ${e.rows.length} rows (at least ${MIN_ROWS} expected)`);
      newestKeys = new Set(e.rows.map((r) => `${r.interest_id}|${r.member_id}`));
    }
    // Oldest first, so a row ends with the content of the newest edition that holds it.
    for (const r of e.rows) {
      const k = `${r.interest_id}|${r.member_id}`;
      merged.set(k, { ...r, first_seen_date: merged.get(k)?.first_seen_date ?? register.publishedDate, last_seen_date: register.publishedDate });
    }
  }

  const now = new Date().toISOString();
  const changedMps = new Set();
  const rows = [...merged.entries()].map(([k, r]) => {
    const old = stored.get(k);
    const first = old?.first_seen_date && old.first_seen_date < r.first_seen_date && through !== null ? old.first_seen_date : r.first_seen_date;
    const isCurrent = newestKeys.has(k);
    // The MP pages list these fields and count by identifier and is_current.
    if (!old || !same(old, r) || !old.staff_identifier || old.is_current !== isCurrent) changedMps.add(r.member_id);
    return { ...r, first_seen_date: first, is_current: isCurrent, updated_at: now };
  });
  const gone = [...stored.entries()].filter(([k, r]) => r.is_current && !newestKeys.has(k)).map(([, r]) => r);
  for (const r of gone) changedMps.add(Number(r.member_id));
  const plan = { rows_to_save: rows.length, new_rows: rows.filter((r) => !stored.has(`${r.interest_id}|${r.member_id}`)).length, current: rows.filter((r) => r.is_current).length, marked_not_current: gone.length, mps_changed: changedMps.size };
  console.log(JSON.stringify(plan));
  if (!WRITE) { console.log('dry run: nothing written'); return; }

  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from('mp_staff_interests').upsert(rows.slice(i, i + 200), { onConflict: 'interest_id,member_id' });
    if (error) throw new Error(`mp_staff_interests write: ${error.message}`);
  }
  for (let i = 0; i < gone.length; i += 200) {
    const { error } = await db.from('mp_staff_interests').update({ is_current: false, updated_at: now }).in('id', gone.slice(i, i + 200).map((r) => r.id));
    if (error) throw new Error(`mp_staff_interests is_current: ${error.message}`);
  }
  const { error: cErr } = await db.from('sync_cursor').upsert(
    { route: CURSOR_ROUTE, cursor: { register_id: newest.id, register_date: newest.publishedDate, history_through: newest.id, synced_at: now }, updated_at: now }, { onConflict: 'route' });
  if (cErr) throw new Error(`sync_cursor write: ${cErr.message}`);
  fs.rmSync(STATE, { force: true });
  console.log(await queueMpRefresh(db, [...changedMps]));
  console.log('saved');
})().catch((e) => { console.error(e.message); process.exit(e instanceof Stop ? 2 : 1); });
