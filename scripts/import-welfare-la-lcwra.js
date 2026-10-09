#!/usr/bin/env node
// Import the LCWRA (Limited Capability for Work and Work-Related
// Activity) share of the Universal Credit health caseload, by LOCAL
// AUTHORITY, from DWP Stat-Xplore's UC_WCA_CASE ("UC Health Caseload")
// database. LA-tier companion to import-welfare-lcwra.js (constituency
// tier) — see that script's header for the full definition of
// LCW/LCWRA and why "LCWRA ratio" matters.
//
// GEOGRAPHY — VALUESET-AS-DIMENSION (no recode), same shape as
// import-welfare-la-pip.js / import-welfare-la-hb.js
// ──────────────────────────────────────────────────────────────────
// Unlike the constituency-tier script (which recodes the geography
// dimension to our own known GSS code list), the LA-level "Local
// Authority" valueset under COA_CODE is used directly as a query
// dimension with no recode. Stat-Xplore then returns every local
// authority in GB in one response — no need to enumerate our own code
// list first, and no 100-item schema-browse pagination cap (that cap
// only applies to browsing the schema, not querying the table).
//
// FIELDS — CONFIRMED VIA RAW STAT-XPLORE SCHEMA EVIDENCE + A LIVE TEST
// QUERY FOR CHESTERFIELD (E07000034) BEFORE WRITING THIS SCRIPT
// ──────────────────────────────────────────────────────────────────
// Database: str:database:UC_WCA_CASE ("UC Health Caseload")
// Stage field: str:field:UC_WCA_CASE:V_F_UC_WCA_CASE:STAGE_CODE
//   values: 1=Live fit note (pre-WCA), 2=LCW, 3=LCWRA (only 2 and 3 requested)
// Geography field: str:field:UC_WCA_CASE:V_F_UC_WCA_CASE:COA_CODE
//   ("National - Regional - LA - OAs"), "Local Authority" valueset:
//   V_C_MASTERGEOG21_LA_TO_REGION — confirmed via live test query for
//   Chesterfield (E07000034): LCW=926, LCWRA=5,757, ratio=86.1%
//   (Jun-26), geography field correctly echoed back
//   ".../COA_CODE:V_C_MASTERGEOG21_LA_TO_REGION:E07000034" → "Chesterfield".
// Date field: str:field:UC_WCA_CASE:F_UC_WCA_MONTH:DATE_NAME
//
// SCOTLAND IS IN SCOPE — same as the constituency tier, unlike this
// database's PIP/DLA/Carer's Allowance LA scripts
// ──────────────────────────────────────────────────────────────────
// Universal Credit (and its WCA) is NOT devolved to Scotland, so this
// script covers all ~350 GB local authorities in one pass — no
// Scotland-exclusion branch, no status='unavailable' rows.
//
// WHAT GETS WRITTEN
// ──────────────────
// metric_key='uc_lcwra_claimants' in welfare_local_authority_metrics,
// keyed by council_gss_code. value = LCWRA claimant count.
// metadata_json carries the LCW count, the combined assessed total,
// and the computed lcwra_ratio_percent — same shape as the
// constituency-tier script, so the UI's lcwraText() helper (already
// built for the constituency component) can be reused as-is for the
// local-authority component.
//
// INTEGRITY CHECKS
// ─────────────────
// - Any returned geography code with an unexpected shape (not
//   /^[EWS]\d{8}$/, excluding known non-geographic placeholder codes)
//   aborts the entire script with nothing written.
// - Expects exactly 350 valid local authorities back; a mismatch is
//   logged as a WARNING (not an abort) — same tolerance as
//   import-welfare-la-median-wage.js, since LA boundary counts have
//   shifted before (e.g. the 2025 reorganisations) without being a
//   data-quality problem.
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics.

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

const COA_FIELD = 'str:field:UC_WCA_CASE:V_F_UC_WCA_CASE:COA_CODE';
const DATE_FIELD = 'str:field:UC_WCA_CASE:F_UC_WCA_MONTH:DATE_NAME';

const METRIC_KEY = 'uc_lcwra_claimants';
const SOURCE_NAME = 'dwp_statxplore_uc_wca_case_monthly_la';

