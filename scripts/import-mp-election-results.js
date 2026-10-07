#!/usr/bin/env node
// Import each current MP's latest general election majority/result from
// the UK Parliament Members API, for the welfare explorer's constituency
// results card (matches TPA's own "majority N" line, sourced from the
// same API family — see the 2026-10-07d migration's comments).
//
// SOURCE: GET /api/Location/Constituency/{constituency_id}/ElectionResults
// where constituency_id = mps.constituency_id (already populated from the
// Members API's own membershipFromId by sync-mp-roster). Confirmed via a
// live test query (Manchester Central, id 4167) that value[0] carries a
// top-level `majority`, `result`, `winningParty`, `electionTitle` and
// `electionDate` directly — no candidate-level data needed.
//
// INTEGRITY CHECK
// ───────────────
// Before writing, the API response's own constituencyName is compared
// (case-insensitive, normalised) against mps.constituency for that row.
// Any mismatch is reported and that MP is skipped rather than written —
// guards against a stale/wrong constituency_id silently attaching the
// wrong majority to the wrong MP.
//
// SCOPE: only MPs with current_member = true AND a non-null
// constituency_id. A handful of current MPs may have no constituency_id
// (e.g. very recent by-election winners not yet backfilled by
// sync-mp-roster) — these are listed and skipped, not guessed at.
//
// Run without --live to preview. Pass --live to write to mps
// (latest_election_majority, latest_election_result,
// latest_election_title, latest_election_date).

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MEMBERS_API = 'https://members-api.parliament.uk/api';
const UA = 'PeoplesChamber-ElectionResultsSync/1.0';
const CONCURRENCY = 5;
const LIVE = process.argv.includes('--live');

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function fetchElectionResult(constituencyId) {
  const res = await fetch(`${MEMBERS_API}/Location/Constituency/${constituencyId}/ElectionResults`, {
    headers: { 'User-Agent': UA, accept: 'application/json' },
  });
  if (!res.ok) {
    const err = new Error(`ElectionResults ${constituencyId} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const first = json?.value?.[0];
  if (!first) return null;
  return {
    constituencyName: first.constituencyName || null,
    majority: typeof first.majority === 'number' ? first.majority : null,
    result: first.result || null,
    electionTitle: first.electionTitle || null,
    electionDate: first.electionDate ? first.electionDate.slice(0, 10) : null,
  };
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
    .select('member_id, display_name, constituency, constituency_id, current_member')
    .eq('current_member', true);
  if (error) { console.error('Failed to read mps:', error.message); process.exit(1); }

  const withId = (mps || []).filter((m) => m.constituency_id != null);
  const withoutId = (mps || []).filter((m) => m.constituency_id == null);
  console.log(`Current MPs: ${mps.length}. With constituency_id: ${withId.length}. Without (skipped): ${withoutId.length}.`);
  if (withoutId.length > 0) {
    console.log('MPs skipped (no constituency_id):');
    withoutId.forEach((m) => console.log(`  ${m.display_name} — ${m.constituency}`));
  }

  console.log(`\nFetching election results for ${withId.length} MPs (concurrency ${CONCURRENCY})...`);
  let fetched = 0;
  const results = await mapWithConcurrency(withId, CONCURRENCY, async (mp) => {
    try {
      const result = await fetchElectionResult(mp.constituency_id);
      fetched++;
      if (fetched % 100 === 0) console.log(`  ...${fetched}/${withId.length}`);
      return { mp, result, error: null };
    } catch (err) {
      return { mp, result: null, error: err.message };
    }
  });

  const errors = results.filter((r) => r.error);
  const noResult = results.filter((r) => !r.error && !r.result);
  const mismatches = results.filter((r) => r.result && norm(r.result.constituencyName) !== norm(r.mp.constituency));
  const good = results.filter((r) => r.result && norm(r.result.constituencyName) === norm(r.mp.constituency));

  console.log(`\nFetched OK with matching constituency name: ${good.length}`);
  console.log(`API errors: ${errors.length}`);
  if (errors.length > 0 && errors.length <= 20) errors.forEach((r) => console.log(`  ${r.mp.display_name} (${r.mp.constituency}, id ${r.mp.constituency_id}): ${r.error}`));
  console.log(`No election result returned: ${noResult.length}`);
  if (noResult.length > 0 && noResult.length <= 20) noResult.forEach((r) => console.log(`  ${r.mp.display_name} (${r.mp.constituency}, id ${r.mp.constituency_id})`));
  console.log(`Constituency name MISMATCHES (skipped, not written): ${mismatches.length}`);
  if (mismatches.length > 0) mismatches.forEach((r) => console.log(`  mps.constituency="${r.mp.constituency}" vs API constituencyName="${r.result.constituencyName}" (id ${r.mp.constituency_id})`));

  console.log('\nSample of 5 results to be written:');
  good.slice(0, 5).forEach((r) => console.log(`  ${r.mp.display_name} (${r.mp.constituency}): majority ${r.result.majority}, ${r.result.result}, ${r.result.electionTitle}`));

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  console.log(`\nWriting ${good.length} rows to mps...`);
  let written = 0;
  for (const r of good) {
    const { error: upErr } = await supabase
      .from('mps')
      .update({
        latest_election_majority: r.result.majority,
        latest_election_result: r.result.result,
        latest_election_title: r.result.electionTitle,
        latest_election_date: r.result.electionDate,
      })
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
