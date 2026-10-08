#!/usr/bin/env node
// Import BASELINE (~2 years ago) caseload data for the five "claimant
// count × national average award" benefits — PIP, Housing Benefit, DLA,
// Carer's Allowance, ESA — by LOCAL AUTHORITY, for the two-year % change
// feature. Mirrors import-welfare-baseline-caseloads.js's constituency-
// level approach but uses the LA tier's confirmed query shape
// (valueset-as-dimension, no recode on geography) — see
// import-welfare-la-hb.js's header for the full rationale behind that
// approach.
//
// BASELINE DATES — REUSED FROM THE CONSTITUENCY-LEVEL BASELINE SCRIPT
// ──────────────────────────────────────────────────────────────────────
// These date value URIs are national Stat-Xplore date points, not
// constituency- or LA-specific — the exact same dateUri values already
// confirmed available in import-welfare-baseline-caseloads.js are reused
// here unchanged. See that script's header for why each benefit's
// baseline lands 24 or 25 months back (quarterly publishers' nearest
// available quarter vs. monthly publishers landing exactly on target).
//
// This does NOT touch the existing current-period LA caseload rows — it
// adds a SECOND row per local authority per metric, at an OLDER
// period_end (the unique index on (council_gss_code, metric_key,
// period_end) means both coexist without conflict).
//
// SCOTLAND
// ────────
// Same devolution rules as the current-period LA imports: PIP, DLA, and
// CA are excluded for Scotland (status='unavailable'). HB and ESA are
// GB-wide, no exclusion. Because the LA query shape has no recode option
// on geography (full enumeration returns everyone), Scottish local
// authorities (S12 codes) ARE returned by Stat-Xplore and this script
// explicitly DISCARDS their value for the three devolved benefits — same
// pattern as import-welfare-la-pip.js / la-dla.js / la-ca.js.
//
// INTEGRITY CHECK
// ────────────────
// Every returned item's GSS code is re-derived from its own URI. Any item
// whose code doesn't match the GB LA code shape aborts the WHOLE script,
// nothing written.
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics, same metric_keys as the current LA
// imports (pip_claimants, hb_claimants, dla_claimants, ca_claimants,
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

const NON_GEOGRAPHIC_CODES = new Set(['XXZZZZZZZ', 'ZZXXXXXXX']);
const GB_LA_CODE_SHAPE = /^[EWS]\d{8}$/;

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

function periodFromYyyymm(yyyymm) {
  const year = Number(yyyymm.slice(0, 4));
  const month = Number(yyyymm.slice(4, 6));
  return {
    periodStart: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    periodEnd: lastDayOfMonth(year, month),
  };
}

