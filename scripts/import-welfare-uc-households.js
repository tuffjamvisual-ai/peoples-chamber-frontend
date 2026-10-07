#!/usr/bin/env node
// Import for Universal Credit HOUSEHOLDS caseload and the constituency-
// specific MEAN monthly payment amount, from DWP Stat-Xplore's
// UC_Households database.
//
// WHY THIS EXISTS SEPARATELY FROM import-welfare-uc.js
// ─────────────────────────────────────────────────────
// import-welfare-uc.js imports PEOPLE on Universal Credit
// (UC_Monthly / V_F_UC_CASELOAD_FULL), which is kept as its own metric
// ('uc_people_on_uc') because it's a meaningful headline figure on its
// own. But UC is assessed and paid as a single combined award per
// HOUSEHOLD (a couple/family makes one joint claim, one payment covers
// the household) — there's no real "per-person UC award." TPA's own
// documented methodology for its benefits dashboard confirms this: it
// multiplies the mean award by the number of HOUSEHOLDS for UC
// specifically, unlike the other five benefits (which are individually
// assessed and paid, so claimant-count × mean award is correct for them).
//
// This script imports two things from UC_Households, per constituency:
//   1. uc_households — the household caseload count
//      (str:count:UC_Households:V_F_UC_HOUSEHOLDS)
//   2. uc_mean_monthly_payment — the MEAN monthly payment amount per
//      household, IN THAT CONSTITUENCY specifically
//      (str:measure:UC_Households:V_F_UC_HOUSEHOLDS:HNTOTAL_PAYMENT_AMOUNT)
// Confirmed via schema probe: this measure's only available function is
// MEAN (no SUM/TOTAL exists), and a live test query returned values in the
// £950–£1,070/month range per constituency — consistent with a real mean
// household award, not a national-average fallback. This is a genuine
// constituency-level figure from DWP, not derived from a national average,
// so multiplying it by household caseload gives a materially more accurate
// local UC spend estimate than the old "national average × local people
// caseload" approach used in compute-welfare-uc-spend.js (which this
// script's output will replace — see the follow-up compute script).
//
// INTEGRITY CHECK — same as every other import-welfare-*.js script
// ────────────────────────────────────────────────────────────────────
// Every returned geography item's GSS code is re-derived from its own URI
// and checked against what was expected at that position before anything
// is written. Any mismatch aborts with nothing written.
//
// NO SCOTLAND EXCLUSION
// ─────────────────────
// Universal Credit remains fully reserved to DWP — not devolved. All 632
// GB constituencies are requested, same as the people-based UC import.
//
// WESTMINSTER-PREFERENCE FIX
// ──────────────────────────
// UC_Households's geography group lists SPC_CODE ("Scottish Parliamentary
// Constituency") alongside PCON24 ("Westminster Parliamentary
// Constituency"). The field-matching regex prefers an explicit
// "westminster"/"pcon24" match first, falling back to the broader
// "constitu|parliament" regex only if that finds nothing — same fix
// already applied in import-welfare-ca.js and import-welfare-esa.js.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics (metric_key = 'uc_households' and
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
const MEASURE_HOUSEHOLDS = 'str:count:UC_Households:V_F_UC_HOUSEHOLDS';
const MEASURE_MEAN_PAYMENT = 'str:statfn:UC_Households:V_F_UC_HOUSEHOLDS:HNTOTAL_PAYMENT_AMOUNT:MEAN';

