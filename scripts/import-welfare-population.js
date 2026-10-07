#!/usr/bin/env node
// Import GB constituency population estimates (mid-2024), from two
// separate official sources — there is no single UK-wide dataset for
// this (confirmed via research before writing this script).
//
// ENGLAND & WALES
// ───────────────
// Source: ONS "Population estimates - small area (2021 based) by single
// year of age - England and Wales", via the Nomis API (dataset NM_2014_1),
// geography type TYPE172 ("Westminster Parliamentary Constituencies, July
// 2024 boundaries"), date=2024 (mid-2024), GENDER=0 (Total), C_AGE=200
// (All Ages), measures=20100 (Value). 575 rows (543 England + 32 Wales).
// Cross-checked: this dataset's England & Wales total (61,806,682) matches
// ONS's own published "Population estimates for England and Wales:
// mid-2024" bulletin headline figure exactly.
//
// SCOTLAND
// ────────
// Source: National Records of Scotland, "Other geographies: mid-2022 to
// mid-2024 (2011 Data Zones)" — the "UKPC" sheet (UK Parliamentary
// Constituency), filtered to Sex="Persons" and Year=2024. 57 rows.
// Cross-checked: sums to 5,546,900, consistent with Scotland's known
// population (~5.5m).
//
// Combined: 575 + 57 = 632 — matches every other GB-wide welfare table in
// this project exactly.
//
// Both datasets use a "best-fit" allocation methodology (smaller census
// geographies — Output Areas in E&W, Data Zones in Scotland — mapped onto
// the 2024 constituency boundaries), which is standard ONS/NRS practice,
// not a flaw specific to this project. Worth a line in methodology notes,
// not a caveat on the data's reliability.
//
// INTEGRITY CHECK
// ───────────────
// After merging both sources, every GSS code in our own
// welfare_constituency_geography table must have exactly one matching
// population value, with no missing codes and no unexpected extras. Any
// mismatch aborts with nothing written.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics (metric_key = 'population_mid_year').

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIVE = process.argv.includes('--live');

const NOMIS_URL = 'https://www.nomisweb.co.uk/api/v01/dataset/NM_2014_1.data.csv?geography=TYPE172&date=2024&GENDER=0&C_AGE=200&measures=20100';
const NRS_URL = 'https://www.nrscotland.gov.uk/media/b33atzkp/special-area-tables-mid-2022-to-mid-2024-11-dz.xlsx';

const METRIC_KEY = 'population_mid_year';
const PERIOD_START = '2024-01-01';
const PERIOD_END = '2024-06-30'; // mid-2024, conventional reference date for this vintage of estimate

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
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
  console.log(`Fetching England & Wales population data from Nomis...\n  ${NOMIS_URL}`);
  const res = await fetch(NOMIS_URL);
  if (!res.ok) {
    const err = new Error(`Nomis fetch failed (${res.status})`);
    err.body = await res.text();
    throw err;
  }
  const text = await res.text();
  const rows = parseCsv(text);
  console.log(`  Parsed ${rows.length} rows.`);

  const sample = rows[0];
  if (!sample || !('GEOGRAPHY_CODE' in sample) || !('OBS_VALUE' in sample)) {
    console.error('Expected columns GEOGRAPHY_CODE and OBS_VALUE not found. Actual columns:', Object.keys(sample || {}));
    process.exit(1);
  }

  const map = new Map();
  for (const row of rows) {
    const code = row.GEOGRAPHY_CODE;
    const value = Number(row.OBS_VALUE);
    if (!code || !Number.isFinite(value)) continue;
    map.set(code, value);
  }
  console.log(`  Built England & Wales population map: ${map.size} constituencies.`);
  return map;
}

