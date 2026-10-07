#!/usr/bin/env node
// Import BASELINE (~2 years ago) UC households caseload and constituency
// mean monthly payment, for the two-year % change feature. Same database
// and measures as import-welfare-uc-households.js, just pointed at the
// confirmed baseline date instead of the latest available month.
//
// BASELINE DATE — CONFIRMED VIA RAW STAT-XPLORE EVIDENCE
// ──────────────────────────────────────────────────────
// str:value:UC_Households:F_UC_HH_DATE:DATE_NAME:C_UC_HH_DATE:202405
// (May 2024 — exactly 24 months before the current period_end, confirmed
// available with a complete, non-placeholder national total).
//
// This does NOT touch the existing current-period rows for
// 'uc_households' / 'uc_mean_monthly_payment' — it adds a second row per
// constituency per metric at this older period_end (unique index on
// constituency_gss_code, metric_key, period_end allows both to coexist).
//
// NO SCOTLAND EXCLUSION — same as the current UC households import; UC is
// fully reserved, not devolved.
//
// INTEGRITY CHECK — same as every other import-welfare-*.js script.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics (metric_key = 'uc_households' and
// 'uc_mean_monthly_payment', period_end = 2024-05-31).

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
const DATABASE = 'str:database:UC_Households';
const MEASURE_HOUSEHOLDS = 'str:count:UC_Households:V_F_UC_HOUSEHOLDS';
const MEASURE_MEAN_PAYMENT = 'str:statfn:UC_Households:V_F_UC_HOUSEHOLDS:HNTOTAL_PAYMENT_AMOUNT:MEAN';

const HOUSEHOLDS_METRIC_KEY = 'uc_households';
const MEAN_PAYMENT_METRIC_KEY = 'uc_mean_monthly_payment';
const SOURCE_NAME = 'dwp_statxplore_uc_households_monthly_baseline';

const BASELINE_DATE_URI = 'str:value:UC_Households:F_UC_HH_DATE:DATE_NAME:C_UC_HH_DATE:202405';
const BASELINE_YYYYMM = '202405';
const PERIOD_START = '2024-05-01';
const PERIOD_END = '2024-05-31';

const LIVE = process.argv.includes('--live');

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

async function discoverFields() {
  console.log(`Discovering fields under ${DATABASE}...`);
  const dbSchema = await schemaGet(DATABASE);
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

  const geoField = flatFields.find((f) => /westminster/i.test(f.label || '') || /pcon24/i.test(f.id || ''))
    || flatFields.find((f) => /constitu|parliament/i.test(f.label || ''));

  if (!geoField) {
    console.error('Could not find a geography field matching "westminster"/"pcon24"/"constituency". Fields found:');
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }
  console.log(`Geography field: ${geoField.id} — ${geoField.label}`);

  // Always discover the date field too — date must be an explicit dimension
  // or Stat-Xplore returns a transposed cube shape [dateIdx][geoIdx] instead
  // of [geoIdx][dateIdx], breaking cube.values[i][0] for all but the first
  // constituency.
  const dateField = flatFields.find((f) => /month|date/i.test(f.label || ''));
  if (!dateField) {
    console.error('Could not find a date/period field. Fields found:');
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }
  console.log(`Date field: ${dateField.id} — ${dateField.label}`);

  return { geoField, dateField };
}

