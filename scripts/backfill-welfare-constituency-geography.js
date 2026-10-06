#!/usr/bin/env node
// Populates welfare_constituency_geography from the ONS ward-level
// lookup, so the standalone welfare search can resolve a council or
// county/unitary-authority name to the constituencies inside it.
//
// SOURCE
// ──────
// "Ward to Westminster Parliamentary Constituency to LAD to CTYUA
// (May 2025) Lookup in the UK" — ONS Open Geography Portal.
// Columns used: PCON24CD/PCON24NM (constituency), LAD25CD/LAD25NM
// (council), CTYUA25CD/CTYUA25NM (county/unitary authority).
// https://ckan.publishing.service.gov.uk/dataset/ward-to-westminster-parliamentary-constituency-to-lad-to-ctyua-may-2025-lookup-in-the-uk
//
// The source is one row per ward. This script collapses it to one row
// per distinct (constituency, council) pair before writing, since the
// welfare table only needs "which council(s) is a constituency in",
// not ward detail.
//
// SCOPE: Great Britain only. A PCON24CD/LAD25CD beginning with "N"
// (Northern Ireland) is skipped — NI isn't part of this feature; see
// the migration's comment for why.
//
// Every run first records a welfare_source_releases row for this
// import (source_name = 'ons_ward_pcon_lad_ctyua'), then writes
// welfare_constituency_geography rows pointing at it, so the
// provenance chain matches the pattern used for the DWP imports.
//
// Run without --live to preview counts and any LAD codes that don't
// match the existing councils table (default dry-run). Pass --live to
// write. A --live run replaces the table's contents wholesale inside a
// single transaction-equivalent (delete all, then insert), consistent
// with welfare_constituency_geography being a derived lookup, not a
// table anything else writes to incrementally.

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { parse } = require('csv-parse/sync');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }

const ONS_LOOKUP_CSV_URL =
  'https://open-geography-portalx-ons.hub.arcgis.com/api/download/v1/items/ac27c7721e664440adcc9e862505c8bc/csv?layers=0';
const SOURCE_NAME = 'ons_ward_pcon_lad_ctyua';
const DATASET_ID = 'ward-to-westminster-parliamentary-constituency-to-lad-to-ctyua-may-2025-lookup-in-the-uk';

const DRY_RUN = !process.argv.includes('--live');
const UA = 'PeoplesChamber-WelfareGeographyBackfill/1.0 (https://opengovt.uk; tuffjamvisual@gmail.com)';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchOnsLookup() {
  const res = await fetch(ONS_LOOKUP_CSV_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`ONS lookup fetch failed: ${res.status}`);
  const csvText = await res.text();
  return parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
}

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN (pass --live to write) ---' : '--- LIVE RUN ---');

  const rows = await fetchOnsLookup();
  console.log(`ONS lookup loaded: ${rows.length} ward-level rows.`);

  // Collapse to distinct (constituency, council) pairs. Northern
  // Ireland constituency/council codes start with "N" — skip them.
  const dedup = new Map(); // key: `${pcon}|${lad}` -> row
  let skippedNi = 0;
  for (const row of rows) {
    const pcon = row.PCON24CD;
    const lad = row.LAD25CD;
    if (!pcon || !lad) continue;
    if (pcon.startsWith('N') || lad.startsWith('N')) { skippedNi += 1; continue; }
    const key = `${pcon}|${lad}`;
    if (!dedup.has(key)) {
      dedup.set(key, {
        constituency_gss_code: pcon,
        council_gss_code: lad,
        council_name: row.LAD25NM,
        county_gss_code: row.CTYUA25CD || null,
        county_name: row.CTYUA25NM || null,
      });
    }
  }
  console.log(`Skipped ${skippedNi} Northern Ireland ward rows.`);
  console.log(`Distinct (constituency, council) pairs: ${dedup.size}`);

  // Reconciliation check against the existing councils table — report
  // only, never block the import on it (see migration comment re: LGR).
  const { data: councilRows, error: councilErr } = await supabase.from('councils').select('gss_code');
  if (councilErr) { console.error('Failed to read councils:', councilErr.message); process.exit(1); }
  const knownCouncilCodes = new Set((councilRows || []).map((r) => r.gss_code));
  const unmatchedCouncilCodes = new Set();
  for (const row of dedup.values()) {
    if (!knownCouncilCodes.has(row.council_gss_code)) unmatchedCouncilCodes.add(`${row.council_gss_code} (${row.council_name})`);
  }
  console.log(`Council codes with no match in the existing councils table: ${unmatchedCouncilCodes.size}`);
  if (unmatchedCouncilCodes.size) {
    console.log('(Expected where local government reorganisation has changed a council since the councils table was seeded —');
    console.log(' county_name/council_name are still stored directly, so search still works; only the councils-table link is affected.)');
    for (const c of Array.from(unmatchedCouncilCodes).slice(0, 20)) console.log(`  ${c}`);
    if (unmatchedCouncilCodes.size > 20) console.log(`  ...and ${unmatchedCouncilCodes.size - 20} more`);
  }

  if (DRY_RUN) {
    console.log('\nDry run only — no rows written. Re-run with --live to apply.');
    return;
  }

  const { data: release, error: releaseErr } = await supabase
    .from('welfare_source_releases')
    .insert({
      source_name: SOURCE_NAME,
      dataset_id: DATASET_ID,
      source_url: 'https://ckan.publishing.service.gov.uk/dataset/' + DATASET_ID,
      notes: `${dedup.size} constituency/council pairs, ${unmatchedCouncilCodes.size} unmatched council codes`,
    })
    .select('id')
    .single();
  if (releaseErr) { console.error('Failed to record source release:', releaseErr.message); process.exit(1); }

  const { error: delErr } = await supabase
    .from('welfare_constituency_geography')
    .delete()
    .not('id', 'is', null); // delete all rows — this table is a wholesale-replaced derived lookup
  if (delErr) { console.error('Failed to clear existing rows:', delErr.message); process.exit(1); }

  const toInsert = Array.from(dedup.values()).map((r) => ({ ...r, source_release_id: release.id }));
  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error: insErr } = await supabase.from('welfare_constituency_geography').insert(batch);
    if (insErr) { console.error(`Batch insert failed at offset ${i}:`, insErr.message); process.exit(1); }
    written += batch.length;
  }
  console.log(`\nWrote ${written} rows to welfare_constituency_geography (source_release_id=${release.id}).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
