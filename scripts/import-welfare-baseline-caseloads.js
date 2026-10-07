#!/usr/bin/env node
// Import BASELINE (~2 years ago) caseload data for the five "claimant
// count × national average award" benefits — PIP, Housing Benefit, DLA,
// Carer's Allowance, ESA — for the two-year % change feature.
//
// This does NOT replace or touch the existing current-period caseload rows
// (metric_keys pip_claimants / hb_claimants / dla_claimants / ca_claimants /
// esa_claimants at their current period_end). It adds a SECOND row per
// constituency per metric, at an OLDER period_end — the unique index on
// (constituency_gss_code, metric_key, period_end) means both coexist
// without conflict.
//
// BASELINE DATES — CONFIRMED VIA RAW STAT-XPLORE EVIDENCE, NOT GUESSED
// ──────────────────────────────────────────────────────────────────────
// Availability and exact date-value URIs for each benefit's nearest point
// to ~24 months before its current period_end were confirmed via direct
// schema/table queries before this script was written (see project
// history). PIP/HB are monthly publishers and land exactly on their
// 24-months-back target; DLA/CA/ESA are quarterly and the nearest
// available quarter is 25 months back (the 2024-03 quarter point does not
// exist for quarterly publishers — the nearest is 2024-02). This 24-vs-25
// month mismatch mirrors a transitional artifact TPA's own documented
// methodology explicitly calls out ("the total benefit payments comparison
// for 2 years actually covers 25 months") — it is expected, not an error.
//
// SCOTLAND
// ────────
// Same devolution rules as the current-period imports: PIP, DLA, and CA
// are excluded for Scotland (status='unavailable', same reason/metadata
// pattern as the live imports). HB and ESA are GB-wide, no exclusion.
//
// INTEGRITY CHECK — same as every other import-welfare-*.js script
// ────────────────────────────────────────────────────────────────────
// Every returned geography item's GSS code is re-derived from its own URI
// and checked against what was expected at that position before anything
// is written. Any mismatch aborts the WHOLE script with nothing written.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics, same metric_keys as the current imports
// (pip_claimants, hb_claimants, dla_claimants, ca_claimants,
// esa_claimants) but at each benefit's baseline period_end.

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
const LIVE = process.argv.includes('--live');

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

// yyyymm -> { periodStart, periodEnd }
function periodFromYyyymm(yyyymm) {
  const year = Number(yyyymm.slice(0, 4));
  const month = Number(yyyymm.slice(4, 6));
  return {
    periodStart: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    periodEnd: lastDayOfMonth(year, month),
  };
}

