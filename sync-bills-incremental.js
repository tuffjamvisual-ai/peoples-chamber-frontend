// Bills sync: keeps the `bill` table in step with Parliament's Bills API.
//
// Rewritten 15 Oct 2026. The old version wrote fields the Bills API list endpoint does not
// return (currentStage.stageName / stageDate, summary, longTitle, sponsors), so on every run
// it blanked current_stage, stage_date, long_title and sponsor_name, set description to
// "No description available", and mislabelled most Private Members' Bills as "Hybrid". Every
// one of the 4,059 bills had lost those fields, and new bills showed no stage or sponsor.
// It also saved every bill as starting in the House of Lords.
//
// Now, for each bill updated since the newest last_update we hold (or every bill with --all):
//   - which bills changed: the list sorted DateUpdatedDescending, read until the first bill last updated before
//     that time (21 Oct 2026). The Bills API has no "updated since" filter: its OpenAPI file lists none, and the
//     UpdatedSince this used to send was ignored, so every night read and rewrote all ~4,060 bills (up to 3h19m).
//     Bills are then saved oldest first, so a run that stops part way never leaves a newer bill saved ahead of an
//     older one it missed. A bill whose lastUpdate equals the one we hold is skipped.
//   - the list endpoint gives title, houses, isAct, isDefeated, billWithdrawn, lastUpdate,
//     session and the current stage's name (status)
//   - the bill's own endpoint (/Bills/{id}) gives longTitle, summary and the sponsors
//   - the bill type comes from /BillTypes (Public, Private or Hybrid)
//   - current_stage and stage_date are NOT written here: app/api/sync-bill-stages works them
//     out from the full stage list (past sittings only). A changed bill gets
//     stages_synced_at = null so that route refreshes it first on its next run.
//
// Never blanks a saved title, long title, type, House or sponsor (see PROTECTED below).
//
// DRY RUN BY DEFAULT: prints what it would change. Pass --write to save.
//
// Usage:
//   node sync-bills-incremental.js                 dry run, bills updated since our newest
//   node sync-bills-incremental.js --write         the nightly run (Daily Data Sync workflow)
//   node sync-bills-incremental.js --all --write   repair every bill
//   node sync-bills-incremental.js --bill=4004 --write   one bill (Parliament's bill id)

'use strict';
try { require('dotenv').config({ path: '.env.local' }); } catch { /* the workflow sets the env directly */ }
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const ALL = process.argv.includes('--all');
const ONE = Number((process.argv.find((a) => a.startsWith('--bill=')) || '').slice(7)) || null;
const API = 'https://bills-api.parliament.uk/api/v1';
const DELAY_MS = 200;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nwnsvnbudmfkhhwcjwwr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw new Error(`${url}: ${e.message}`);
      await sleep(1500 * attempt);
    }
  }
}

const house = (h) => {
  const t = String(h ?? '').toLowerCase();
  return t === 'commons' || t === '1' ? 'Commons' : t === 'lords' || t === '2' ? 'Lords' : null;
};

