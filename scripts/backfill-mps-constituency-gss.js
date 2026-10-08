#!/usr/bin/env node
// Backfills mps.constituency_gss_code — discovered via the welfare
// explorer build to be a column that exists on the mps table (added by
// an earlier migration) but has never actually been populated: every
// one of the 653 rows currently has constituency_gss_code = null,
// confirmed directly against the live database before writing this
// script. constituency (the text name) IS populated for every row.
//
// This blocks two things in the welfare explorer:
//   - /api/welfare/constituency/[gss]'s full-scope branch, which joins
//     mps by constituency_gss_code to get a display name/MP for the
//     page heading — currently gets nothing back.
//   - /api/welfare/search's ?county= branch, which (once its own
//     missing-column bug is fixed separately) will need the same join
//     to show constituency names for a county's constituency list.
//
// SOURCE
// ──────
// Same ONS "Ward to Westminster Parliamentary Constituency to LAD to
// CTYUA (May 2025) Lookup" CSV already used by
// backfill-welfare-constituency-geography.js — it carries PCON24CD
// *and* PCON24NM (the constituency name), even though that script only
// persists the GSS code. This script re-fetches the same CSV, collapses
// it to one row per distinct PCON24CD (dropping Northern Ireland codes,
// consistent with this project's GB-only scope), and matches each GSS
// code's name against mps.constituency using the same normalisation
// convention /api/find-mp already uses (lowercase, "&" -> "and", strip
// everything else non-alphanumeric) so formatting differences between
// the ONS name and the mps table's name don't block a match.
//
// Northern Ireland MPs are EXPECTED to end this script still unmatched
// (no GB GSS code exists for them) — this is correct, not a gap, and
// matches how welfare_constituency_geography itself excludes NI. Any
// OTHER unmatched row is reported in full for manual review rather than
// guessed at; nothing is written for a row this script isn't confident
// about.
//
// Run without --live to preview the match; pass --live to write
// constituency_gss_code onto the matched mps rows. Only ever UPDATEs
// existing rows by member_id — never deletes or inserts.

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { parse } = require('csv-parse/sync');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ONS_LOOKUP_CSV_URL =
  'https://open-geography-portalx-ons.hub.arcgis.com/api/download/v1/items/ac27c7721e664440adcc9e862505c8bc/csv?layers=0';
const UA = 'PeoplesChamber-MpsGssBackfill/1.0 (https://opengovt.uk; tuffjamvisual@gmail.com)';

const LIVE = process.argv.includes('--live');

// Same normalisation /api/find-mp/route.ts uses for its own fallback
// name match, reused here for consistency rather than inventing a
// second convention.
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

async function fetchOnsLookup() {
  const res = await fetch(ONS_LOOKUP_CSV_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`ONS lookup fetch failed: ${res.status}`);
  const csvText = await res.text();
  return parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will update mps.constituency_gss_code) ---' : '--- DRY RUN (pass --live to write) ---');

  console.log('\nFetching ONS ward-level lookup (same source as welfare_constituency_geography)...');
  const rows = await fetchOnsLookup();
  console.log(`  ${rows.length} ward-level rows loaded.`);

  // Collapse to one (normalised name -> gss code) entry per distinct
  // GB constituency. Flag any name that normalises to more than one
  // distinct GSS code rather than silently picking one.
  const nameToGss = new Map();
  const conflicts = new Map();
  let skippedNi = 0;
  for (const row of rows) {
    const pcon = row.PCON24CD;
    const pconName = row.PCON24NM;
    if (!pcon || !pconName) continue;
    if (pcon.startsWith('N')) { skippedNi += 1; continue; }
    const key = norm(pconName);
    const existing = nameToGss.get(key);
    if (existing && existing !== pcon) {
      if (!conflicts.has(key)) conflicts.set(key, new Set([existing]));
      conflicts.get(key).add(pcon);
      continue;
    }
    nameToGss.set(key, pcon);
  }
  console.log(`  ${nameToGss.size} distinct GB constituency names mapped to a GSS code (${skippedNi} NI ward rows skipped).`);
  if (conflicts.size > 0) {
    console.error(`\n${conflicts.size} constituency name(s) normalise to more than one distinct GSS code in the ONS source — ABORTING, nothing written.`);
    for (const [key, gssSet] of conflicts) {
      console.error(`  "${key}" -> ${[...gssSet].join(', ')}`);
    }
    process.exit(1);
  }

  console.log('\nFetching mps table...');
  const { data: mpRows, error: mpErr } = await supabase.from('mps').select('member_id, name, constituency, constituency_gss_code');
  if (mpErr) { console.error('Failed to read mps:', mpErr.message); process.exit(1); }
  console.log(`  ${mpRows.length} mps rows loaded.`);

  const alreadySet = mpRows.filter((r) => r.constituency_gss_code != null);
  if (alreadySet.length > 0) {
    console.log(`  Note: ${alreadySet.length} row(s) already have a non-null constituency_gss_code — these will be left untouched (this script only fills in nulls, never overwrites an existing value).`);
  }

  const toUpdate = [];
  const unmatched = [];
  for (const mp of mpRows) {
    if (mp.constituency_gss_code != null) continue; // never overwrite an existing value
    const key = norm(mp.constituency);
    const gss = nameToGss.get(key);
    if (gss) {
      toUpdate.push({ member_id: mp.member_id, name: mp.name, constituency: mp.constituency, constituency_gss_code: gss });
    } else {
      unmatched.push({ member_id: mp.member_id, name: mp.name, constituency: mp.constituency });
    }
  }

  console.log(`\nMatched ${toUpdate.length} of ${mpRows.length - alreadySet.length} currently-null rows to a GSS code.`);
  console.log(`Unmatched: ${unmatched.length} row(s). Northern Ireland constituencies are EXPECTED to appear here (no GB GSS code exists for them) — review the list below for anything else.`);
  if (unmatched.length > 0) {
    console.log(JSON.stringify(unmatched, null, 2));
  }

  console.log('\nSample of matched rows:');
  toUpdate.slice(0, 5).forEach((r) => console.log(`  ${r.name} — ${r.constituency} -> ${r.constituency_gss_code}`));

  if (!LIVE) {
    console.log('\nDry run complete. Review the unmatched list above, then pass --live to write constituency_gss_code onto the matched rows.');
    return;
  }

  console.log('\nUpdating matched mps rows...');
  let written = 0;
  let failed = 0;
  for (const r of toUpdate) {
    const { error: updateErr } = await supabase
      .from('mps')
      .update({ constituency_gss_code: r.constituency_gss_code })
      .eq('member_id', r.member_id);
    if (updateErr) {
      console.error(`  Failed to update member_id=${r.member_id} (${r.name}):`, updateErr.message);
      failed += 1;
      continue;
    }
    written += 1;
  }

  console.log(`\nDone. Updated ${written} row(s)${failed > 0 ? `, ${failed} failed (see above)` : ''}. ${unmatched.length} row(s) remain unmatched (expected for Northern Ireland).`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
