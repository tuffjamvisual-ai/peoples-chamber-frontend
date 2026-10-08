#!/usr/bin/env node
// Import the LCWRA (Limited Capability for Work and Work-Related
// Activity) share of the Universal Credit health caseload, by
// Westminster Parliamentary Constituency, from DWP Stat-Xplore's
// UC_WCA_CASE ("UC Health Caseload") database.
//
// WHAT THIS IS
// ────────────
// UC claimants who report a health condition go through a Work
// Capability Assessment (WCA). Two outcomes carry no work-search
// requirements:
//   - LCW   (Limited Capability for Work)
//   - LCWRA (Limited Capability for Work and Work-Related Activity —
//            the more severe outcome; no work-related requirements at
//            all, equivalent to the old ESA Support Group)
// "LCWRA ratio" = LCWRA claimants / (LCW + LCWRA claimants) at each
// constituency — the share of the assessed UC health caseload found to
// have the more severe outcome.
//
// FIELDS — CONFIRMED VIA RAW STAT-XPLORE SCHEMA EVIDENCE
// ────────────────────────────────────────────────────────
// Database: str:database:UC_WCA_CASE ("UC Health Caseload")
// Stage field: str:field:UC_WCA_CASE:V_F_UC_WCA_CASE:STAGE_CODE
//   values: 1=Live fit note (pre-WCA), 2=LCW, 3=LCWRA
//   (we only request 2 and 3 — stage 1 is pre-assessment, not an outcome)
// Geography field: str:field:UC_WCA_CASE:V_F_UC_WCA_CASE:PCON24
//   ("Westminster Parliamentary Constituency")
//   constituency valueset: V_C_MASTERGEOG21_PARLC24_TO_REGION, with
//   value IDs built directly as <prefix><GSS code> — confirmed via a
//   raw test query for Stevenage (E14001516) and cross-checked against
//   a Scottish constituency (S14000094, Inverness, Skye and West
//   Ross-shire) to confirm Scotland is in scope (see below).
// Date field: str:field:UC_WCA_CASE:F_UC_WCA_MONTH:DATE_NAME
//
// SCOTLAND IS IN SCOPE — unlike PIP/DLA/Carer's Allowance
// ───────────────────────────────────────────────────────
// Universal Credit (and its WCA) is NOT devolved to Scotland — it
// remains a DWP/UK-wide benefit. Confirmed via a raw test query against
// a genuine Scottish constituency (S14000094) before writing this
// script: real, non-zero counts were returned (LCW=658, LCWRA=4,317,
// Jun-26). So this script covers the full ~650-constituency GB set in
// one pass — no scope='partial' branching, no Scotland exclusion rows,
// unlike import-welfare-pip-detail.js.
//
// LOCAL AUTHORITY TIER — NOT YET BUILT
// ─────────────────────────────────────
// The same UC_WCA_CASE database also has a geography field for
// "National - Regional - LA - OAs" (str:field:UC_WCA_CASE:V_F_UC_WCA_CASE:COA_CODE),
// but that field's valuesets need to be drilled further to find the
// LA-level (as opposed to Output Area-level) rollup before an LA import
// can be built. Deliberately out of scope for this script — constituency
// only, matching how PIP detail was done first before its LA equivalent.
//
// WHAT GETS WRITTEN
// ──────────────────
// metric_key='uc_lcwra_claimants': value = LCWRA claimant count.
// metadata_json carries the LCW count, the combined assessed total, and
// the computed lcwra_ratio_percent, for full transparency (not just the
// headline LCWRA figure) — same pattern as pip_motability_enhanced_claimants.
//
// INTEGRITY CHECK — same as every other import-welfare-*.js script:
// requested GSS codes must come back in the same order, unmismatched.
// Any mismatch aborts with nothing written.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics.

'use strict';
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STAT_XPLORE_API_KEY = process.env.STAT_XPLORE_API_KEY;
if (!STAT_XPLORE_API_KEY) { console.error('STAT_XPLORE_API_KEY not set (.env.local)'); process.exit(1); }

const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';
const DATABASE = 'str:database:UC_WCA_CASE';
const MEASURE = 'str:count:UC_WCA_CASE:V_F_UC_WCA_CASE';

const STAGE_FIELD = 'str:field:UC_WCA_CASE:V_F_UC_WCA_CASE:STAGE_CODE';
const STAGE_VALUESET_PREFIX = 'str:value:UC_WCA_CASE:V_F_UC_WCA_CASE:STAGE_CODE:C_UC_WCA_STAGE:';
const STAGE_CATEGORIES = [
  { suffix: '2', label: 'LCW' },
  { suffix: '3', label: 'LCWRA' },
];

const METRIC_KEY = 'uc_lcwra_claimants';
const SOURCE_NAME = 'dwp_statxplore_uc_wca_case_monthly';

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

