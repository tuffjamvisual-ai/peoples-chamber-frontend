#!/usr/bin/env node
// Import PIP "Motability" (mobility award status) and main disabling
// condition breakdown by Westminster Parliamentary Constituency, from
// DWP Stat-Xplore's PIP_Monthly_new database. This matches TPA's own
// documented methodology exactly (extracted from their live "Dashboard
// Information" panel):
//
// "The Motability figure shows the number of claimants receiving the
// enhanced rate of the PIP mobility component... A claimant may have
// more than one disability or health condition, but only one main
// disabling condition is recorded in the data."
//
// FIELDS — CONFIRMED VIA RAW STAT-XPLORE SCHEMA EVIDENCE
// ────────────────────────────────────────────────────────
// Mobility: str:field:PIP_Monthly_new:V_F_PIP_MONTHLY:MOB_AWARD_TYPE
// values: 1=Enhanced, 2=Standard, 3=Nil, 99=Unknown or missing
// Condition: str:field:PIP_Monthly_new:V_F_PIP_MONTHLY:DISABILITY_CODE
// category-level valueset C_PIP_DIS_CAT (22 items: 20 numbered
// categories + 99 Unknown + 9999 Not recorded)
// Cube shape for a [geography, secondDimension, date] query is
// [geoIdx][secondDimIdx][dateIdx] — confirmed via a raw 3-constituency
// test query before this script was written (fields[] order matches the
// requested dimension order; no API reordering).
//
// SAME CURRENT PERIOD AS pip_claimants — not a new discovery
// ────────────────────────────────────────────────────────────
// This uses the same latest-available-month discovery as
// import-welfare-pip.js, so period_end should match the live
// pip_claimants data exactly (both come from the same database/date
// field). If it doesn't match, something has changed upstream — this
// script does NOT force the date to the pip_claimants period_end, it
// discovers independently and reports what it found so a mismatch is
// visible rather than silently forced.
//
// SCOTLAND EXCLUSION — same as pip_claimants (PIP devolved to Scotland's
// Adult Disability Payment) — see import-welfare-pip.js header.
//
// WHAT GETS WRITTEN
// ──────────────────
// metric_key='pip_motability_enhanced_claimants': value = Enhanced-rate
// count. metadata_json carries standard/nil/unknown counts too, for
// full transparency (not just the headline Enhanced figure).
// metric_key='pip_main_condition_breakdown': value = the count of the
// PLURALITY (largest) condition category at that constituency.
// metadata_json carries the full 22-category breakdown and the label
// of which category is the plurality ("main") one.
//
// INTEGRITY CHECK — same as every other import-welfare-*.js script.
//
// Run without --live to preview. Pass --live to write to
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
const DATABASE = 'str:database:PIP_Monthly_new';
const MEASURE = 'str:count:PIP_Monthly_new:V_F_PIP_MONTHLY';

const MOB_FIELD = 'str:field:PIP_Monthly_new:V_F_PIP_MONTHLY:MOB_AWARD_TYPE';
const MOB_VALUESET_PREFIX = 'str:value:PIP_Monthly_new:V_F_PIP_MONTHLY:MOB_AWARD_TYPE:C_PIP_MOB_AWARD_TYPE:';
const MOB_CATEGORIES = [
  { suffix: '1',  label: 'Enhanced' },
  { suffix: '2',  label: 'Standard' },
  { suffix: '3',  label: 'Nil' },
  { suffix: '99', label: 'Unknown or missing' },
];