const BENEFITS = [
  {
    metricKey: 'pip_claimants',
    database: 'str:database:PIP_Monthly_new',
    measure: 'str:count:PIP_Monthly_new:V_F_PIP_MONTHLY',
    dateUri: 'str:value:PIP_Monthly_new:F_PIP_DATE:DATE2:C_PIP_DATE:202407',
    yyyymm: '202407',
    scotlandExcluded: true,
    scotlandReason: 'devolved_to_scotland',
    scotlandNote: 'PIP was fully transferred to Scotland\'s devolved Adult Disability Payment (ADP) by the end of June 2025. This baseline period (July 2024) predates that transfer, but we exclude Scotland here too for consistency with the current-period PIP data, which is also England & Wales-only.',
    scottishEquivalent: 'Adult Disability Payment (ADP), administered by Social Security Scotland',
    sourceName: 'dwp_statxplore_pip_monthly_baseline',
    label: 'PIP',
  },
  {
    metricKey: 'hb_claimants',
    database: 'str:database:hb_new',
    measure: 'str:count:hb_new:V_F_HB_NEW',
    dateUri: 'str:value:hb_new:F_HB_NEW_DATE:NEW_DATE_NAME:C_HB_NEW_DATE:202403',
    yyyymm: '202403',
    scotlandExcluded: false,
    sourceName: 'dwp_statxplore_hb_monthly_baseline',
    label: 'Housing Benefit',
  },
  {
    metricKey: 'dla_claimants',
    database: 'str:database:DLA_In_Payment_New',
    measure: 'str:count:DLA_In_Payment_New:V_F_DLA_In_Payment_New',
    dateUri: 'str:value:DLA_In_Payment_New:F_DLA_QTR_New:DATE_NAME:C_DLA_QTR_New:202402',
    yyyymm: '202402',
    scotlandExcluded: true,
    scotlandReason: 'devolved_to_scotland',
    scotlandNote: 'DLA has been devolved to Scotland (Child Disability Payment for children, Scottish Adult DLA for adults). Excluded here for consistency with the current-period DLA data, which is also England & Wales-only.',
    scottishEquivalent: 'Child Disability Payment (CDP) for children, Scottish Adult DLA (SADLA) for adults, both administered by Social Security Scotland',
    sourceName: 'dwp_statxplore_dla_quarterly_baseline',
    label: 'DLA',
  },
  {
    metricKey: 'ca_claimants',
    database: 'str:database:CA_In_Payment_New',
    measure: 'str:count:CA_In_Payment_New:V_F_CA_In_Payment_New',
    dateUri: 'str:value:CA_In_Payment_New:F_CA_QTR_New:DATE_NAME:C_CA_QTR_New:202402',
    yyyymm: '202402',
    scotlandExcluded: true,
    scotlandReason: 'devolved_to_scotland',
    scotlandNote: 'Carer\'s Allowance has been devolved to Scotland as Carer Support Payment (CSP). Excluded here for consistency with the current-period CA data, which is also England & Wales-only.',
    scottishEquivalent: 'Carer Support Payment (CSP), administered by Social Security Scotland',
    sourceName: 'dwp_statxplore_ca_quarterly_baseline',
    label: 'Carer\'s Allowance',
  },
  {
    metricKey: 'esa_claimants',
    database: 'str:database:ESA_Caseload_new',
    measure: 'str:count:ESA_Caseload_new:V_F_ESA_NEW',
    dateUri: 'str:value:ESA_Caseload_new:F_ESA_QTR_NEW:DATE_NAME:C_ESA_QTR_NEW:202402',
    yyyymm: '202402',
    scotlandExcluded: false,
    sourceName: 'dwp_statxplore_esa_quarterly_baseline',
    label: 'ESA',
  },
];