// Runs a [stage, geography, date] query for all gssCodes and returns,
// per constituency, [lcwCount, lcwraCount].
async function queryLcwra(geoField, geoUriPrefix, dateField, dateUri, gssCodes) {
  console.log(`\nRequesting LCW/LCWRA breakdown for ${gssCodes.length} constituencies...`);
  const geoMap = gssCodes.map((code) => [`${geoUriPrefix}${code}`]);
  const stageMap = STAGE_CATEGORIES.map((c) => [`${STAGE_VALUESET_PREFIX}${c.suffix}`]);
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE],
    dimensions: [[STAGE_FIELD], [geoField.id], [dateField.id]],
    recodes: {
      [STAGE_FIELD]: { map: stageMap, total: false },
      [geoField.id]: { map: geoMap, total: false },
      [dateField.id]: { map: [[dateUri]], total: false },
    },
  });

  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === geoField.id);
  const cube = data.cubes && data.cubes[MEASURE];
  if (!geoFieldResp || !cube || !Array.isArray(cube.values)) {
    console.error('LCWRA query: response missing expected field or cube — aborting.');
    console.error('Cube keys returned:', data.cubes ? Object.keys(data.cubes) : 'none');
    process.exit(1);
  }

  const returnedItems = geoFieldResp.items || [];
  if (returnedItems.length !== gssCodes.length) {
    console.error(`LCWRA query: mismatch — requested ${gssCodes.length}, got ${returnedItems.length} back. Aborting.`);
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
    // cube.values[stageIdx][geoIdx][dateIdx] — dimensions requested in
    // order [stage, geo, date], confirmed via the raw 2-constituency
    // test queries run before this script was written.
    const lcw = cube.values[0] && cube.values[0][i] && cube.values[0][i][0];
    const lcwra = cube.values[1] && cube.values[1][i] && cube.values[1][i][0];
    results.push({
      gss_code: expectedCode,
      lcw: typeof lcw === 'number' ? lcw : 0,
      lcwra: typeof lcwra === 'number' ? lcwra : 0,
    });
  }

  if (mismatches.length > 0) {
    console.error(`LCWRA query: ${mismatches.length} ordering mismatch(es) — ABORTING ENTIRE SCRIPT, nothing written.`);
    console.error(JSON.stringify(mismatches.slice(0, 5), null, 2));
    process.exit(1);
  }

  console.log(`LCWRA query: integrity check passed, all ${results.length} items matched in order.`);
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
  const gssCodes = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  console.log(`Found ${gssCodes.length} distinct constituency GSS codes. Unlike PIP/DLA/Carer's Allowance, UC (and its WCA) is not devolved to Scotland, so all ${gssCodes.length} are requested in one pass.`);

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
  const periodEnd = lastDayOfMonth(year, month);
  const periodStart = `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`;
  console.log(`Using period ${yyyymm} (period_end=${periodEnd}).`);

  const results = await queryLcwra(geoField, valueset.uriPrefix, dateField, dateUri, gssCodes);

  console.log('\nFirst 3 constituencies:');
  results.slice(0, 3).forEach((r) => {
    const total = r.lcw + r.lcwra;
    const ratio = total > 0 ? ((r.lcwra / total) * 100).toFixed(1) : 'n/a';
    console.log(`  ${r.gss_code}: LCW=${r.lcw}, LCWRA=${r.lcwra}, total=${total}, LCWRA ratio=${ratio}%`);
  });

  const zeroTotalCount = results.filter((r) => r.lcw + r.lcwra === 0).length;
  if (zeroTotalCount > 0) {
    console.log(`\n${zeroTotalCount} constituencies have a zero combined LCW+LCWRA total (will be written with status='suppressed', ratio null) — small-cell suppression is expected at this geography for some constituencies.`);
  }

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
      notes: `UC Health Caseload — LCW and LCWRA counts by Westminster Parliamentary Constituency, ${yyyymm}. Covers all GB constituencies (UC is not devolved to Scotland).`,
    })
    .select()
    .single();
  if (releaseErr) { console.error('Failed to insert source release:', releaseErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${releaseRow.id}`);

  const rows = results.map((r) => {
    const total = r.lcw + r.lcwra;
    const suppressed = total === 0;
    return {
      constituency_gss_code: r.gss_code,
      metric_key: METRIC_KEY,
      value: suppressed ? null : r.lcwra,
      unit: 'people',
      period_start: periodStart,
      period_end: periodEnd,
      source_release_id: releaseRow.id,
      status: suppressed ? 'suppressed' : 'ok',
      metadata_json: suppressed
        ? {
            reason: 'zero_or_suppressed_combined_total',
            note: 'Combined LCW+LCWRA total was zero at this constituency for this period — likely small-cell suppression by DWP rather than a genuine zero caseload.',
          }
        : {
            note: "value = LCWRA (Limited Capability for Work and Work-Related Activity) claimant count — the more severe Work Capability Assessment outcome, carrying no work-related requirements. lcwra_ratio_percent = LCWRA / (LCW + LCWRA), the share of the assessed UC health caseload with the more severe outcome.",
            lcw: r.lcw,
            lcwra: r.lcwra,
            combined_total: total,
            lcwra_ratio_percent: (r.lcwra / total) * 100,
          },
    };
  });

  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_constituency_metrics')
      .upsert(batch, { onConflict: 'constituency_gss_code,metric_key,period_end' });
    if (upsertErr) { console.error('Failed to upsert metrics batch:', upsertErr.message); process.exit(1); }
    written += batch.length;
    console.log(`  Upserted ${written}/${rows.length}`);
  }

  console.log(`\nDone. ${written} rows written for metric_key='${METRIC_KEY}', period_end=${periodEnd} (${zeroTotalCount} suppressed).`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
