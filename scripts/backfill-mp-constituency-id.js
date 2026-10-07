#!/usr/bin/env node
// One-time backfill of mps.constituency_id for current MPs who don't have
// it yet. Confirmed via reading app/api/sync-mp-roster/route.ts directly:
// its ADD/REACTIVATE loop only calls buildRecord() (which sets
// constituency_id) for an MP NOT already flagged current in the database
// (`if (dbCurrent.has(id)) continue;`) — so the 645 MPs who were already
// current before this column was introduced have never had it populated.
// This script is narrowly scoped: it reads constituency_id (membershipFromId)
// from the Members API and writes ONLY that one column — no party, name,
// or other roster fields are touched, to avoid any risk of this backfill
// accidentally overwriting something sync-mp-roster/sync-mp-parties
// already maintains correctly.
//
// INTEGRITY CHECK: the API's own membershipFrom (constituency name) is
// compared, normalised, against mps.constituency before writing. Any
// mismatch is reported and skipped, not written.
//
// Run without --live to preview. Pass --live to write to mps
// (constituency_id only, for current MPs where it's currently null).

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MEMBER = 'https://members-api.parliament.uk/api/Members';
const UA = 'PeoplesChamber-ConstituencyIdBackfill/1.0';
const CONCURRENCY = 5;
const LIVE = process.argv.includes('--live');

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function fetchMembershipFrom(memberId) {
  const res = await fetch(`${MEMBER}/${memberId}`, { headers: { 'User-Agent': UA, accept: 'application/json' } });
  if (!res.ok) { const err = new Error(`Members/${memberId} failed (${res.status})`); err.status = res.status; throw err; }
  const v = (await res.json())?.value;
  const hm = v?.latestHouseMembership || {};
  return { membershipFrom: hm.membershipFrom || null, membershipFromId: hm.membershipFromId ?? null };
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  const { data: mps, error } = await supabase
    .from('mps')
    .select('member_id, display_name, constituency, constituency_id')
    .eq('current_member', true)
    .is('constituency_id', null);
  if (error) { console.error('Failed to read mps:', error.message); process.exit(1); }

  console.log(`Current MPs missing constituency_id: ${(mps || []).length}`);
  if (!mps || mps.length === 0) { console.log('Nothing to backfill.'); return; }

  let fetched = 0;
  const results = await mapWithConcurrency(mps, CONCURRENCY, async (mp) => {
    try {
      const r = await fetchMembershipFrom(mp.member_id);
      fetched++;
      if (fetched % 100 === 0) console.log(`  ...${fetched}/${mps.length}`);
      return { mp, api: r, error: null };
    } catch (err) {
      return { mp, api: null, error: err.message };
    }
  });

  const errors = results.filter((r) => r.error);
  const noId = results.filter((r) => !r.error && (!r.api || r.api.membershipFromId == null));
  const mismatches = results.filter((r) => r.api && r.api.membershipFromId != null && norm(r.api.membershipFrom) !== norm(r.mp.constituency));
  const good = results.filter((r) => r.api && r.api.membershipFromId != null && norm(r.api.membershipFrom) === norm(r.mp.constituency));

  console.log(`\nGood (constituency name matches): ${good.length}`);
  console.log(`API errors: ${errors.length}`);
  if (errors.length > 0) errors.forEach((r) => console.log(`  ${r.mp.display_name} (${r.mp.constituency}): ${r.error}`));
  console.log(`No membershipFromId returned: ${noId.length}`);
  if (noId.length > 0) noId.forEach((r) => console.log(`  ${r.mp.display_name} (${r.mp.constituency})`));
  console.log(`Constituency name MISMATCHES (skipped): ${mismatches.length}`);
  if (mismatches.length > 0) mismatches.forEach((r) => console.log(`  mps.constituency="${r.mp.constituency}" vs API membershipFrom="${r.api.membershipFrom}"`));

  console.log('\nSample of 5 to be written:');
  good.slice(0, 5).forEach((r) => console.log(`  ${r.mp.display_name}: constituency_id ${r.api.membershipFromId} (${r.api.membershipFrom})`));

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  console.log(`\nWriting constituency_id for ${good.length} MPs...`);
  let written = 0;
  for (const r of good) {
    const { error: upErr } = await supabase
      .from('mps')
      .update({ constituency_id: r.api.membershipFromId })
      .eq('member_id', r.mp.member_id);
    if (upErr) { console.error(`Failed to update ${r.mp.display_name}:`, upErr.message); continue; }
    written++;
  }
  console.log(`\nDone. ${written}/${good.length} MPs updated.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
