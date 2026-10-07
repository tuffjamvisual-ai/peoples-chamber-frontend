#!/usr/bin/env node
// Import GB local authority population estimates (mid-2024) for the
// welfare explorer's Local Authority tier, mirroring
// import-welfare-population.js's constituency-level approach but at LA
// level, with one extra wrinkle confirmed by research before writing this:
//
// ENGLAND & WALES
// ───────────────
// Source: ONS population estimates via Nomis (NM_2014_1), geography
// TYPE424 ("local authorities: district / unitary, as of April 2023"),
// date=2024, GENDER=0, C_AGE=200, measures=20100. Confirmed via raw CSV:
// 318 rows, England + Wales only (no Scotland — same E&W-only limitation
// as at constituency level), GSS codes matching Stat-Xplore's LA valueset
// exactly (including the old Barnsley/Sheffield codes).
//
// SCOTLAND
// ────────
// NM_2014_1 excludes Scotland at LA level too, so Scotland must come from
// a second source — same NRS workbook already used for constituencies
// (special-area-tables-mid-2022-to-mid-2024), this time its "LAU1" sheet
// ("Population estimates by LAU 1, sex and single year of age,
// 2022-2024"), filtered to Sex="Persons" and Year=2024. Confirmed column
// layout: index 0 = name, index 1 = code (S30xxxxxx — NOT the S12xxxxxx
// codes Stat-Xplore uses), index 2 = sex, index 3 = year, index 4 = all
// ages total.
//
// THE S30 vs S12 MISMATCH
// ────────────────────────
// Confirmed via a live Stat-Xplore query: its LA valueset
// (V_C_MASTERGEOG21_LA_TO_REGION) uses S12xxxxxx for all 32 Scottish
// councils — a completely different code system from NRS's S30xxxxxx LAU1
// codes, not just a boundary-vintage difference. Scottish council names
// are stable (no reorganisation history like Barnsley/Sheffield), so this
// script fetches Stat-Xplore's own S12-coded Scottish LA list (name +
// code) directly and joins NRS's population figures to it by normalised
// name, rather than trying to use NRS's S30 codes as the key. Every one of
// the 32 must match exactly one Stat-Xplore S12 code, or the script
// aborts with nothing written.
//
// council_gss_code written here is therefore: Nomis's own GSS code for
// England & Wales, and Stat-Xplore's S12 code (via the name join) for
// Scotland — i.e. consistently the SAME codes every LA-level benefit
// import will also use, since those query Stat-Xplore directly.
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics (metric_key = 'population_mid_year').

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STAT_XPLORE_API_KEY = process.env.STAT_XPLORE_API_KEY;
if (!STAT_XPLORE_API_KEY) { console.error('STAT_XPLORE_API_KEY not set (.env.local)'); process.exit(1); }

const LIVE = process.argv.includes('--live');

const NOMIS_URL = 'https://www.nomisweb.co.uk/api/v01/dataset/NM_2014_1.data.csv?geography=TYPE424&date=2024&GENDER=0&C_AGE=200&measures=20100';
const NRS_URL = 'https://www.nrscotland.gov.uk/media/b33atzkp/special-area-tables-mid-2022-to-mid-2024-11-dz.xlsx';

const STAT_XPLORE_BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';
const STAT_XPLORE_DATABASE = 'str:database:hb_new';
const LA_VALUESET = 'str:valueset:hb_new:V_F_HB_NEW:COA_CODE:V_C_MASTERGEOG21_LA_TO_REGION';
const DATE_FIELD = 'str:field:hb_new:F_HB_NEW_DATE:NEW_DATE_NAME';
const MEASURE_COUNT = 'str:count:hb_new:V_F_HB_NEW';
const NON_GEOGRAPHIC_CODES = new Set(['XXZZZZZZZ', 'ZZXXXXXXX']); // "Abroad" / "Unknown" placeholders

const METRIC_KEY = 'population_mid_year';
const PERIOD_START = '2024-01-01';
const PERIOD_END = '2024-06-30';

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line).map((c) => c.trim());
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
}