// The Bills API gives lastUpdate without a timezone (e.g. 2026-10-21T14:53:59.5056397); the database stores it as
// UTC, so it is read as UTC here too.
const apiTime = (s) => (s ? Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`) : NaN);

const clean = (s) => {
  const t = typeof s === 'string' ? s.trim() : '';
  return t ? t : null;
};

(async () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');

  const types = await getJson(`${API}/BillTypes`);
  const categoryByType = new Map((types.items || types).map((t) => [t.id, t.category]));
  if (!categoryByType.size) throw new Error('could not read bill types');

  let since = null;
  if (!ALL && !ONE) {
    const { data, error } = await supabase.from('bill').select('last_update').order('last_update', { ascending: false }).limit(1);
    if (error) throw new Error(`newest bill: ${error.message}`);
    const d = new Date(data && data[0] ? data[0].last_update : '2024-01-01');
    d.setHours(d.getHours() - 1);
    since = d.toISOString();
  }
  console.log(ONE ? `Bill ${ONE} only` : ALL ? 'Every bill in the Bills API' : `Bills updated since ${since}`);

  const list = [];
  // One bill (--bill=N): its own record carries every field the list gives.
  if (ONE) {
    const one = await getJson(`${API}/Bills/${ONE}`);
    if (!one) throw new Error(`bill ${ONE} not found in the Bills API`);
    list.push(one);
  }
  let pages = 0;
  for (let skip = 0; !ONE; skip += 20) {
    const page = await getJson(`${API}/Bills?Skip=${skip}&Take=20&SortOrder=DateUpdatedDescending`);
    pages++;
    const items = (page && page.items) || [];
    const fresh = since ? items.filter((b) => apiTime(b.lastUpdate) >= Date.parse(since)) : items;
    list.push(...fresh);
    if (items.length < 20 || fresh.length < items.length || (page.totalResults && skip + 20 >= page.totalResults)) break;
    await sleep(DELAY_MS);
  }
  if (!ONE) list.reverse();
  console.log(`bills to check: ${list.length} (${pages} list page${pages === 1 ? '' : 's'})`);

  // Fields that are never replaced with an empty value: if Parliament's answer is missing
  // one we already hold, the saved value is kept (and counted), so a changed or broken API
  // answer cannot blank them the way the old version of this script did.
  const PROTECTED = ['title', 'long_title', 'category', 'originating_house', 'sponsor_name', 'sponsor_party', 'sponsor_constituency'];
  const existing = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('bill').select(`id, parliament_id, last_update, ${PROTECTED.join(', ')}`).not('parliament_id', 'is', null).order('id').range(from, from + 999);
    if (error) throw new Error(`existing bills: ${error.message}`);
    for (const r of data) existing.set(r.parliament_id, r);
    if (data.length < 1000) break;
  }
  const keptFields = {};

  let updated = 0, added = 0, failed = 0, noSponsor = 0, unchanged = 0;
  const failures = [];
  const examples = [];
  for (const b of list) {
    const held = existing.get(b.billId);
    if (!ALL && !ONE && held && held.last_update && Date.parse(held.last_update) === apiTime(b.lastUpdate)) { unchanged++; continue; }
    try {
      const detail = (await getJson(`${API}/Bills/${b.billId}`)) || {};
      const lead = (detail.sponsors || []).slice().sort((x, y) => (x.sortOrder ?? 999) - (y.sortOrder ?? 999))[0];
      const member = lead && lead.member;
      if (!member) noSponsor++;
      const row = {
        parliament_id: b.billId,
        title: clean(b.shortTitle) || 'Untitled Bill',
        long_title: clean(detail.longTitle),
        description: clean(detail.summary),
        category: categoryByType.get(b.billTypeId) || null,
        status: clean(b.currentStage && b.currentStage.description),
        sponsor_name: member ? clean(member.name) : null,
        sponsor_party: member ? clean(member.party) : null,
        sponsor_constituency: member ? clean(member.memberFrom) : null,
        // The API gives the house as text ("Commons" / "Lords"); the old code compared it with
        // the number 1, so every bill was saved as starting in the Lords.
        originating_house: house(b.originatingHouse),
        is_defeated: Boolean(b.isDefeated),
        bill_withdrawn: b.billWithdrawn || null,
        is_act: Boolean(b.isAct),
        last_update: b.lastUpdate || new Date().toISOString(),
        introduced_session_id: b.introducedSessionId || null,
        stages_synced_at: null,
      };
      if (examples.length < 5) examples.push(`${row.title} | ${row.category} | ${row.status} | sponsor ${row.sponsor_name || '-'} | long title ${row.long_title ? 'yes' : 'no'}`);

      const old = existing.get(b.billId);
      const id = old && old.id;
      if (old) {
        for (const f of PROTECTED) {
          const blankNew = row[f] == null || (f === 'title' && row[f] === 'Untitled Bill');
          if (blankNew && old[f] != null && old[f] !== '' && old[f] !== 'Untitled Bill') {
            delete row[f];
            keptFields[f] = (keptFields[f] || 0) + 1;
          }
        }
      }
      if (WRITE) {
        const { error } = id
          ? await supabase.from('bill').update(row).eq('id', id)
          : await supabase.from('bill').insert(row);
        if (error) throw new Error(error.message);
      }
      if (id) updated++; else added++;
    } catch (e) {
      failed++;
      if (failures.length < 15) failures.push(`${b.billId}: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`examples:\n  ${examples.join('\n  ')}`);
  console.log(`${WRITE ? '' : 'would be '}updated: ${updated}; ${WRITE ? '' : 'would be '}added: ${added}; unchanged (skipped): ${unchanged}; failed: ${failed}; no member sponsor (e.g. private bills): ${noSponsor}`);
  const kept = Object.entries(keptFields);
  console.log(`saved values kept because Parliament's answer was empty: ${kept.length ? kept.map(([f, n]) => `${f} ${n}`).join(', ') : 'none'}`);
  if (failures.length) console.log(`failures:\n  ${failures.join('\n  ')}`);
  // Any failed bill fails the run, so the workflow shows it (the bills that worked are saved).
  if (failed) { console.error(`FAILED: ${failed} of ${list.length} bills could not be ${WRITE ? 'saved' : 'read'}`); process.exit(1); }
  console.log(WRITE ? 'WRITE complete.' : 'DRY RUN complete. Nothing was written.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
