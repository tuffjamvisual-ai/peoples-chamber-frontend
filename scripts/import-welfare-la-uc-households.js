#!/usr/bin/env node
// Import Universal Credit HOUSEHOLDS caseload and the LA-specific MEAN
// monthly payment amount, by LOCAL AUTHORITY, from DWP Stat-Xplore's
// UC_Households database. Mirrors import-welfare-uc-households.js's
// constituency-level approach but uses the LA tier's confirmed query
// shape (valueset-as-dimension, no recode) — see import-welfare-la-hb.js's
// header for the full rationale behind that approach.
//
// Two metrics are written per local authority, exactly as at constituency
// level:
//   1. uc_households — the household caseload count
//   2. uc_mean_monthly_payment — the MEAN monthly payment amount per
//      household, IN THAT LOCAL AUTHORITY specifically (not a national
//      average — confirmed at constituency level that MEAN is the only
//      function this measure supports).
//
// NO SCOTLAND EXCLUSION
// ──────────────────────
// Universal Credit remains fully reserved to DWP — not devolved. All local
// authorities (after dropping the 2 non-geographic placeholder codes) are
// written.
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics (metric_key = 'uc_households' and
// 'uc_mean_monthly_payment').

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
const SOURCE_NAME = 'dwp_statxplore_uc_households_monthly_la';

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

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).toISOString().slice(0, 10);
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

async function findLatestAvailableMonth(dateFieldId, sampleItemUri) {
  const lastColon = sampleItemUri.lastIndexOf(':');
  const prefix = sampleItemUri.slice(0, lastColon + 1);
  for (let back = 0; back <= 12; back++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - back);
    const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const dateUri = `${prefix}${yyyymm}`;
    try {
      const data = await statXploreTable({
        database: DATABASE,
        measures: [MEASURE_HOUSEHOLDS],
        dimensions: [[dateFieldId]],
        recodes: { [dateFieldId]: { map: [[dateUri]], total: false } },
      });
      if (data.cubes && data.cubes[MEASURE_HOUSEHOLDS]) {
        console.log(`Latest available month: ${yyyymm} (${back} month(s) back)`);
        return { yyyymm, year: d.getFullYear(), month: d.getMonth() + 1, dateUri };
      }
    } catch (err) {
      console.log(`  ${yyyymm}: not available (${err.status || err.message})`);
    }
  }
  throw new Error('Could not find an available month in the last 12 months.');
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  const laValueset = await discoverLaValueset(COA_FIELD);

  let sampleDateItem = (await schemaGet(DATE_FIELD)).children?.[0];
  if (!sampleDateItem) { console.error('Could not get a sample date item to derive the URI template.'); process.exit(1); }
  if (sampleDateItem.id && sampleDateItem.id.startsWith('str:valueset:')) {
    const vsSchema = await schemaGet(sampleDateItem.id);
    const vsItems = vsSchema.children || [];
    if (vsItems.length === 0) { console.error('Date valueset has no items — cannot derive URI template.'); process.exit(1); }
    sampleDateItem = vsItems[vsItems.length - 1];
    console.log(`Date URI template from valueset (latest item): ${sampleDateItem.id} (${sampleDateItem.label})`);
  }
  console.log('\nFinding latest available data month...');
  const { yyyymm, year, month, dateUri } = await findLatestAvailableMonth(DATE_FIELD, sampleDateItem.id);
  const periodEnd = lastDayOfMonth(year, month);

  console.log(`\nQuerying all local authorities for ${yyyymm} (valueset-as-dimension, no recode)...`);
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE_HOUSEHOLDS, MEASURE_MEAN_PAYMENT],
    dimensions: [[laValueset], [DATE_FIELD]],
    recodes: { [DATE_FIELD]: { map: [[dateUri]], total: false } },
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
  const meanPayments = results.map((r) => r.mean_payment).filter((v) => typeof v === 'number');
  const avgOfMeans = meanPayments.length ? meanPayments.reduce((s, v) => s + v, 0) / meanPayments.length : null;
  console.log(`\nSum of households across all local authorities: ${totalHouseholds.toLocaleString()}`);
  console.log(`Simple average of LA mean payments: £${avgOfMeans ? avgOfMeans.toFixed(2) : 'n/a'}/month`);

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
      notes: `UC households caseload and local-authority-level mean monthly payment, ${yyyymm}.`,
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
    period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'ok',
  }));

  const meanPaymentRows = results.map((r) => ({
    council_gss_code: r.code,
    council_name: r.label,
    metric_key: MEAN_PAYMENT_METRIC_KEY,
    value: r.mean_payment,
    unit: 'GBP_per_month',
    period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'ok',
    metadata_json: {
      note: 'Genuine local-authority-level mean monthly UC payment per household, from DWP Stat-Xplore (UC_Households, HNTOTAL_PAYMENT_AMOUNT measure, MEAN function — the only function this measure supports). Not a national average.',
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

  console.log(`\nDone. ${written} rows written (${householdsRows.length} '${HOUSEHOLDS_METRIC_KEY}' + ${meanPaymentRows.length} '${MEAN_PAYMENT_METRIC_KEY}'), period_end=${periodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
