#!/usr/bin/env node
// Import Universal Credit caseload by Westminster Parliamentary Constituency
// from DWP Stat-Xplore into welfare_constituency_metrics.
//
// PROOF OF CONCEPT — first of six benefits. The pattern established here
// (recode the PCON24 field with one str:value:... URI per constituency GSS
// code, recode the date field to the most recent available month, verify
// the response order matches the request order before writing anything)
// is intended to be repeated for PIP, Housing Benefit, DLA, Carer's
// Allowance and ESA in follow-up scripts, not generalised into a shared
// module yet — confirm this one works end to end first.
//
// SOURCE
// ──────
// DWP Stat-Xplore Open Data API, https://stat-xplore.dwp.gov.uk/webapi/rest/v1
// Database: str:database:UC_Monthly ("People on Universal Credit")
// Measure:  str:count:UC_Monthly:V_F_UC_CASELOAD_FULL
// Geography field: str:field:UC_Monthly:V_F_UC_CASELOAD_FULL:PCON24
//   Individual-constituency valueset confirmed via schema discovery:
//   str:value:UC_Monthly:V_F_UC_CASELOAD_FULL:PCON24:V_C_MASTERGEOG21_PARLC24_TO_REGION:{GSS_CODE}
//   (base prefix + the constituency's own GSS code — no separate lookup
//   needed once you have the GSS code, confirmed against 5 known items).
// Date field: str:field:UC_Monthly:F_UC_DATE:DATE_NAME
//   URI format: str:value:UC_Monthly:F_UC_DATE:DATE_NAME:C_UC_DATE:YYYYMM
//   No "latest" shortcut exists (checked against DWP's own Table API docs —
//   not documented). This script finds the latest available month itself
//   by trying the current month and stepping backwards until one succeeds,
//   since DWP typically publishes with a lag.
//
// CONSTITUENCY LIST
// ─────────────────
// Pulled from welfare_constituency_geography (distinct constituency_gss_code),
// not from mps.constituency_gss_code — the geography table covers every GB
// constituency regardless of whether the seat currently has a sitting MP
// (649 vs the full GB total), so using it avoids silently dropping a vacant
// seat's residents from the welfare data.
//
// INTEGRITY CHECK — READ BEFORE TRUSTING THE OUTPUT
// ──────────────────────────────────────────────────
// Stat-Xplore's recode docs say a "map" array's entries become output
// categories in the order given, but this script does NOT blindly trust
// index position. Each returned PCON24 item carries its own label; this
// script re-derives the GSS code from the returned item's own URI (the
// last segment) and matches it back to the constituency it expected at
// that position. Any mismatch aborts before anything is written — a
// silent row-to-constituency misalignment would be a serious data
// integrity error, not something to risk on an unverified assumption
// about response ordering.
//
// Run without --live to preview (fetches real data, prints summary, writes
// nothing). Pass --live to write to welfare_source_releases and
// welfare_constituency_metrics.

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STAT_XPLORE_API_KEY = process.env.STAT_XPLORE_API_KEY;
if (!STAT_XPLORE_API_KEY) { console.error('STAT_XPLORE_API_KEY not set (.env.local)'); process.exit(1); }

const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';
const DATABASE = 'str:database:UC_Monthly';
const MEASURE = 'str:count:UC_Monthly:V_F_UC_CASELOAD_FULL';
const PCON24_FIELD = 'str:field:UC_Monthly:V_F_UC_CASELOAD_FULL:PCON24';
const DATE_FIELD = 'str:field:UC_Monthly:F_UC_DATE:DATE_NAME';
const PCON24_VALUE_PREFIX = 'str:value:UC_Monthly:V_F_UC_CASELOAD_FULL:PCON24:V_C_MASTERGEOG21_PARLC24_TO_REGION:';
const DATE_VALUE_PREFIX = 'str:value:UC_Monthly:F_UC_DATE:DATE_NAME:C_UC_DATE:';