const DIS_FIELD = 'str:field:PIP_Monthly_new:V_F_PIP_MONTHLY:DISABILITY_CODE';
const DIS_VALUESET_PREFIX = 'str:value:PIP_Monthly_new:V_F_PIP_MONTHLY:DISABILITY_CODE:C_PIP_DIS_CAT:';
const DIS_CATEGORIES = [
  { suffix: '1',    label: 'Haematological Disease' },
  { suffix: '2',    label: 'Infectious disease' },
  { suffix: '3',    label: 'Malignant disease' },
  { suffix: '4',    label: 'Metabolic disease' },
  { suffix: '5',    label: 'Psychiatric disorders' },
  { suffix: '6',    label: 'Neurological disease' },
  { suffix: '7',    label: 'Visual disease' },
  { suffix: '8',    label: 'Hearing disorders' },
  { suffix: '9',    label: 'Cardiovascular disease' },
  { suffix: '10',   label: 'Gastrointestinal disease' },
  { suffix: '11',   label: 'Diseases of the liver, gallbladder, biliary tract' },
  { suffix: '12',   label: 'Skin disease' },
  { suffix: '13',   label: 'Musculoskeletal disease (general)' },
  { suffix: '14',   label: 'Musculoskeletal disease (regional)' },
  { suffix: '15',   label: 'Autoimmune disease (connective tissue disorders)' },
  { suffix: '16',   label: 'Genitourinary disease' },
  { suffix: '17',   label: 'Endocrine disease' },
  { suffix: '18',   label: 'Respiratory disease' },
  { suffix: '19',   label: 'Multisystem and extremes of age' },
  { suffix: '20',   label: 'Diseases of the immune system' },
  { suffix: '99',   label: 'Unknown or missing' },
  { suffix: '9999', label: 'Disability not recorded - Assessment not completed' },
];

const MOTABILITY_METRIC_KEY = 'pip_motability_enhanced_claimants';
const CONDITION_METRIC_KEY  = 'pip_main_condition_breakdown';
const SOURCE_NAME = 'dwp_statxplore_pip_detail_monthly';

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
  console.log(`Discovering geography and date fields under ${DATABASE}...`);
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
  const dateField = flatFields.find((f) => /month|date/i.test(f.label || ''));

  if (!geoField) {
    console.error('Could not find a geography field. Fields found:');
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }
  if (!dateField) {
    console.error('Could not find a date field. Fields found:');
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }

  console.log(`Geography field: ${geoField.id} — ${geoField.label}`);
  console.log(`Date field: ${dateField.id} — ${dateField.label}`);
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
      if (!best || itemCount > best.itemCount) best = { id: vs.id, label: vs.label, itemCount, items: vsSchema.children || [] };
    } catch { /* skip */ }
  }
  if (!best || best.itemCount === 0) { console.error('No expandable geography valueset found. Aborting.'); process.exit(1); }
  const sampleItem = best.items[0];
  if (!sampleItem) { console.error('Valueset had no items. Aborting.'); process.exit(1); }
  const lastColon = sampleItem.id.lastIndexOf(':');
  const uriPrefix = sampleItem.id.slice(0, lastColon + 1);
  console.log(`Selected geography valueset: ${best.id} — ${best.label}, URI prefix: ${uriPrefix}`);
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
        measures: [MEASURE],
        dimensions: [[dateFieldId]],
        recodes: { [dateFieldId]: { map: [[dateUri]], total: false } },
      });
      if (data.cubes && data.cubes[MEASURE]) {
        console.log(`Latest available month: ${yyyymm} (${back} month(s) back)`);
        return { yyyymm, year: d.getFullYear(), month: d.getMonth() + 1, dateUri };
      }
    } catch { /* try earlier month */ }
  }
  throw new Error('Could not find an available month in the last 12 months.');
}

