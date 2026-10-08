#!/usr/bin/env node
// Import BASELINE (~2 years ago) UC households caseload and local-
// authority-level mean monthly payment, for the two-year % change
// feature, by LOCAL AUTHORITY. Same database and measures as
// import-welfare-la-uc-households.js, just pointed at the confirmed
// baseline date instead of the latest available month — the same date
// already confirmed available in import-welfare-uc-households-baseline.js
// (constituency level): str:value:UC_Households:F_UC_HH_DATE:DATE_NAME:C_UC_HH_DATE:202405
// (May 2024, 24 months before the current period_end).
//
// This does NOT touch the existing current-period LA rows for
// 'uc_households' / 'uc_mean_monthly_payment' — it adds a second row per
// local authority per metric at this older period_end (unique index on
// council_gss_code, metric_key, period_end allows both to coexist).
//
// NO SCOTLAND EXCLUSION — same as the current LA UC households import; UC
// is fully reserved, not devolved.
//
// INTEGRITY CHECK — same as every other import-welfare-la-*.js script.
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics (metric_key = 'uc_households' and
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
const COA_FIELD = 'str:field:UC_Households:V_F_UC_HOUSEHOLDS:COA_CODE';
const DATE_FIELD = 'str:field:UC_Households:F_UC_HH_DATE:DATE_NAME';
const MEASURE_HOUSEHOLDS = 'str:count:UC_Households:V_F_UC_HOUSEHOLDS';
const MEASURE_MEAN_PAYMENT = 'str:statfn:UC_Households:V_F_UC_HOUSEHOLDS:HNTOTAL_PAYMENT_AMOUNT:MEAN';

const HOUSEHOLDS_METRIC_KEY = 'uc_households';
const MEAN_PAYMENT_METRIC_KEY = 'uc_mean_monthly_payment';
const SOURCE_NAME = 'dwp_statxplore_uc_households_monthly_baseline_la';

const BASELINE_DATE_URI = 'str:value:UC_Households:F_UC_HH_DATE:DATE_NAME:C_UC_HH_DATE:202405';
const BASELINE_YYYYMM = '202405';
const PERIOD_START = '2024-05-01';
const PERIOD_END = '2024-05-31';

const NON_GEOGRAPHIC_CODES = new Set(['XXZZZZZZZ', 'ZZXXXXXXX']);
const GB_LA_CODE_SHAPE = /^[EWS]\d{8}$/;

const LIVE = process.argv.includes('--live');

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
  console.log(`Discovering the "Local Authority" valueset under ${coaFieldId}...`);
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
  console.log(`  Found: ${candidates[0].id} — ${candidates[0].label}`);
  return candidates[0].id;
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');
  console.log(`Baseline target: ${BASELINE_YYYYMM} (${BASELINE_DATE_URI})`);

  const laValueset = await discoverLaValueset(COA_FIELD);

  console.log(`\nQuerying all local authorities at ${BASELINE_YYYYMM} (valueset-as-dimension, no recode)...`);
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE_HOUSEHOLDS, MEASURE_MEAN_PAYMENT],
    dimensions: [[laValueset], [DATE_FIELD]],
    recodes: { [DATE_FIELD]: { map: [[BASELINE_DATE_URI]], total: false } },
  });

  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === laValueset) || fields[0];
  const householdsCube = data.cubes && data.cubes[MEASURE_HOUSEHOLDS];
  const meanPaymentCube = data.cubes && data.cubes[MEASURE_MEAN_PAYMENT];
  if (!geoFieldResp || !householdsCube || !Array.isArray(householdsCube.values) || !meanPaymentCube || !Array.isArray(meanPaymentCube.values)) {
    console.error('Response missing expected field or cube(s) — aborting.');
    console.error('Cube keys returned:', data.cubes ? Object.keys(data.cubes) : 'none');
    process.exit(1);
  }

  const items = geoFieldResp.items || [];
  console.log(`Items returned: ${items.length}`);

  const results = [];
  const unexpected = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const uri = item.uris ? item.uris[0] : item.uri;
    const code = uri ? uri.split(':').pop() : null;
    const label = item.labels ? item.labels[0] : item.label;
    const households = householdsCube.values[i] && householdsCube.values[i][0];
    const meanPayment = meanPaymentCube.values[i] && meanPaymentCube.values[i][0];
    if (!code || NON_GEOGRAPHIC_CODES.has(code)) continue;
    if (!GB_LA_CODE_SHAPE.test(code)) { unexpected.push({ code, label }); continue; }
    results.push({ code, label, households, mean_payment: meanPayment });
  }

  if (unexpected.length > 0) {
    console.error(`\n${unexpected.length} item(s) with an unexpected code shape — ABORTING, nothing written.`);
    console.error(JSON.stringify(unexpected.slice(0, 10), null, 2));
    process.exit(1);
  }

  console.log(`\nValid local authorities after dropping placeholders: ${results.length} (expected 350).`);
  if (results.length !== 350) {
    console.error(`WARNING: expected exactly 350, got ${results.length}. Review before trusting this further.`);
  }

  console.log('First 5 results:');
  results.slice(0, 5).forEach((r) => console.log(`  ${r.code} (${r.label}): ${r.households} households, mean £${typeof r.mean_payment === 'number' ? r.mean_payment.toFixed(2) : r.mean_payment}/month`));
  const totalHouseholds = results.reduce((s, r) => s + (typeof r.households === 'number' ? r.households : 0), 0);
  console.log(`\nSum of households across all local authorities (baseline): ${totalHouseholds.toLocaleString()}`);
  console.log('Compare against the constituency-level baseline total (~5,747,730) before trusting this further.');

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
      notes: `UC households caseload and local-authority-level mean monthly payment, ${BASELINE_YYYYMM} — BASELINE period for the two-year % change feature.`,
    })
    .select()
    .single();
  if (releaseErr) { console.error('Failed to insert source release:', releaseErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${releaseRow.id}`);

  const householdsRows = results.map((r) => ({
    council_gss_code: r.code,
    council_name: r.label,
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
    council_gss_code: r.code,
    council_name: r.label,
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
      note: 'Genuine local-authority-level mean monthly UC payment per household, from DWP Stat-Xplore (UC_Households, HNTOTAL_PAYMENT_AMOUNT measure, MEAN function). Not a national average.',
    },
  }));

  const allRows = [...householdsRows, ...meanPaymentRows];
  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_local_authority_metrics')
      .upsert(batch, { onConflict: 'council_gss_code,metric_key,period_end' });
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