async function discoverConstituencyValueset(geoFieldId) {
  console.log(`\nDiscovering constituency-level valueset under ${geoFieldId}...`);
  const fieldSchema = await schemaGet(geoFieldId);
  const valuesets = (fieldSchema.children || []).filter((c) => c.type === 'VALUESET' || c.type === 'FOLDER' || c.type === 'GROUP' || c.id);

  let best = null;
  for (const vs of valuesets) {
    try {
      const vsSchema = await schemaGet(vs.id);
      const itemCount = (vsSchema.children || []).length;
      console.log(`  ${vs.id} (${vs.label}): ${itemCount} items`);
      if (!best || itemCount > best.itemCount) {
        best = { id: vs.id, label: vs.label, itemCount, items: vsSchema.children || [] };
      }
    } catch (err) {
      console.log(`  ${vs.id}: could not expand (${err.status || err.message})`);
    }
  }

  if (!best || best.itemCount === 0) {
    console.error('No expandable valueset found under the geography field. Aborting.');
    process.exit(1);
  }
  const sampleItem = best.items[0];
  if (!sampleItem) { console.error('Valueset had non-zero itemCount but no items array. Aborting.'); process.exit(1); }
  const lastColon = sampleItem.id.lastIndexOf(':');
  const uriPrefix = sampleItem.id.slice(0, lastColon + 1);
  console.log(`Selected valueset: ${best.id} — ${best.label} (≥${best.itemCount} items, schema-capped)`);
  console.log(`Derived URI prefix: ${uriPrefix}`);
  return { ...best, uriPrefix };
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');
  console.log(`Baseline target: ${BASELINE_YYYYMM} (${BASELINE_DATE_URI})`);

  const { geoField, dateField } = await discoverFields();
  const valueset = await discoverConstituencyValueset(geoField.id);

  console.log('\nFetching our own constituency GSS code list from welfare_constituency_geography...');
  const { data: geoRows, error: geoErr } = await supabase
    .from('welfare_constituency_geography')
    .select('constituency_gss_code');
  if (geoErr) { console.error('Failed to read welfare_constituency_geography:', geoErr.message); process.exit(1); }
  const gssCodes = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  console.log(`Found ${gssCodes.length} distinct constituency GSS codes. No Scotland exclusion — UC is fully reserved, requesting all ${gssCodes.length}.`);

  console.log(`\nRequesting UC households baseline caseload + mean monthly payment for all ${gssCodes.length} constituencies at ${BASELINE_YYYYMM}...`);
  const geoMap = gssCodes.map((code) => [`${valueset.uriPrefix}${code}`]);
  // Date must always be an explicit dimension — omitting it causes Stat-Xplore
  // to return a transposed cube shape [dateIdx][geoIdx] instead of [geoIdx][dateIdx],
  // breaking cube.values[i][0] for all but the first constituency.
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE_HOUSEHOLDS, MEASURE_MEAN_PAYMENT],
    dimensions: [[geoField.id], [dateField.id]],
    recodes: {
      [geoField.id]: { map: geoMap, total: false },
      [dateField.id]: { map: [[BASELINE_DATE_URI]], total: false },
    },
  });

  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === geoField.id);
  const householdsCube = data.cubes && data.cubes[MEASURE_HOUSEHOLDS];
  const meanPaymentCube = data.cubes && data.cubes[MEASURE_MEAN_PAYMENT];
  if (!geoFieldResp || !householdsCube || !Array.isArray(householdsCube.values) || !meanPaymentCube || !Array.isArray(meanPaymentCube.values)) {
    console.error('Response missing expected field or cube(s) — aborting.');
    console.error('Cube keys returned:', data.cubes ? Object.keys(data.cubes) : 'none');
    process.exit(1);
  }

  const returnedItems = geoFieldResp.items || [];
  if (returnedItems.length !== gssCodes.length) {
    console.error(`Mismatch: requested ${gssCodes.length}, got ${returnedItems.length} back. Aborting.`);
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
    results.push({
      gss_code: expectedCode,
      households: householdsCube.values[i] && householdsCube.values[i][0],
      mean_payment: meanPaymentCube.values[i] && meanPaymentCube.values[i][0],
    });
  }

  if (mismatches.length > 0) {
    console.error(`\n${mismatches.length} ordering mismatch(es) — ABORTING, nothing written.`);
    console.error(JSON.stringify(mismatches.slice(0, 5), null, 2));
    process.exit(1);
  }

  console.log(`\nIntegrity check passed: all ${results.length} items matched in order.`);
  console.log('First 5 results:');
  results.slice(0, 5).forEach((r) => console.log(`  ${r.gss_code}: ${r.households} households, mean £${typeof r.mean_payment === 'number' ? r.mean_payment.toFixed(2) : r.mean_payment}/month`));
  const totalHouseholds = results.reduce((s, r) => s + (typeof r.households === 'number' ? r.households : 0), 0);
  console.log(`\nSum of households across all GB constituencies (baseline): ${totalHouseholds.toLocaleString()}`);
  console.log('Expected: approximately 5,747,730 (confirmed national total via raw Stat-Xplore query before this script was written).');

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
      release_date: PERIOD_END,
      reference_period_start: PERIOD_START,
      reference_period_end: PERIOD_END,
      retrieved_at: new Date().toISOString(),
      notes: `UC households caseload and constituency-level mean monthly payment, ${BASELINE_YYYYMM} — BASELINE period for the two-year % change feature.`,
    })
    .select()
    .single();
  if (releaseErr) { console.error('Failed to insert source release:', releaseErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${releaseRow.id}`);

  const householdsRows = results.map((r) => ({
    constituency_gss_code: r.gss_code,
    metric_key: HOUSEHOLDS_METRIC_KEY,
    value: r.households,
    unit: 'households',
    period_start: PERIOD_START,
    period_end: PERIOD_END,
    source_release_id: releaseRow.id,
    status: 'ok',
    metadata_json: { baseline: true, purpose: 'two_year_change_comparison' },
  }));

  const meanPaymentRows = results.map((r) => ({
    constituency_gss_code: r.gss_code,
    metric_key: MEAN_PAYMENT_METRIC_KEY,
    value: r.mean_payment,
    unit: 'GBP_per_month',
    period_start: PERIOD_START,
    period_end: PERIOD_END,
    source_release_id: releaseRow.id,
    status: 'ok',
    metadata_json: {
      baseline: true,
      purpose: 'two_year_change_comparison',
      note: 'Genuine constituency-level mean monthly UC payment per household, from DWP Stat-Xplore (UC_Households, HNTOTAL_PAYMENT_AMOUNT measure, MEAN function). Not a national average.',
    },
  }));

  const allRows = [...householdsRows, ...meanPaymentRows];
  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_constituency_metrics')
      .upsert(batch, { onConflict: 'constituency_gss_code,metric_key,period_end' });
    if (upsertErr) { console.error('Failed to upsert metrics batch:', upsertErr.message); process.exit(1); }
    written += batch.length;
    console.log(`  Upserted ${written}/${allRows.length}`);
  }

  console.log(`\nDone. ${written} rows written (${householdsRows.length} '${HOUSEHOLDS_METRIC_KEY}' + ${meanPaymentRows.length} '${MEAN_PAYMENT_METRIC_KEY}'), period_end=${PERIOD_END}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