// Runs a [geography, secondDimension, date] query for all gssCodes and
// returns, per constituency, the array of counts in secondDim category
// order (same order as categories).
async function queryBreakdown(label, geoField, geoUriPrefix, secondField, secondUriPrefix, categories, dateField, dateUri, gssCodes) {
  console.log(`\nRequesting ${label} breakdown for ${gssCodes.length} constituencies...`);
  const geoMap    = gssCodes.map((code) => [`${geoUriPrefix}${code}`]);
  const secondMap = categories.map((c) => [`${secondUriPrefix}${c.suffix}`]);
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE],
    dimensions: [[geoField.id], [secondField], [dateField.id]],
    recodes: {
      [geoField.id]:  { map: geoMap,    total: false },
      [secondField]:  { map: secondMap, total: false },
      [dateField.id]: { map: [[dateUri]], total: false },
    },
  });

  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === geoField.id);
  const cube = data.cubes && data.cubes[MEASURE];
  if (!geoFieldResp || !cube || !Array.isArray(cube.values)) {
    console.error(`${label}: response missing expected field or cube — aborting.`);
    console.error('Cube keys returned:', data.cubes ? Object.keys(data.cubes) : 'none');
    process.exit(1);
  }

  const returnedItems = geoFieldResp.items || [];
  if (returnedItems.length !== gssCodes.length) {
    console.error(`${label}: mismatch — requested ${gssCodes.length}, got ${returnedItems.length} back. Aborting.`);
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
    // cube.values[geoIdx][secondDimIdx][dateIdx] — confirmed via raw test
    // query before this script was written.
    const counts = categories.map((c, j) => {
      const v = cube.values[i] && cube.values[i][j] && cube.values[i][j][0];
      return typeof v === 'number' ? v : 0;
    });
    results.push({ gss_code: expectedCode, counts });
  }

  if (mismatches.length > 0) {
    console.error(`${label}: ${mismatches.length} ordering mismatch(es) — ABORTING ENTIRE SCRIPT, nothing written.`);
    console.error(JSON.stringify(mismatches.slice(0, 5), null, 2));
    process.exit(1);
  }

  console.log(`${label}: integrity check passed, all ${results.length} items matched in order.`);
  return results;
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
  const allGssCodes   = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  const scottishCodes = allGssCodes.filter((c) => c.startsWith('S14'));
  const gssCodes      = allGssCodes.filter((c) => !c.startsWith('S14'));
  console.log(`Found ${allGssCodes.length} distinct constituency GSS codes. Excluding ${scottishCodes.length} Scottish constituencies (PIP devolved) — requesting detail for the remaining ${gssCodes.length}.`);

  let sampleDateItem = (await schemaGet(dateField.id)).children?.[0];
  if (!sampleDateItem) { console.error('Could not get a sample date item.'); process.exit(1); }
  if (sampleDateItem.id && sampleDateItem.id.startsWith('str:valueset:')) {
    const vsSchema = await schemaGet(sampleDateItem.id);
    const vsItems = vsSchema.children || [];
    if (vsItems.length === 0) { console.error('Date valueset has no items.'); process.exit(1); }
    sampleDateItem = vsItems[vsItems.length - 1];
  }
  console.log('\nFinding latest available data month...');
  const { yyyymm, year, month, dateUri } = await findLatestAvailableMonth(dateField.id, sampleDateItem.id);
  const periodEnd   = lastDayOfMonth(year, month);
  const periodStart = `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`;
  console.log(`Using period ${yyyymm} (period_end=${periodEnd}). Compare this against the live pip_claimants period_end — it should match.`);

  const mobResults = await queryBreakdown(
    'Motability', geoField, valueset.uriPrefix,
    MOB_FIELD, MOB_VALUESET_PREFIX, MOB_CATEGORIES,
    dateField, dateUri, gssCodes,
  );
  const disResults = await queryBreakdown(
    'Disabling condition', geoField, valueset.uriPrefix,
    DIS_FIELD, DIS_VALUESET_PREFIX, DIS_CATEGORIES,
    dateField, dateUri, gssCodes,
  );

  const mobByGss = new Map(mobResults.map((r) => [r.gss_code, r.counts]));
  const disByGss = new Map(disResults.map((r) => [r.gss_code, r.counts]));

  console.log('\nFirst 3 constituencies:');
  gssCodes.slice(0, 3).forEach((code) => {
    const [enh, std, nil, unk] = mobByGss.get(code);
    const disCounts = disByGss.get(code);
    const maxIdx = disCounts.reduce((best, v, i) => (v > disCounts[best] ? i : best), 0);
    console.log(`  ${code}: Motability Enhanced=${enh}, Standard=${std}, Nil=${nil}, Unknown=${unk}; main condition=${DIS_CATEGORIES[maxIdx].label} (${disCounts[maxIdx]})`);
  });

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
      reference_period_start: periodStart,
      reference_period_end: periodEnd,
      retrieved_at: new Date().toISOString(),
      notes: `PIP Motability (mobility award status) and main disabling condition breakdown by Westminster Parliamentary Constituency, ${yyyymm}.`,
    })
    .select()
    .single();
  if (releaseErr) { console.error('Failed to insert source release:', releaseErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${releaseRow.id}`);

  const motabilityRows = gssCodes.map((code) => {
    const [enh, std, nil, unk] = mobByGss.get(code);
    return {
      constituency_gss_code: code,
      metric_key: MOTABILITY_METRIC_KEY,
      value: enh,
      unit: 'people',
      period_start: periodStart,
      period_end: periodEnd,
      source_release_id: releaseRow.id,
      status: 'ok',
      metadata_json: {
        note: "Number of PIP claimants receiving the ENHANCED rate of the mobility component (\"the Motability figure\", per TPA's documented methodology). Standard/Nil/Unknown counts included for transparency.",
        enhanced: enh,
        standard: std,
        nil: nil,
        unknown_or_missing: unk,
      },
    };
  });

  const conditionRows = gssCodes.map((code) => {
    const counts = disByGss.get(code);
    const breakdown = {};
    DIS_CATEGORIES.forEach((c, i) => { breakdown[c.label] = counts[i]; });
    let maxIdx = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] > counts[maxIdx]) maxIdx = i;
    return {
      constituency_gss_code: code,
      metric_key: CONDITION_METRIC_KEY,
      value: counts[maxIdx],
      unit: 'people',
      period_start: periodStart,
      period_end: periodEnd,
      source_release_id: releaseRow.id,
      status: 'ok',
      metadata_json: {
        note: "value = count of claimants in the PLURALITY (largest) main disabling condition category at this constituency. \"A claimant may have more than one disability or health condition, but only one main disabling condition is recorded in the data\" (TPA's documented methodology, matched here). Full 22-category breakdown below.",
        main_condition_label: DIS_CATEGORIES[maxIdx].label,
        main_condition_count: counts[maxIdx],
        breakdown,
      },
    };
  });

  const scottishMotabilityRows = scottishCodes.map((code) => ({
    constituency_gss_code: code,
    metric_key: MOTABILITY_METRIC_KEY,
    value: null,
    unit: 'people',
    period_start: periodStart,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'unavailable',
    metadata_json: {
      reason: 'devolved_to_scotland',
      note: "PIP was fully transferred to Scotland's devolved Adult Disability Payment (ADP) by the end of June 2025.",
      scottish_equivalent: 'Adult Disability Payment (ADP), administered by Social Security Scotland',
    },
  }));
  const scottishConditionRows = scottishCodes.map((code) => ({
    constituency_gss_code: code,
    metric_key: CONDITION_METRIC_KEY,
    value: null,
    unit: 'people',
    period_start: periodStart,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'unavailable',
    metadata_json: {
      reason: 'devolved_to_scotland',
      note: "PIP was fully transferred to Scotland's devolved Adult Disability Payment (ADP) by the end of June 2025.",
      scottish_equivalent: 'Adult Disability Payment (ADP), administered by Social Security Scotland',
    },
  }));

  const allRows = [...motabilityRows, ...conditionRows, ...scottishMotabilityRows, ...scottishConditionRows];
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

  console.log(`\nDone. ${written} rows written (${motabilityRows.length} + ${scottishMotabilityRows.length} '${MOTABILITY_METRIC_KEY}', ${conditionRows.length} + ${scottishConditionRows.length} '${CONDITION_METRIC_KEY}'), period_end=${periodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