const HOUSEHOLDS_METRIC_KEY = 'uc_households';
const MEAN_PAYMENT_METRIC_KEY = 'uc_mean_monthly_payment';
const SOURCE_NAME = 'dwp_statxplore_uc_households_monthly';

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

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).toISOString().slice(0, 10);
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

  // Westminster-preference fix: prefer an explicit "westminster"/"pcon24"
  // match first — UC_Households also lists SPC_CODE ("Scottish
  // Parliamentary Constituency") in the same geography group, and a plain
  // /constitu|parliament/i regex would match that first via .find().
  const geoField = flatFields.find((f) => /westminster/i.test(f.label || '') || /pcon24/i.test(f.id || ''))
    || flatFields.find((f) => /constitu|parliament/i.test(f.label || ''));
  const dateField = flatFields.find((f) => /month|date/i.test(f.label || ''));

  if (!geoField) {
    console.error('Could not find a geography field matching "westminster"/"pcon24"/"constituency". Fields found:');
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }
  if (!dateField) {
    console.error('Could not find a date field matching "month"/"date". Fields found:');
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }

  console.log(`Geography field: ${geoField.id} — ${geoField.label}`);
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
  if (!sampleItem) {
    console.error('Valueset had non-zero itemCount but no items array. Aborting.');
    process.exit(1);
  }
  const lastColon = sampleItem.id.lastIndexOf(':');
  const uriPrefix = sampleItem.id.slice(0, lastColon + 1);
  console.log(`Selected valueset: ${best.id} — ${best.label} (≥${best.itemCount} items, schema-capped)`);
  console.log(`Derived URI prefix: ${uriPrefix}`);
  return { ...best, uriPrefix };
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

  const { geoField, dateField } = await discoverFields();
  const valueset = await discoverConstituencyValueset(geoField.id);

  console.log('\nFetching our own constituency GSS code list from welfare_constituency_geography...');
  const { data: geoRows, error: geoErr } = await supabase
    .from('welfare_constituency_geography')
    .select('constituency_gss_code');
  if (geoErr) { console.error('Failed to read welfare_constituency_geography:', geoErr.message); process.exit(1); }
  const gssCodes = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  console.log(`Found ${gssCodes.length} distinct constituency GSS codes in our database. No Scotland exclusion — UC is fully reserved, requesting all ${gssCodes.length}.`);

  console.log(`Building ${gssCodes.length} constituency URIs using prefix: ${valueset.uriPrefix}...`);

  let sampleDateItem = (await schemaGet(dateField.id)).children?.[0];
  if (!sampleDateItem) { console.error('Could not get a sample date item to derive the URI template.'); process.exit(1); }
  if (sampleDateItem.id && sampleDateItem.id.startsWith('str:valueset:')) {
    const vsSchema = await schemaGet(sampleDateItem.id);
    const vsItems = vsSchema.children || [];
    if (vsItems.length === 0) { console.error('Date valueset has no items — cannot derive URI template.'); process.exit(1); }
    sampleDateItem = vsItems[vsItems.length - 1];
    console.log(`Date URI template from valueset (latest item): ${sampleDateItem.id} (${sampleDateItem.label})`);
  }
  console.log('\nFinding latest available data month...');
  const { yyyymm, year, month, dateUri } = await findLatestAvailableMonth(dateField.id, sampleDateItem.id);
  const periodEnd = lastDayOfMonth(year, month);

  console.log(`\nRequesting UC households caseload + mean monthly payment for all ${gssCodes.length} constituencies for ${yyyymm}...`);
  const geoMap = gssCodes.map((code) => [`${valueset.uriPrefix}${code}`]);
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE_HOUSEHOLDS, MEASURE_MEAN_PAYMENT],
    dimensions: [[geoField.id], [dateField.id]],
    recodes: {
      [geoField.id]: { map: geoMap, total: false },
      [dateField.id]: { map: [[dateUri]], total: false },
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
      label: item.labels ? item.labels[0] : item.label,
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
  results.slice(0, 5).forEach((r) => console.log(`  ${r.gss_code} (${r.label}): ${r.households} households, mean £${typeof r.mean_payment === 'number' ? r.mean_payment.toFixed(2) : r.mean_payment}/month`));
  const totalHouseholds = results.reduce((s, r) => s + (typeof r.households === 'number' ? r.households : 0), 0);
  const meanPayments = results.map((r) => r.mean_payment).filter((v) => typeof v === 'number');
  const avgOfMeans = meanPayments.length ? meanPayments.reduce((s, v) => s + v, 0) / meanPayments.length : null;
  console.log(`\nSum of households across all GB constituencies: ${totalHouseholds.toLocaleString()}`);
  console.log(`Simple average of constituency mean payments: £${avgOfMeans ? avgOfMeans.toFixed(2) : 'n/a'}/month`);
  console.log('Compare households total against DWP\'s published GB UC households caseload before trusting this further.');

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
      notes: `UC households caseload and constituency-level mean monthly payment, ${yyyymm}.`,
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
    period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'ok',
  }));

  const meanPaymentRows = results.map((r) => ({
    constituency_gss_code: r.gss_code,
    metric_key: MEAN_PAYMENT_METRIC_KEY,
    value: r.mean_payment,
    unit: 'GBP_per_month',
    period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'ok',
    metadata_json: {
      note: 'Genuine constituency-level mean monthly UC payment per household, from DWP Stat-Xplore (UC_Households, HNTOTAL_PAYMENT_AMOUNT measure, MEAN function — the only function this measure supports). Not a national average.',
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

  console.log(`\nDone. ${written} rows written (${householdsRows.length} '${HOUSEHOLDS_METRIC_KEY}' + ${meanPaymentRows.length} '${MEAN_PAYMENT_METRIC_KEY}'), period_end=${periodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