const NON_GEOGRAPHIC_CODES = new Set(['XXZZZZZZZ', 'ZZXXXXXXX']);
const GB_LA_CODE_SHAPE = /^[EWS]\d{8}$/;

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
        measures: [MEASURE],
        dimensions: [[dateFieldId]],
        recodes: { [dateFieldId]: { map: [[dateUri]], total: false } },
      });
      if (data.cubes && data.cubes[MEASURE]) {
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
  const periodStart = `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`;

  console.log(`\nQuerying all local authorities for ${yyyymm} (valueset-as-dimension, no recode on geography)...`);
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE],
    dimensions: [[STAGE_FIELD], [laValueset], [DATE_FIELD]],
    recodes: {
      [STAGE_FIELD]: { map: STAGE_CATEGORIES.map((c) => [`${STAGE_VALUESET_PREFIX}${c.suffix}`]), total: false },
      [DATE_FIELD]: { map: [[dateUri]], total: false },
    },
  });

  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === laValueset);
  const cube = data.cubes && data.cubes[MEASURE];
  if (!geoFieldResp || !cube || !Array.isArray(cube.values)) {
    console.error('Response missing expected field or cube — aborting.');
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
    if (!code || NON_GEOGRAPHIC_CODES.has(code)) continue;
    if (!GB_LA_CODE_SHAPE.test(code)) { unexpected.push({ code, label }); continue; }
    // dimensions requested in order [stage, geo, date] — cube.values[stageIdx][geoIdx][dateIdx],
    // same indexing confirmed live for the constituency-tier script and re-confirmed via the
    // single-LA test query (test-la-lcwra.js) before this script was written.
    const lcw = cube.values[0] && cube.values[0][i] && cube.values[0][i][0];
    const lcwra = cube.values[1] && cube.values[1][i] && cube.values[1][i][0];
    results.push({
      code,
      name: label,
      lcw: typeof lcw === 'number' ? lcw : 0,
      lcwra: typeof lcwra === 'number' ? lcwra : 0,
    });
  }

  if (unexpected.length > 0) {
    console.error(`\n${unexpected.length} item(s) with an unexpected code shape — ABORTING, nothing written.`);
    console.error(JSON.stringify(unexpected.slice(0, 10), null, 2));
    process.exit(1);
  }

  console.log(`\nLocal authorities parsed: ${results.length} (expected 350 — England 296, Wales 22, Scotland 32).`);
  if (results.length !== 350) {
    console.warn(`WARNING: expected 350 local authorities, got ${results.length}. Review before proceeding.`);
  }

  console.log('\nFirst 3 results:');
  results.slice(0, 3).forEach((r) => {
    const total = r.lcw + r.lcwra;
    const ratio = total > 0 ? ((r.lcwra / total) * 100).toFixed(1) : 'n/a';
    console.log(`  ${r.code} (${r.name}): LCW=${r.lcw}, LCWRA=${r.lcwra}, total=${total}, LCWRA ratio=${ratio}%`);
  });

  console.log('\nSample Scotland results:');
  results.filter((r) => r.code.startsWith('S12')).slice(0, 3).forEach((r) => {
    const total = r.lcw + r.lcwra;
    const ratio = total > 0 ? ((r.lcwra / total) * 100).toFixed(1) : 'n/a';
    console.log(`  ${r.code} (${r.name}): LCW=${r.lcw}, LCWRA=${r.lcwra}, total=${total}, LCWRA ratio=${ratio}%`);
  });

  const zeroTotalCount = results.filter((r) => r.lcw + r.lcwra === 0).length;
  if (zeroTotalCount > 0) {
    console.log(`\n${zeroTotalCount} local authorities have a zero combined LCW+LCWRA total (will be written with status='suppressed', ratio null).`);
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
      notes: `UC Health Caseload — LCW and LCWRA counts by local authority, ${yyyymm}. Covers all GB local authorities (UC is not devolved to Scotland).`,
    })
    .select()
    .single();
  if (releaseErr) { console.error('Failed to insert source release:', releaseErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${releaseRow.id}`);

  const rows = results.map((r) => {
    const total = r.lcw + r.lcwra;
    const suppressed = total === 0;
    return {
      council_gss_code: r.code,
      council_name: r.name,
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
            note: 'Combined LCW+LCWRA total was zero at this local authority for this period — likely small-cell suppression by DWP rather than a genuine zero caseload.',
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
      .from('welfare_local_authority_metrics')
      .upsert(batch, { onConflict: 'council_gss_code,metric_key,period_end' });
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