async function schemaGet(id) {
  const res = await fetch(`${BASE}/schema/${encodeURIComponent(id)}`, {
    headers: { APIKey: STAT_XPLORE_API_KEY },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`/schema/${id} failed (${res.status})`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return JSON.parse(text);
}

async function statXploreTable(body) {
  const res = await fetch(`${BASE}/table`, {
    method: 'POST',
    headers: { APIKey: STAT_XPLORE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`/table failed (${res.status})`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return JSON.parse(text);
}

async function discoverFields(database) {
  const dbSchema = await schemaGet(database);
  const children = dbSchema.children || [];

  const flatFields = [];
  for (const child of children) {
    if (child.type === 'FIELD') {
      flatFields.push(child);
    } else if ((child.type === 'FOLDER' || child.type === 'GROUP') && child.id) {
      try {
        const sub = await schemaGet(child.id);
        (sub.children || []).forEach((c) => { if (c.type === 'FIELD') flatFields.push(c); });
      } catch { /* ignore folders/groups we can't expand */ }
    }
  }

  // Westminster-preference fix (same as import-welfare-ca.js / esa.js /
  // uc-households.js): prefer an explicit "westminster"/"pcon24" match
  // first, since some databases list a Scottish Parliament geography field
  // ahead of the Westminster one under the same broad regex.
  const geoField = flatFields.find((f) => /westminster/i.test(f.label || '') || /pcon24/i.test(f.id || ''))
    || flatFields.find((f) => /constitu|parliament/i.test(f.label || ''));

  if (!geoField) {
    console.error(`Could not find a geography field for ${database}. Fields found:`);
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }

  // Always discover the date field too — date must be included as an explicit
  // dimension (not omitted) or Stat-Xplore returns a transposed cube shape
  // [dateIdx][geoIdx] instead of the expected [geoIdx][dateIdx], breaking
  // cube.values[i][0] indexing for all but the first constituency.
  const dateField = flatFields.find((f) => /month|date|quarter/i.test(f.label || ''));
  if (!dateField) {
    console.error(`Could not find a date/period field for ${database}. Fields found:`);
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }

  return { geoField, dateField };
}

async function discoverConstituencyValueset(geoFieldId) {
  const fieldSchema = await schemaGet(geoFieldId);
  const valuesets = (fieldSchema.children || []).filter((c) => c.type === 'VALUESET' || c.type === 'FOLDER' || c.type === 'GROUP' || c.id);

  let best = null;
  for (const vs of valuesets) {
    try {
      const vsSchema = await schemaGet(vs.id);
      const itemCount = (vsSchema.children || []).length;
      if (!best || itemCount > best.itemCount) {
        best = { id: vs.id, label: vs.label, itemCount, items: vsSchema.children || [] };
      }
    } catch { /* some valuesets may not expand — skip */ }
  }

  if (!best || best.itemCount === 0) {
    console.error('No expandable valueset found under the geography field. Aborting.');
    process.exit(1);
  }
  const sampleItem = best.items[0];
  if (!sampleItem) { console.error('Valueset had no items array. Aborting.'); process.exit(1); }
  const lastColon = sampleItem.id.lastIndexOf(':');
  const uriPrefix = sampleItem.id.slice(0, lastColon + 1);
  return { ...best, uriPrefix };
}

async function importBenefitBaseline(benefit, allGssCodes, scottishCodes) {
  console.log(`\n=== ${benefit.label} baseline (${benefit.yyyymm}) ===`);
  console.log(`Discovering geography and date fields under ${benefit.database}...`);
  const { geoField, dateField } = await discoverFields(benefit.database);
  console.log(`Geography field: ${geoField.id} — ${geoField.label}`);
  console.log(`Date field: ${dateField.id} — ${dateField.label}`);

  console.log('Discovering constituency-level valueset...');
  const valueset = await discoverConstituencyValueset(geoField.id);
  console.log(`Selected valueset: ${valueset.id} — ${valueset.label}, URI prefix: ${valueset.uriPrefix}`);

  const gssCodes = benefit.scotlandExcluded
    ? allGssCodes.filter((c) => !c.startsWith('S14'))
    : allGssCodes;

  console.log(`Requesting ${benefit.label} baseline caseload for ${gssCodes.length} constituencies at ${benefit.dateUri}...`);
  const geoMap = gssCodes.map((code) => [`${valueset.uriPrefix}${code}`]);
  // Date must always be an explicit dimension (not omitted) — omitting it
  // causes Stat-Xplore to return a transposed cube shape [dateIdx][geoIdx]
  // instead of [geoIdx][dateIdx], breaking cube.values[i][0] for all but
  // the first constituency. This matches the pattern used in all the
  // working current-period import scripts (import-welfare-pip.js etc.).
  const data = await statXploreTable({
    database: benefit.database,
    measures: [benefit.measure],
    dimensions: [[geoField.id], [dateField.id]],
    recodes: {
      [geoField.id]: { map: geoMap, total: false },
      [dateField.id]: { map: [[benefit.dateUri]], total: false },
    },
  });

  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === geoField.id);
  const cube = data.cubes && data.cubes[benefit.measure];
  if (!geoFieldResp || !cube || !Array.isArray(cube.values)) {
    console.error('Response missing expected field or cube — aborting.');
    console.error('Cube keys returned:', data.cubes ? Object.keys(data.cubes) : 'none');
    process.exit(1);
  }

  const returnedItems = geoFieldResp.items || [];
  if (returnedItems.length !== gssCodes.length) {
    console.error(`Mismatch: requested ${gssCodes.length}, got ${returnedItems.length} back for ${benefit.label}. Aborting.`);
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
      mismatches.push({ position: i, expectedCode, returnedCode });
      continue;
    }
    results.push({ gss_code: expectedCode, value: cube.values[i] && cube.values[i][0] });
  }

  if (mismatches.length > 0) {
    console.error(`\n${mismatches.length} ordering mismatch(es) for ${benefit.label} — ABORTING ENTIRE SCRIPT, nothing written.`);
    console.error(JSON.stringify(mismatches.slice(0, 5), null, 2));
    process.exit(1);
  }

  console.log(`Integrity check passed: all ${results.length} ${benefit.label} items matched in order.`);
  const total = results.reduce((s, r) => s + (typeof r.value === 'number' ? r.value : 0), 0);
  console.log(`Sum for ${benefit.label} baseline (${gssCodes.length} constituencies): ${total.toLocaleString()}`);
  results.slice(0, 3).forEach((r) => console.log(`  ${r.gss_code}: ${r.value}`));

  const { periodStart, periodEnd } = periodFromYyyymm(benefit.yyyymm);

  return { benefit, results, periodStart, periodEnd, scottishCodesForThis: benefit.scotlandExcluded ? scottishCodes : [] };
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  console.log('\nFetching our own constituency GSS code list from welfare_constituency_geography...');
  const { data: geoRows, error: geoErr } = await supabase
    .from('welfare_constituency_geography')
    .select('constituency_gss_code');
  if (geoErr) { console.error('Failed to read welfare_constituency_geography:', geoErr.message); process.exit(1); }
  const allGssCodes = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  const scottishCodes = allGssCodes.filter((c) => c.startsWith('S14'));
  console.log(`Found ${allGssCodes.length} distinct constituency GSS codes (${scottishCodes.length} Scottish).`);

  const allResults = [];
  for (const benefit of BENEFITS) {
    const r = await importBenefitBaseline(benefit, allGssCodes, scottishCodes);
    allResults.push(r);
  }

  console.log('\n=== Summary of all five baseline imports ===');
  allResults.forEach((r) => console.log(`  ${r.benefit.label}: period_end=${r.periodEnd}, ${r.results.length} ok rows, ${r.scottishCodesForThis.length} Scotland-excluded rows`));

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  for (const r of allResults) {
    const { benefit, results, periodStart, periodEnd, scottishCodesForThis } = r;

    console.log(`\nWriting welfare_source_releases row for ${benefit.label} baseline...`);
    const { data: releaseRow, error: releaseErr } = await supabase
      .from('welfare_source_releases')
      .insert({
        source_name: benefit.sourceName,
        dataset_id: benefit.database,
        source_url: 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1/table',
        release_date: periodEnd,
        reference_period_start: periodStart,
        reference_period_end: periodEnd,
        retrieved_at: new Date().toISOString(),
        notes: `${benefit.label} claimant caseload by Westminster Parliamentary Constituency, ${benefit.yyyymm} — BASELINE period for the two-year % change feature.`,
      })
      .select()
      .single();
    if (releaseErr) { console.error(`Failed to insert source release for ${benefit.label}:`, releaseErr.message); process.exit(1); }
    console.log(`  Inserted source release id ${releaseRow.id}`);

    const metricRows = results.map((row) => ({
      constituency_gss_code: row.gss_code,
      metric_key: benefit.metricKey,
      value: row.value,
      unit: 'people',
      period_start: periodStart,
      period_end: periodEnd,
      source_release_id: releaseRow.id,
      status: 'ok',
      metadata_json: { baseline: true, purpose: 'two_year_change_comparison' },
    }));

    const scottishRows = scottishCodesForThis.map((code) => ({
      constituency_gss_code: code,
      metric_key: benefit.metricKey,
      value: null,
      unit: 'people',
      period_start: periodStart,
      period_end: periodEnd,
      source_release_id: releaseRow.id,
      status: 'unavailable',
      metadata_json: {
        baseline: true,
        purpose: 'two_year_change_comparison',
        reason: benefit.scotlandReason,
        note: benefit.scotlandNote,
        scottish_equivalent: benefit.scottishEquivalent,
      },
    }));

    const allRows = [...metricRows, ...scottishRows];
    const BATCH_SIZE = 200;
    let written = 0;
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      const { error: upsertErr } = await supabase
        .from('welfare_constituency_metrics')
        .upsert(batch, { onConflict: 'constituency_gss_code,metric_key,period_end' });
      if (upsertErr) { console.error(`Failed to upsert metrics batch for ${benefit.label}:`, upsertErr.message); process.exit(1); }
      written += batch.length;
    }
    console.log(`  Done. ${written} rows written for metric_key='${benefit.metricKey}', period_end=${periodEnd}.`);
  }

  console.log('\nAll five baseline imports complete.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