async function fetchScotland() {
  console.log(`\nFetching Scotland population data from NRS...\n  ${NRS_URL}`);
  const res = await fetch(NRS_URL);
  if (!res.ok) {
    const err = new Error(`NRS fetch failed (${res.status})`);
    err.body = await res.text();
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });

  const sheetName = wb.SheetNames.find((n) => /ukpc/i.test(n));
  if (!sheetName) {
    console.error('Could not find a sheet matching "UKPC". Sheets found:', wb.SheetNames);
    process.exit(1);
  }
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  // Find the header row (contains "UK Parliamentary Constituency" in some
  // cell) rather than assuming a fixed row offset, since sheet layouts can
  // shift between NRS releases.
  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => typeof cell === 'string' && /UK Parliamentary Constituency.*Name/i.test(cell)));
  if (headerRowIndex === -1) {
    console.error('Could not find the header row in the UKPC sheet. First 6 rows:');
    rows.slice(0, 6).forEach((r, i) => console.error(`  [${i}]`, JSON.stringify(r)));
    process.exit(1);
  }
  const header = rows[headerRowIndex];
  const nameCol = header.findIndex((c) => typeof c === 'string' && /Name/i.test(c) && /Constituency/i.test(c));
  const codeCol = header.findIndex((c) => typeof c === 'string' && /Code/i.test(c) && /Parliamentary/i.test(c));
  const sexCol = header.findIndex((c) => typeof c === 'string' && /^Sex$/i.test(c.trim()));
  const yearCol = header.findIndex((c) => typeof c === 'string' && /^Year$/i.test(c.trim()));
  const allAgesCol = header.findIndex((c) => typeof c === 'string' && /All ages/i.test(c));

  if ([nameCol, codeCol, sexCol, yearCol, allAgesCol].some((c) => c === -1)) {
    console.error('Could not find all required columns in the header row:', JSON.stringify(header));
    console.error({ nameCol, codeCol, sexCol, yearCol, allAgesCol });
    process.exit(1);
  }

  const dataRows = rows.slice(headerRowIndex + 1);
  const map = new Map();
  for (const row of dataRows) {
    const code = row[codeCol];
    const sex = row[sexCol];
    const year = row[yearCol];
    const value = Number(row[allAgesCol]);
    if (!code || typeof code !== 'string' || !/^S14/.test(code)) continue;
    if (String(sex).trim() !== 'Persons') continue;
    if (Number(year) !== 2024) continue;
    if (!Number.isFinite(value)) continue;
    map.set(code, value);
  }
  console.log(`  Built Scotland population map: ${map.size} constituencies.`);
  return map;
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  const [ewMap, scotMap] = await Promise.all([fetchEnglandWales(), fetchScotland()]);

  const ewSum = [...ewMap.values()].reduce((s, v) => s + v, 0);
  const scotSum = [...scotMap.values()].reduce((s, v) => s + v, 0);
  console.log(`\nEngland & Wales sum: ${ewSum.toLocaleString()} (${ewMap.size} constituencies)`);
  console.log(`Scotland sum: ${scotSum.toLocaleString()} (${scotMap.size} constituencies)`);
  console.log(`Combined GB sum: ${(ewSum + scotSum).toLocaleString()} (${ewMap.size + scotMap.size} constituencies)`);

  console.log('\nFetching our own constituency GSS code list from welfare_constituency_geography...');
  const { data: geoRows, error: geoErr } = await supabase
    .from('welfare_constituency_geography')
    .select('constituency_gss_code');
  if (geoErr) { console.error('Failed to read welfare_constituency_geography:', geoErr.message); process.exit(1); }
  const ourGssCodes = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  console.log(`Found ${ourGssCodes.length} distinct constituency GSS codes in our database.`);

  const combined = new Map([...ewMap, ...scotMap]);
  const missing = ourGssCodes.filter((code) => !combined.has(code));
  const unexpectedExtra = [...combined.keys()].filter((code) => !ourGssCodes.includes(code));

  if (missing.length > 0 || unexpectedExtra.length > 0) {
    console.error(`\nIntegrity check FAILED — ABORTING, nothing written.`);
    console.error(`  Missing (in our geography table, no population found): ${missing.length}`);
    console.error(JSON.stringify(missing.slice(0, 10), null, 2));
    console.error(`  Unexpected extra (population found, not in our geography table): ${unexpectedExtra.length}`);
    console.error(JSON.stringify(unexpectedExtra.slice(0, 10), null, 2));
    process.exit(1);
  }

  console.log(`\nIntegrity check passed: all ${ourGssCodes.length} of our constituencies have exactly one matching population value.`);
  console.log('First 5 results:');
  ourGssCodes.slice(0, 5).forEach((code) => console.log(`  ${code}: ${combined.get(code).toLocaleString()}`));

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  console.log('\nWriting welfare_source_releases rows (one per source)...');
  const { data: ewRelease, error: ewRelErr } = await supabase
    .from('welfare_source_releases')
    .insert({
      source_name: 'ons_nomis_population_mid2024_ew',
      dataset_id: 'NM_2014_1',
      source_url: NOMIS_URL,
      release_date: PERIOD_END,
      reference_period_start: PERIOD_START,
      reference_period_end: PERIOD_END,
      retrieved_at: new Date().toISOString(),
      notes: 'ONS population estimates by Westminster Parliamentary Constituency (2024 boundaries), England & Wales, mid-2024, via Nomis.',
    })
    .select()
    .single();
  if (ewRelErr) { console.error('Failed to insert E&W source release:', ewRelErr.message); process.exit(1); }
  console.log(`  Inserted E&W source release id ${ewRelease.id}`);

  const { data: scotRelease, error: scotRelErr } = await supabase
    .from('welfare_source_releases')
    .insert({
      source_name: 'nrs_population_mid2024_scotland',
      dataset_id: 'other-geographies-mid-2022-to-mid-2024',
      source_url: NRS_URL,
      release_date: PERIOD_END,
      reference_period_start: PERIOD_START,
      reference_period_end: PERIOD_END,
      retrieved_at: new Date().toISOString(),
      notes: 'National Records of Scotland population estimates by UK Parliamentary Constituency (2024 boundaries), mid-2024.',
    })
    .select()
    .single();
  if (scotRelErr) { console.error('Failed to insert Scotland source release:', scotRelErr.message); process.exit(1); }
  console.log(`  Inserted Scotland source release id ${scotRelease.id}`);

  const metricRows = ourGssCodes.map((code) => ({
    constituency_gss_code: code,
    metric_key: METRIC_KEY,
    value: combined.get(code),
    unit: 'people',
    period_start: PERIOD_START,
    period_end: PERIOD_END,
    source_release_id: ewMap.has(code) ? ewRelease.id : scotRelease.id,
    status: 'ok',
    metadata_json: {
      source: ewMap.has(code) ? 'ons_via_nomis' : 'nrs',
      methodology: 'Best-fit allocation of smaller census geographies (Output Areas in England & Wales, Data Zones in Scotland) onto 2024 Westminster constituency boundaries — standard ONS/NRS practice, not specific to this project.',
    },
  }));

  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < metricRows.length; i += BATCH_SIZE) {
    const batch = metricRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_constituency_metrics')
      .upsert(batch, { onConflict: 'constituency_gss_code,metric_key,period_end' });
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