// Same dateUri values as import-welfare-baseline-caseloads.js (confirmed
// available there) — these are national date points, reused unchanged.
const BENEFITS = [
  {
    label: 'PIP',
    metricKey: 'pip_claimants',
    database: 'str:database:PIP_Monthly_new',
    coaField: 'str:field:PIP_Monthly_new:V_F_PIP_MONTHLY:COA_CODE',
    dateField: 'str:field:PIP_Monthly_new:F_PIP_DATE:DATE2',
    measure: 'str:count:PIP_Monthly_new:V_F_PIP_MONTHLY',
    dateUri: 'str:value:PIP_Monthly_new:F_PIP_DATE:DATE2:C_PIP_DATE:202407',
    yyyymm: '202407',
    scotlandExcluded: true,
    scotlandReason: 'devolved_to_scotland',
    scotlandNote: 'PIP was fully transferred to Scotland\'s devolved Adult Disability Payment (ADP) by the end of June 2025. This baseline period (July 2024) predates that transfer, but we exclude Scotland here too for consistency with the current-period PIP data, which is also England & Wales-only.',
    scottishEquivalent: 'Adult Disability Payment (ADP), administered by Social Security Scotland',
    sourceName: 'dwp_statxplore_pip_monthly_baseline_la',
  },
  {
    label: 'Housing Benefit',
    metricKey: 'hb_claimants',
    database: 'str:database:hb_new',
    coaField: 'str:field:hb_new:V_F_HB_NEW:COA_CODE',
    dateField: 'str:field:hb_new:F_HB_NEW_DATE:NEW_DATE_NAME',
    measure: 'str:count:hb_new:V_F_HB_NEW',
    dateUri: 'str:value:hb_new:F_HB_NEW_DATE:NEW_DATE_NAME:C_HB_NEW_DATE:202403',
    yyyymm: '202403',
    scotlandExcluded: false,
    sourceName: 'dwp_statxplore_hb_monthly_baseline_la',
  },
  {
    label: 'DLA',
    metricKey: 'dla_claimants',
    database: 'str:database:DLA_In_Payment_New',
    coaField: 'str:field:DLA_In_Payment_New:V_F_DLA_In_Payment_New:COA_CODE',
    dateField: 'str:field:DLA_In_Payment_New:F_DLA_QTR_New:DATE_NAME',
    measure: 'str:count:DLA_In_Payment_New:V_F_DLA_In_Payment_New',
    dateUri: 'str:value:DLA_In_Payment_New:F_DLA_QTR_New:DATE_NAME:C_DLA_QTR_New:202402',
    yyyymm: '202402',
    scotlandExcluded: true,
    scotlandReason: 'devolved_to_scotland',
    scotlandNote: 'DLA has been devolved to Scotland (Child Disability Payment for children, Scottish Adult DLA for adults). Excluded here for consistency with the current-period DLA data, which is also England & Wales-only.',
    scottishEquivalent: 'Child Disability Payment (CDP) for children, Scottish Adult DLA (SADLA) for adults, both administered by Social Security Scotland',
    sourceName: 'dwp_statxplore_dla_quarterly_baseline_la',
  },
  {
    label: 'Carer\'s Allowance',
    metricKey: 'ca_claimants',
    database: 'str:database:CA_In_Payment_New',
    coaField: 'str:field:CA_In_Payment_New:V_F_CA_In_Payment_New:COA_CODE',
    dateField: 'str:field:CA_In_Payment_New:F_CA_QTR_New:DATE_NAME',
    measure: 'str:count:CA_In_Payment_New:V_F_CA_In_Payment_New',
    dateUri: 'str:value:CA_In_Payment_New:F_CA_QTR_New:DATE_NAME:C_CA_QTR_New:202402',
    yyyymm: '202402',
    scotlandExcluded: true,
    scotlandReason: 'devolved_to_scotland',
    scotlandNote: 'Carer\'s Allowance has been devolved to Scotland as Carer Support Payment (CSP). Excluded here for consistency with the current-period CA data, which is also England & Wales-only.',
    scottishEquivalent: 'Carer Support Payment (CSP), administered by Social Security Scotland',
    sourceName: 'dwp_statxplore_ca_quarterly_baseline_la',
  },
  {
    label: 'ESA',
    metricKey: 'esa_claimants',
    database: 'str:database:ESA_Caseload_new',
    coaField: 'str:field:ESA_Caseload_new:V_F_ESA_NEW:COA_CODE',
    dateField: 'str:field:ESA_Caseload_new:F_ESA_QTR_NEW:DATE_NAME',
    measure: 'str:count:ESA_Caseload_new:V_F_ESA_NEW',
    dateUri: 'str:value:ESA_Caseload_new:F_ESA_QTR_NEW:DATE_NAME:C_ESA_QTR_NEW:202402',
    yyyymm: '202402',
    scotlandExcluded: false,
    sourceName: 'dwp_statxplore_esa_quarterly_baseline_la',
  },
];

async function schemaGet(id) {
  const res = await fetch(`${BASE}/schema/${encodeURIComponent(id)}`, { headers: { APIKey: STAT_XPLORE_API_KEY } });
  const text = await res.text();
  if (!res.ok) { const err = new Error(`/schema/${id} failed (${res.status})`); err.status = res.status; err.body = text; throw err; }
  return JSON.parse(text);
}