async function fetchEnglandWales() {
  console.log(`Fetching England & Wales LA population from Nomis...\n  ${NOMIS_URL}`);
  const res = await fetch(NOMIS_URL);
  if (!res.ok) { const err = new Error(`Nomis fetch failed (${res.status})`); err.body = await res.text(); throw err; }
  const rows = parseCsv(await res.text());
  const map = new Map(); // code -> { value, name }
  for (const row of rows) {
    const code = row.GEOGRAPHY_CODE;
    const name = row.GEOGRAPHY_NAME;
    const value = Number(row.OBS_VALUE);
    if (!code || !Number.isFinite(value)) continue;
    map.set(code, { value, name });
  }
  console.log(`  Built E&W population map: ${map.size} local authorities.`);
  return map;
}

async function fetchScotlandNrsRows() {
  console.log(`\nFetching Scotland LAU1 population from NRS...\n  ${NRS_URL}`);
  const res = await fetch(NRS_URL);
  if (!res.ok) { const err = new Error(`NRS fetch failed (${res.status})`); err.body = await res.text(); throw err; }
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames.find((n) => /^lau1$/i.test(n) || /lau.?1/i.test(n));
  if (!sheetName) { console.error('Could not find an LAU1 sheet. Sheets found:', wb.SheetNames); process.exit(1); }
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false });
  const headerRowIndex = rows.findIndex((row) => row.some((c) => typeof c === 'string' && /LAU.?1.*Name/i.test(c)));
  if (headerRowIndex === -1) { console.error('Could not find the LAU1 header row.'); process.exit(1); }

  const nameMap = new Map(); // normalised name -> population value
  for (const row of rows.slice(headerRowIndex + 1)) {
    const name = row[0];
    const sex = row[2];
    const year = row[3];
    const value = Number(row[4]);
    if (!name || typeof name !== 'string') continue;
    if (String(sex).trim() !== 'Persons') continue;
    if (Number(year) !== 2024) continue;
    if (!Number.isFinite(value)) continue;
    nameMap.set(norm(name), { value, name });
  }
  // NRS splits North Ayrshire into two sub-area rows:
  //   "North Ayrshire Mainland" + "Arran and Cumbrae"
  // Stat-Xplore (and ONS) treat them as one LA: S12000021 "North Ayrshire".
  // Merge the two NRS rows into a single "North Ayrshire" entry.
  const mainlandKey = norm('North Ayrshire Mainland');
  const arranKey = norm('Arran and Cumbrae');
  const mainland = nameMap.get(mainlandKey);
  const arran = nameMap.get(arranKey);
  if (mainland && arran) {
    nameMap.set(norm('North Ayrshire'), { value: mainland.value + arran.value, name: 'North Ayrshire' });
    nameMap.delete(mainlandKey);
    nameMap.delete(arranKey);
    console.log(`  Merged NRS "North Ayrshire Mainland" (${mainland.value.toLocaleString()}) + "Arran and Cumbrae" (${arran.value.toLocaleString()}) → "North Ayrshire" (${(mainland.value + arran.value).toLocaleString()})`);
  }
  console.log(`  Built Scotland (NRS LAU1, Persons, 2024) map: ${nameMap.size} councils.`);
  return nameMap;
}

