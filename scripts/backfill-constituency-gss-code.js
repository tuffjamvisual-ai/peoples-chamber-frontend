#!/usr/bin/env node
// Backfill mps.constituency_gss_code from the ONS official names-and-codes
// lookup for the current (July 2024) Westminster constituency boundaries.
//
// SOURCE
// ──────
// "Westminster Parliamentary Constituencies (July 2024) Names and Codes
// in the UK (V2)" — ONS Open Geography Portal. CSV columns: PCON24CD
// (the GSS code, e.g. E14001234), PCON24NM (English name), PCON24NMW
// (Welsh name, only populated for Wales).
// https://ckan.publishing.service.gov.uk/dataset/westminster-parliamentary-constituencies-july-2024-names-and-codes-in-the-uk-v2
//
// This is a proper ONS reference table, not postcodes.io — postcodes.io
// maps a *postcode* to a constituency name + code, but there is no
// postcode on file for an existing MP row, so a name lookup against the
// authoritative ONS table is the correct way to backfill this column for
// MPs already in the database. New MPs going forward can instead pick up
// constituency_gss_code directly from the postcodes.io response at the
// point /api/find-mp resolves them (a follow-up change, not this script).
//
// MATCHING
// ────────
// Constituency names are matched after the same normalisation already
// used by /api/find-mp (lowercase, "&" -> "and", strip everything that
// isn't a-z0-9) so this script's matching behaves identically to the
// site's existing postcode -> MP lookup, rather than introducing a
// second, slightly different normalisation rule.
//
// Run without --live to preview matches/mismatches (default dry-run).
// Pass --live to write constituency_gss_code to the database.

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { parse } = require('csv-parse/sync');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }

const ONS_LOOKUP_CSV_URL =
  'https://open-geography-portalx-ons.hub.arcgis.com/api/download/v1/items/9a876e4777bc47e392e670a7b8bc3f5c/csv?layers=0';

const DRY_RUN = !process.argv.includes('--live');
const UA = 'PeoplesChamber-ConstituencyGssBackfill/1.0 (https://opengovt.uk; tuffjamvisual@gmail.com)';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Identical normalisation to app/api/find-mp/route.ts's norm(), so a
// constituency that matches there also matches here.
const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

async function fetchOnsLookup() {
  const res = await fetch(ONS_LOOKUP_CSV_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`ONS lookup fetch failed: ${res.status}`);
  const csvText = await res.text();
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
  // Map normalised English name -> GSS code. Also index the Welsh name
  // (PCON24NMW) where present, since some MPs' constituency column may
  // have been entered in Welsh.
  const byNormName = new Map();
  for (const row of rows) {
    const code = row.PCON24CD;
    const nameEn = row.PCON24NM;
    const nameCy = row.PCON24NMW;
    if (code && nameEn) byNormName.set(norm(nameEn), code);
    if (code && nameCy) byNormName.set(norm(nameCy), code);
  }
  return byNormName;
}

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN (pass --live to write) ---' : '--- LIVE RUN ---');

  const byNormName = await fetchOnsLookup();
  console.log(`ONS lookup loaded: ${byNormName.size} normalised name -> GSS code entries.`);

  const { data: mps, error } = await supabase
    .from('mps')
    .select('member_id, name, display_name, constituency, constituency_gss_code')
    .eq('current_member', true);
  if (error) { console.error('Failed to read mps:', error.message); process.exit(1); }

  const matched = [];
  const unmatched = [];
  const alreadySet = [];

  for (const mp of mps || []) {
    if (!mp.constituency) { unmatched.push(mp); continue; }
    const code = byNormName.get(norm(mp.constituency));
    if (!code) { unmatched.push(mp); continue; }
    if (mp.constituency_gss_code === code) { alreadySet.push(mp); continue; }
    matched.push({ ...mp, newCode: code });
  }

  console.log(`\nMatched (will update): ${matched.length}`);
  console.log(`Already correct:       ${alreadySet.length}`);
  console.log(`Unmatched:             ${unmatched.length}`);

  if (unmatched.length) {
    console.log('\nUnmatched constituencies — check spelling against the ONS table by hand:');
    for (const mp of unmatched) {
      console.log(`  member_id=${mp.member_id}  "${mp.constituency}"  (${mp.display_name || mp.name})`);
    }
  }

  if (DRY_RUN) {
    console.log('\nDry run only — no rows written. Re-run with --live to apply.');
    return;
  }

  let written = 0;
  for (const mp of matched) {
    const { error: updErr } = await supabase
      .from('mps')
      .update({ constituency_gss_code: mp.newCode })
      .eq('member_id', mp.member_id);
    if (updErr) {
      console.error(`  FAILED member_id=${mp.member_id}:`, updErr.message);
      continue;
    }
    written += 1;
  }
  console.log(`\nWrote constituency_gss_code for ${written}/${matched.length} matched MPs.`);
  if (unmatched.length) {
    console.log(`${unmatched.length} MPs remain unmatched — re-run after fixing the constituency spelling, or add a manual override.`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