async function statXploreTable(body) {
  const res = await fetch(`${BASE}/table`, {
    method: 'POST',
    headers: { APIKey: STAT_XPLORE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) { const err = new Error(`/table failed (${res.status})`); err.status = res.status; err.body = text; throw err; }
  return JSON.parse(text);
}

async function discoverLaValueset(coaFieldId) {
  const schema = await schemaGet(coaFieldId);
  const children = schema.children || [];
  let candidates = children.filter((c) => c.type === 'VALUESET' && /local authority/i.test(c.label || ''));
  if (candidates.length === 0) {
    for (const child of children) {
      if (child.type === 'FOLDER' || child.type === 'GROUP') {
        try {
          const sub = await schemaGet(child.id);
          const subVs = (sub.children || []).filter((c) => c.type === 'VALUESET' && /local authority/i.test(c.label || ''));
          candidates = candidates.concat(subVs);
        } catch { /* ignore */ }
      } else if (child.type === 'VALUESET' && /local authority/i.test(child.label || '')) {
        candidates.push(child);
      }
    }
  }
  if (candidates.length === 0) {
    console.error('No "Local Authority" labelled valueset found. Children of COA_CODE:');
    children.forEach((c) => console.error(`  ${c.id} [${c.type}] — ${c.label}`));
    process.exit(1);
  }
  return candidates[0].id;
}

async function importBenefitBaseline(benefit) {
  console.log(`\n=== ${benefit.label} LA baseline (${benefit.yyyymm}) ===`);
  console.log(`Discovering the "Local Authority" valueset under ${benefit.coaField}...`);
  const laValueset = await discoverLaValueset(benefit.coaField);
  console.log(`  Found: ${laValueset}`);

  console.log(`Querying all local authorities at ${benefit.dateUri} (valueset-as-dimension, no recode)...`);
  const data = await statXploreTable({
    database: benefit.database,
    measures: [benefit.measure],
    dimensions: [[laValueset], [benefit.dateField]],
    recodes: { [benefit.dateField]: { map: [[benefit.dateUri]], total: false } },
  });

  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === laValueset) || fields[0];
  const cube = data.cubes && data.cubes[benefit.measure];
  if (!geoFieldResp || !cube || !Array.isArray(cube.values)) {
    console.error(`Response missing expected field or cube for ${benefit.label} — aborting.`);
    console.error('Cube keys returned:', data.cubes ? Object.keys(data.cubes) : 'none');
    process.exit(1);
  }

  const items = geoFieldResp.items || [];
  console.log(`Items returned: ${items.length}`);

  const nonScottish = [];
  const scottish = [];
  const unexpected = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const uri = item.uris ? item.uris[0] : item.uri;
    const code = uri ? uri.split(':').pop() : null;
    const label = item.labels ? item.labels[0] : item.label;
    const value = cube.values[i] && cube.values[i][0];
    if (!code || NON_GEOGRAPHIC_CODES.has(code)) continue;
    if (!GB_LA_CODE_SHAPE.test(code)) { unexpected.push({ code, label }); continue; }
    if (benefit.scotlandExcluded && code.startsWith('S12')) { scottish.push({ code, label }); continue; }
    nonScottish.push({ code, label, value });
  }

  if (unexpected.length > 0) {
    console.error(`\n${unexpected.length} item(s) with an unexpected code shape for ${benefit.label} — ABORTING ENTIRE SCRIPT, nothing written.`);
    console.error(JSON.stringify(unexpected.slice(0, 10), null, 2));
    process.exit(1);
  }

  const expectedNonScottish = benefit.scotlandExcluded ? 318 : 350;
  console.log(`Valid local authorities: ${nonScottish.length} (expected ${expectedNonScottish})${benefit.scotlandExcluded ? `, ${scottish.length} Scottish excluded (expected 32)` : ''}.`);
  if (nonScottish.length !== expectedNonScottish || (benefit.scotlandExcluded && scottish.length !== 32)) {
    console.error(`WARNING: unexpected counts for ${benefit.label}. Review before trusting this further.`);
  }

  const total = nonScottish.reduce((s, r) => s + (typeof r.value === 'number' ? r.value : 0), 0);
  console.log(`Sum for ${benefit.label} LA baseline: ${total.toLocaleString()}`);
  nonScottish.slice(0, 3).forEach((r) => console.log(`  ${r.code} (${r.label}): ${r.value}`));

  const { periodStart, periodEnd } = periodFromYyyymm(benefit.yyyymm);
  return { benefit, results: nonScottish, scottishResults: scottish, periodStart, periodEnd };
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  const allResults = [];
  for (const benefit of BENEFITS) {
    allResults.push(await importBenefitBaseline(benefit));
  }

  console.log('\n=== Summary of all five LA baseline imports ===');
  allResults.forEach((r) => console.log(`  ${r.benefit.label}: period_end=${r.periodEnd}, ${r.results.length} ok rows, ${r.scottishResults.length} Scotland-excluded rows`));

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  for (const r of allResults) {
    const { benefit, results, scottishResults, periodStart, periodEnd } = r;

    console.log(`\nWriting welfare_source_releases row for ${benefit.label} LA baseline...`);
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
        notes: `${benefit.label} claimant caseload by local authority, ${benefit.yyyymm} — BASELINE period for the two-year % change feature.`,
      })
      .select()
      .single();
    if (releaseErr) { console.error(`Failed to insert source release for ${benefit.label}:`, releaseErr.message); process.exit(1); }
    console.log(`  Inserted source release id ${releaseRow.id}`);

    const metricRows = results.map((row) => ({
      council_gss_code: row.code,
      council_name: row.label,
      metric_key: benefit.metricKey,
      value: row.value,
      unit: 'people',
      period_start: periodStart,
      period_end: periodEnd,
      source_release_id: releaseRow.id,
      status: 'ok',
      metadata_json: { baseline: true, purpose: 'two_year_change_comparison' },
    }));

    const scottishRows = scottishResults.map((row) => ({
      council_gss_code: row.code,
      council_name: row.label,
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
        .from('welfare_local_authority_metrics')
        .upsert(batch, { onConflict: 'council_gss_code,metric_key,period_end' });
      if (upsertErr) { console.error(`Failed to upsert metrics batch for ${benefit.label}:`, upsertErr.message); process.exit(1); }
      written += batch.length;
    }
    console.log(`  Done. ${written} rows written for metric_key='${benefit.metricKey}', period_end=${periodEnd}.`);
  }

  console.log('\nAll five LA baseline imports complete.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