async function fetchStatXploreScottishCodes() {
  console.log('\nFetching Stat-Xplore\'s own Scottish LA codes (S12xxxxxx) for the name join...');
  async function schemaGet(id) {
    const r = await fetch(`${STAT_XPLORE_BASE}/schema/${encodeURIComponent(id)}`, { headers: { APIKey: STAT_XPLORE_API_KEY } });
    const t = await r.text();
    if (!r.ok) { const e = new Error(`/schema/${id} failed (${r.status})`); e.body = t; throw e; }
    return JSON.parse(t);
  }
  async function table(body) {
    const r = await fetch(`${STAT_XPLORE_BASE}/table`, { method: 'POST', headers: { APIKey: STAT_XPLORE_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const t = await r.text();
    if (!r.ok) { const e = new Error(`/table failed (${r.status})`); e.body = t; throw e; }
    return JSON.parse(t);
  }

  const dateFieldSchema = await schemaGet(DATE_FIELD);
  let sampleDateItem = dateFieldSchema.children?.[0];
  if (sampleDateItem?.id?.startsWith('str:valueset:')) {
    const vs = await schemaGet(sampleDateItem.id);
    sampleDateItem = vs.children[vs.children.length - 1];
  }
  const lastColon = sampleDateItem.id.lastIndexOf(':');
  const datePrefix = sampleDateItem.id.slice(0, lastColon + 1);
  let dateUri = null;
  for (let back = 0; back <= 12 && !dateUri; back++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - back);
    const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const candidate = `${datePrefix}${yyyymm}`;
    try {
      const data = await table({ database: STAT_XPLORE_DATABASE, measures: [MEASURE_COUNT], dimensions: [[DATE_FIELD]], recodes: { [DATE_FIELD]: { map: [[candidate]], total: false } } });
      if (data.cubes && data.cubes[MEASURE_COUNT]) dateUri = candidate;
    } catch { /* try earlier */ }
  }
  if (!dateUri) throw new Error('Could not find an available HB month for the Stat-Xplore LA list query.');

  const data = await table({
    database: STAT_XPLORE_DATABASE,
    measures: [MEASURE_COUNT],
    dimensions: [[LA_VALUESET], [DATE_FIELD]],
    recodes: { [DATE_FIELD]: { map: [[dateUri]], total: false } },
  });
  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === LA_VALUESET) || fields[0];
  const items = geoFieldResp.items || [];

  const scottish = [];
  for (const item of items) {
    const uri = item.uris ? item.uris[0] : item.uri;
    const code = uri ? uri.split(':').pop() : null;
    const label = item.labels ? item.labels[0] : item.label;
    if (code && /^S12/.test(code)) scottish.push({ code, label });
  }
  console.log(`  Found ${scottish.length} S12-coded Scottish councils in Stat-Xplore's LA valueset.`);
  return scottish;
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  const [ewMap, nrsScotland, statXploreScottish] = await Promise.all([
    fetchEnglandWales(),
    fetchScotlandNrsRows(),
    fetchStatXploreScottishCodes(),
  ]);

  console.log('\nJoining NRS Scotland population to Stat-Xplore S12 codes by normalised name...');
  const scotlandResults = [];
  const unmatchedNrs = [];
  for (const sx of statXploreScottish) {
    const nrsRow = nrsScotland.get(norm(sx.label));
    if (!nrsRow) { unmatchedNrs.push(sx); continue; }
    scotlandResults.push({ code: sx.code, name: sx.label, value: nrsRow.value });
  }
  const unmatchedStatXplore = statXploreScottish.filter((sx) => !nrsScotland.has(norm(sx.label)));
  const nrsNamesUsed = new Set(scotlandResults.map((r) => norm(r.name)));
  const unusedNrsNames = [...nrsScotland.keys()].filter((n) => !nrsNamesUsed.has(n));

  if (scotlandResults.length !== 32 || unusedNrsNames.length > 0) {
    console.error(`\nScotland name-join integrity check FAILED — ABORTING, nothing written.`);
    console.error(`  Matched: ${scotlandResults.length} (expected 32)`);
    console.error(`  Stat-Xplore Scottish codes with no NRS match: ${unmatchedStatXplore.length}`);
    unmatchedStatXplore.forEach((sx) => console.error(`    ${sx.code} — ${sx.label}`));
    console.error(`  NRS Scotland rows with no Stat-Xplore match: ${unusedNrsNames.length}`);
    unusedNrsNames.forEach((n) => console.error(`    (normalised) ${n}`));
    process.exit(1);
  }
  console.log(`  Matched all 32 Scottish councils by name.`);

  // E&W: just use Nomis's own GSS codes and names directly.
  const ewResults = [...ewMap.entries()].map(([code, { value, name }]) => ({ code, name, value }));
  console.log(`\nE&W: ${ewResults.length} local authorities from Nomis.`);

  const allResults = [...ewResults, ...scotlandResults];
  const dupeCodes = allResults.map((r) => r.code).filter((c, i, arr) => arr.indexOf(c) !== i);
  if (dupeCodes.length > 0) {
    console.error(`\nDuplicate council_gss_code values found across E&W + Scotland — ABORTING: ${dupeCodes.join(', ')}`);
    process.exit(1);
  }

  console.log(`\nTotal GB local authorities: ${allResults.length} (expected 350).`);
  if (allResults.length !== 350) {
    console.error(`WARNING: expected exactly 350 local authorities (296 England + 22 Wales + 32 Scotland), got ${allResults.length}. Review before trusting this further.`);
  }
  const totalPop = allResults.reduce((s, r) => s + r.value, 0);
  console.log(`Sum of all local authority populations: ${totalPop.toLocaleString()}`);
  console.log('First 5 results:');
  allResults.slice(0, 5).forEach((r) => console.log(`  ${r.code} (${r.name}): ${r.value.toLocaleString()}`));
  console.log('Sample Scotland results:');
  scotlandResults.slice(0, 5).forEach((r) => console.log(`  ${r.code} (${r.name}): ${r.value.toLocaleString()}`));

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  console.log('\nWriting welfare_source_releases rows...');
  const { data: ewRelease, error: ewRelErr } = await supabase
    .from('welfare_source_releases')
    .insert({
      source_name: 'ons_nomis_population_mid2024_la_ew',
      dataset_id: 'NM_2014_1',
      source_url: NOMIS_URL,
      release_date: PERIOD_END,
      reference_period_start: PERIOD_START,
      reference_period_end: PERIOD_END,
      retrieved_at: new Date().toISOString(),
      notes: 'ONS population estimates by local authority (district/unitary, April 2023 boundaries), England & Wales, mid-2024, via Nomis.',
    })
    .select()
    .single();
  if (ewRelErr) { console.error('Failed to insert E&W source release:', ewRelErr.message); process.exit(1); }
  console.log(`  Inserted E&W source release id ${ewRelease.id}`);

  const { data: scotRelease, error: scotRelErr } = await supabase
    .from('welfare_source_releases')
    .insert({
      source_name: 'nrs_population_mid2024_scotland_la',
      dataset_id: 'other-geographies-mid-2022-to-mid-2024-lau1',
      source_url: NRS_URL,
      release_date: PERIOD_END,
      reference_period_start: PERIOD_START,
      reference_period_end: PERIOD_END,
      retrieved_at: new Date().toISOString(),
      notes: 'National Records of Scotland LAU1 population estimates by council area, mid-2024, joined to Stat-Xplore S12 codes by normalised council name (NRS uses S30xxxxxx LAU1 codes internally).',
    })
    .select()
    .single();
  if (scotRelErr) { console.error('Failed to insert Scotland source release:', scotRelErr.message); process.exit(1); }
  console.log(`  Inserted Scotland source release id ${scotRelease.id}`);

  const ewCodes = new Set(ewResults.map((r) => r.code));
  const metricRows = allResults.map((r) => ({
    council_gss_code: r.code,
    council_name: r.name,
    metric_key: METRIC_KEY,
    value: r.value,
    unit: 'people',
    period_start: PERIOD_START,
    period_end: PERIOD_END,
    source_release_id: ewCodes.has(r.code) ? ewRelease.id : scotRelease.id,
    status: 'ok',
    metadata_json: {
      source: ewCodes.has(r.code) ? 'ons_via_nomis' : 'nrs_lau1_name_joined',
    },
  }));

  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < metricRows.length; i += BATCH_SIZE) {
    const batch = metricRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_local_authority_metrics')
      .upsert(batch, { onConflict: 'council_gss_code,metric_key,period_end' });
    if (upsertErr) { console.error('Failed to upsert metrics batch:', upsertErr.message); process.exit(1); }
    written += batch.length;
    console.log(`  Upserted ${written}/${metricRows.length}`);
  }

  console.log(`\nDone. ${written} rows written for metric_key='${METRIC_KEY}', period_end=${PERIOD_END}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
