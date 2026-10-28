#!/usr/bin/env node
// Fills mp_division_votes.party (each MP's party on the day of the vote) and recomputes
// is_rebellion for every Commons division, from the Commons Votes API division detail.
// See scripts/migrations/2026-10-15c-division-parties-rebellions.sql for the rule.
//
// Works through commons_division_totals rows not yet done (parties_applied_at is null), one
// API request per division, paced gently (about 2,400 divisions, roughly 20 minutes).
// Safe to stop and re-run: it carries on where it left off.
//
// DRY RUN BY DEFAULT: reads the first 20 divisions from the API and reports how many of our
// vote rows would get a party, writing nothing. Pass --write to save everything, then it
// refreshes the party whip figures and the MP activity figures.
//
// Usage:
//   node scripts/backfill-division-parties.js
//   node scripts/backfill-division-parties.js --write

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const API = 'https://commonsvotes-api.parliament.uk/data';
const DRY_SAMPLE = 20;
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function todo() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('commons_division_totals').select('division_id, division_date, division_number')
      .is('parties_applied_at', null).order('division_id').range(from, from + 999);
    if (error) throw new Error(`commons_division_totals: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function detail(id) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${API}/division/${id}.json`);
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await sleep(2000 * attempt);
  }
  throw new Error(`division ${id}: API kept failing`);
}

function members(det) {
  const map = new Map();
  for (const list of [det.Ayes, det.Noes, det.AyeTellers, det.NoTellers]) {
    for (const m of list || []) if (m && m.MemberId && m.Party) map.set(m.MemberId, String(m.Party).trim());
  }
  return [...map].map(([member_id, party]) => ({ member_id, party }));
}

(async () => {
  const list = await todo();
  console.log(`divisions still to do: ${list.length}`);
  if (!list.length) { console.log('Nothing to do.'); }

  if (!WRITE) {
    let rows = 0, matched = 0;
    const parties = {};
    for (const d of list.slice(0, DRY_SAMPLE)) {
      const det = await detail(d.division_id);
      if (!det) { console.log(`  ${d.division_id}: not in the API`); continue; }
      const ms = members(det);
      const byId = new Map(ms.map((m) => [m.member_id, m.party]));
      const { data, error } = await db.from('mp_division_votes').select('member_id').eq('division_id', d.division_id);
      if (error) throw new Error(error.message);
      const hit = data.filter((r) => byId.has(r.member_id)).length;
      rows += data.length; matched += hit;
      for (const m of ms) parties[m.party] = (parties[m.party] || 0) + 1;
      console.log(`  ${d.division_date} #${d.division_number} (id ${d.division_id}): ${data.length} vote rows, ${hit} would get a party`);
      await sleep(250);
    }
    console.log(`sample: ${matched} of ${rows} vote rows would get a party`);
    console.log(`party names seen in the sample: ${JSON.stringify(parties)}`);
    console.log('DRY RUN complete. Nothing was written.');
    return;
  }

  let done = 0, missing = 0, rowsWithoutParty = 0, rebellions = 0;
  const startedAt = Date.now();
  for (const d of list) {
    const det = await detail(d.division_id);
    if (!det) { missing++; console.log(`  ${d.division_id}: not in the API, skipped`); continue; }
    const { data, error } = await db.rpc('apply_division_parties', { p_division_id: d.division_id, p_members: members(det) });
    if (error) throw new Error(`apply_division_parties ${d.division_id}: ${error.message}`);
    rowsWithoutParty += data.rows - data.rows_with_party;
    rebellions += data.rebellions;
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${list.length} done (${Math.round((Date.now() - startedAt) / 1000)}s)`);
    await sleep(250);
  }
  console.log(`divisions done: ${done}; not in the API: ${missing}; vote rows left without a party: ${rowsWithoutParty}; votes against the party flagged: ${rebellions}`);

  const { data: w, error: we } = await db.rpc('refresh_whip_views');
  if (we) throw new Error(`refresh_whip_views: ${we.message}`);
  console.log(`whip figures refreshed: ${JSON.stringify(w)}`);
  const { data: a, error: ae } = await db.rpc('recompute_mp_activity_metrics');
  if (ae) throw new Error(`recompute_mp_activity_metrics: ${ae.message}`);
  console.log(`MP activity figures: ${JSON.stringify(a)}`);
  console.log('WRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