const METRIC_KEY = 'uc_people_on_uc';
const SOURCE_NAME = 'dwp_statxplore_uc_monthly';

const LIVE = process.argv.includes('--live');

function monthsBack(n) {
  const d = new Date();
  d.setDate(1); // avoid month-length rollover issues
  d.setMonth(d.getMonth() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return { yyyymm: `${yyyy}${mm}`, year: yyyy, month: d.getMonth() + 1 };
}

function lastDayOfMonth(year, month) {
  // month is 1-indexed here
  const d = new Date(year, month, 0); // day 0 of next month = last day of this one
  return d.toISOString().slice(0, 10);
}

async function statXploreTable(body) {
  const res = await fetch(`${BASE}/table`, {
    method: 'POST',
    headers: { APIKey: STAT_XPLORE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Stat-Xplore /table failed (${res.status})`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return JSON.parse(text);
}

async function findLatestAvailableMonth(constituencyRecodeMap) {
  // Try current month, then step backwards. Cap at 12 to avoid looping
  // forever if something upstream is broken rather than just "not yet
  // published".
  for (let back = 0; back <= 12; back++) {
    const { yyyymm, year, month } = monthsBack(back);
    const dateUri = `${DATE_VALUE_PREFIX}${yyyymm}`;
    try {
      // Minimal probe: just this one month, GB aggregate (no PCON recode)
      // so this loop is cheap and doesn't risk the 504-timeout seen earlier
      // from requesting every constituency × every month at once.
      const data = await statXploreTable({
        database: DATABASE,
        measures: [MEASURE],
        dimensions: [[DATE_FIELD]],
        recodes: { [DATE_FIELD]: { map: [[dateUri]], total: false } },
      });
      const cube = data.cubes && data.cubes[MEASURE];
      if (cube) {
        console.log(`Latest available month found: ${yyyymm} (${back} month(s) back from current)`);
        return { yyyymm, year, month, dateUri };
      }
    } catch (err) {
      // Expected for months not yet published — keep trying backwards.
      console.log(`  ${yyyymm}: not available (${err.status || err.message})`);
    }
  }
  throw new Error('Could not find any available month in the last 12 months — something else is wrong.');
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  console.log('\nFetching constituency GSS code list from welfare_constituency_geography...');
  const { data: geoRows, error: geoErr } = await supabase
    .from('welfare_constituency_geography')
    .select('constituency_gss_code');
  if (geoErr) { console.error('Failed to read welfare_constituency_geography:', geoErr.message); process.exit(1); }

  const gssCodes = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  console.log(`Found ${gssCodes.length} distinct constituency GSS codes.`);
  if (gssCodes.length === 0) {
    console.error('No constituency GSS codes found — has the geography backfill been run?');
    process.exit(1);
  }

  console.log('\nFinding latest available UC_Monthly data month...');
  const { yyyymm, year, month, dateUri } = await findLatestAvailableMonth();
  const periodEnd = lastDayOfMonth(year, month);
  console.log(`Using period_end = ${periodEnd}`);

  console.log(`\nRequesting UC caseload for all ${gssCodes.length} constituencies for ${yyyymm}...`);
  const pconMap = gssCodes.map((code) => [`${PCON24_VALUE_PREFIX}${code}`]);
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE],
    dimensions: [[PCON24_FIELD], [DATE_FIELD]],
    recodes: {
      [PCON24_FIELD]: { map: pconMap, total: false },
      [DATE_FIELD]: { map: [[dateUri]], total: false },
    },
  });

  const fields = data.fields || [];
  const pconField = fields.find((f) => f.uri === PCON24_FIELD);
  if (!pconField) {
    console.error('Response did not include the PCON24 field — aborting. Raw response keys:', Object.keys(data));
    process.exit(1);
  }

  const cube = data.cubes && data.cubes[MEASURE];
  if (!cube || !Array.isArray(cube.values)) {
    console.error('Response did not include a usable value cube — aborting.');
    process.exit(1);
  }

  // --- Integrity check: confirm response order matches request order ---
  // Re-derive each returned item's GSS code from its own URI and compare
  // against what we expected at that position, rather than trusting index
  // alignment blindly.
  const returnedItems = pconField.items || [];
  if (returnedItems.length !== gssCodes.length) {
    console.error(`Mismatch: requested ${gssCodes.length} constituencies, got ${returnedItems.length} items back. Aborting — not safe to proceed.`);
    process.exit(1);
  }

  const mismatches = [];
  const results = [];
  for (let i = 0; i < gssCodes.length; i++) {
    const expectedCode = gssCodes[i];
    const item = returnedItems[i];
    const itemUri = item.uris ? item.uris[0] : item.uri;
    const returnedCode = itemUri ? itemUri.split(':').pop() : null;
    if (returnedCode !== expectedCode) {
      mismatches.push({ position: i, expectedCode, returnedCode, label: item.labels ? item.labels[0] : item.label });
      continue;
    }
    // cube.values shape: [pcon_index][date_index] since date was recoded
    // to a single value — confirmed against the probe's logged cube shape
    // before this script was written.
    const value = cube.values[i] && cube.values[i][0];
    results.push({ gss_code: expectedCode, label: item.labels ? item.labels[0] : item.label, value });
  }

  if (mismatches.length > 0) {
    console.error(`\n${mismatches.length} ordering mismatch(es) found — ABORTING, nothing written. This means the assumption that response order matches request order is wrong and the import logic needs rethinking, not a retry.`);
    console.error('First 5 mismatches:', JSON.stringify(mismatches.slice(0, 5), null, 2));
    process.exit(1);
  }

  console.log(`\nIntegrity check passed: all ${results.length} returned items match their expected constituency in order.`);
  console.log('\nFirst 5 results:');
  results.slice(0, 5).forEach((r) => console.log(`  ${r.gss_code} (${r.label}): ${r.value}`));
  const totalPeople = results.reduce((sum, r) => sum + (typeof r.value === 'number' ? r.value : 0), 0);
  console.log(`\nSum across all constituencies: ${totalPeople.toLocaleString()}`);
  console.log('(Compare this by eye against the GB total reported separately by Stat-Xplore for the same month before trusting this further.)');

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  console.log('\nWriting welfare_source_releases row...');
  const { data: releaseRow, error: releaseErr } = await supabase
    .from('welfare_source_releases')
    .insert({
      source_name: SOURCE_NAME,
      dataset_id: DATABASE,
      source_url: 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1/table',
      release_date: periodEnd,
      reference_period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
      reference_period_end: periodEnd,
      retrieved_at: new Date().toISOString(),
      notes: `Universal Credit caseload (people on UC) by Westminster Parliamentary Constituency, ${yyyymm}. Proof-of-concept import — first of six benefits.`,
    })
    .select()
    .single();
  if (releaseErr) { console.error('Failed to insert source release:', releaseErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${releaseRow.id}`);

  console.log('\nUpserting welfare_constituency_metrics rows...');
  const metricRows = results.map((r) => ({
    constituency_gss_code: r.gss_code,
    metric_key: METRIC_KEY,
    value: r.value,
    unit: 'people',
    period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'ok',
  }));

  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < metricRows.length; i += BATCH_SIZE) {
    const batch = metricRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_constituency_metrics')
      .upsert(batch, { onConflict: 'constituency_gss_code,metric_key,period_end' });
    if (upsertErr) { console.error('Failed to upsert metrics batch:', upsertErr.message); process.exit(1); }
    written += batch.length;
    console.log(`  Upserted ${written}/${metricRows.length}`);
  }

  console.log(`\nDone. ${written} constituency rows written for metric_key='${METRIC_KEY}', period_end=${periodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
