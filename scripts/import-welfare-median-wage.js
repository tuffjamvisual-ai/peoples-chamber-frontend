#!/usr/bin/env node
// Import GB constituency median gross annual pay (full-time employees,
// WORKPLACE-based), for comparison against the per-resident benefits
// figures.
//
// This matches TPA's own documented methodology exactly (extracted from
// the live "Dashboard Information" panel at benefitsdata.uk/mybill):
// "The wage figure is the median gross annual pay for full-time employees
// working in the location. It is sourced from the latest available Nomis
// earnings-by-workplace data (table NM_99)... As this is workplace-based
// data, it reflects the earnings of people who work in the location,
// regardless of where they live."
//
// SOURCE
// ──────
// Nomis dataset NM_99_1 — "annual survey of hours and earnings - workplace
// analysis" (confirmed via raw Nomis metadata response: dataset name field
// verbatim is "annual survey of hours and earnings - workplace analysis").
// This is the WORKPLACE cut of ASHE, not NM_30_1 (the residence-based
// variant) — deliberately matching TPA's documented source.
//
// Geography: TYPE172 (Westminster Parliamentary Constituencies, July
// 2024 boundaries) — confirmed via raw CSV: GEOGRAPHY_TYPE="Westminster
// Parliamentary Constituencies (July 2024)", 632 rows (543 England + 57
// Scotland + 32 Wales), no Northern Ireland codes present.
//
// Parameters (confirmed via raw Nomis codelist response, not guessed):
//   sex=8      → "Full Time Workers"
//   pay=7      → "Annual pay - gross"
//   item=2     → "Median"
//   measures=20100 → "Value"
//   date=latest → DATE_NAME returned as "2025" (April 2025 ASHE survey,
//                 the conventional reference week for this release)
//
// SUPPRESSED VALUES
// ─────────────────
// 4 of 632 constituencies are suppressed by ONS as statistically
// unreliable (OBS_STATUS_NAME = "These figures are suppressed as
// statistically unreliable", OBS_VALUE empty): E14001110 (Bolton North
// East), E14001167 (Chingford and Woodford Green), E14001303 (Isle of
// Wight East), E14001527 (Streatham and Croydon North). These are written
// with status='suppressed', value=null — same pattern used elsewhere in
// this project for genuine data gaps (e.g. Scotland's devolved-benefit
// rows), not silently dropped or estimated.
//
// INTEGRITY CHECK
// ───────────────
// Every GSS code in our own welfare_constituency_geography table must
// have exactly one matching row in the Nomis response (either a numeric
// value or an explicit suppression) — no missing codes, no unexpected
// extras. Any mismatch aborts with nothing written.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics (metric_key = 'median_annual_pay_workplace').

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIVE = process.argv.includes('--live');

const NOMIS_URL = 'https://www.nomisweb.co.uk/api/v01/dataset/NM_99_1.data.csv?geography=TYPE172&date=latest&sex=8&pay=7&item=2&measures=20100';
const DATASET_ID = 'NM_99_1';
const METRIC_KEY = 'median_annual_pay_workplace';
const SOURCE_NAME = 'ons_nomis_ashe_workplace_annual';

// April 2025 ASHE reference week — the conventional reference date for
// this release vintage (DATE_NAME returned by Nomis as plain year "2025").
const PERIOD_START = '2025-04-01';
const PERIOD_END = '2025-04-30';

const SUPPRESSED_STATUS_TEXT = 'These figures are suppressed as statistically unreliable';

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

async function fetchMedianWage() {
  console.log(`Fetching median gross annual pay (workplace, full-time) from Nomis...\n  ${NOMIS_URL}`);
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
  if (!sample || !('GEOGRAPHY_CODE' in sample) || !('OBS_VALUE' in sample) || !('OBS_STATUS_NAME' in sample)) {
    console.error('Expected columns GEOGRAPHY_CODE, OBS_VALUE, OBS_STATUS_NAME not found. Actual columns:', Object.keys(sample || {}));
    process.exit(1);
  }

  const map = new Map();
  for (const row of rows) {
    const code = row.GEOGRAPHY_CODE;
    if (!code) continue;
    const isSuppressed = row.OBS_STATUS_NAME && row.OBS_STATUS_NAME.trim() === SUPPRESSED_STATUS_TEXT;
    const value = Number(row.OBS_VALUE);
    if (isSuppressed) {
      map.set(code, { suppressed: true, value: null, dateName: row.DATE_NAME });
    } else if (Number.isFinite(value)) {
      map.set(code, { suppressed: false, value, dateName: row.DATE_NAME });
    } else {
      console.error(`Row for ${code} has non-numeric OBS_VALUE and is not flagged suppressed — aborting. Row:`, JSON.stringify(row));
      process.exit(1);
    }
  }
  console.log(`  Built median wage map: ${map.size} constituencies (${[...map.values()].filter((v) => v.suppressed).length} suppressed).`);
  return map;
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  const wageMap = await fetchMedianWage();

  const dateNames = new Set([...wageMap.values()].map((v) => v.dateName));
  console.log(`\nDATE_NAME value(s) seen in response: ${[...dateNames].join(', ')}`);
  if (dateNames.size !== 1) {
    console.error('Expected a single DATE_NAME value across all rows (one consistent survey year) — aborting.');
    process.exit(1);
  }

  console.log('\nFetching our own constituency GSS code list from welfare_constituency_geography...');
  const { data: geoRows, error: geoErr } = await supabase
    .from('welfare_constituency_geography')
    .select('constituency_gss_code');
  if (geoErr) { console.error('Failed to read welfare_constituency_geography:', geoErr.message); process.exit(1); }
  const ourGssCodes = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  console.log(`Found ${ourGssCodes.length} distinct constituency GSS codes in our database.`);

  const missing = ourGssCodes.filter((code) => !wageMap.has(code));
  const unexpectedExtra = [...wageMap.keys()].filter((code) => !ourGssCodes.includes(code));

  if (missing.length > 0 || unexpectedExtra.length > 0) {
    console.error('\nIntegrity check FAILED — ABORTING, nothing written.');
    console.error(`  Missing (in our geography table, no Nomis row found): ${missing.length}`);
    console.error(JSON.stringify(missing.slice(0, 10), null, 2));
    console.error(`  Unexpected extra (Nomis row found, not in our geography table): ${unexpectedExtra.length}`);
    console.error(JSON.stringify(unexpectedExtra.slice(0, 10), null, 2));
    process.exit(1);
  }

  console.log(`\nIntegrity check passed: all ${ourGssCodes.length} of our constituencies have exactly one matching Nomis row.`);

  const suppressedCodes = ourGssCodes.filter((code) => wageMap.get(code).suppressed);
  console.log(`\nSuppressed constituencies (${suppressedCodes.length}):`, JSON.stringify(suppressedCodes));

  const validEntries = ourGssCodes
    .map((code) => ({ code, ...wageMap.get(code) }))
    .filter((e) => !e.suppressed);
  const sorted = [...validEntries].sort((a, b) => a.value - b.value);
  console.log('\nLowest 5 median annual pay (workplace):');
  sorted.slice(0, 5).forEach((e) => console.log(`  ${e.code}: £${e.value.toLocaleString()}`));
  console.log('Highest 5 median annual pay (workplace):');
  sorted.slice(-5).reverse().forEach((e) => console.log(`  ${e.code}: £${e.value.toLocaleString()}`));

  const avg = validEntries.reduce((s, e) => s + e.value, 0) / validEntries.length;
  console.log(`\nAverage of all non-suppressed constituency medians: £${avg.toFixed(2)}`);
  console.log('(This is an average-of-medians across constituencies, not a single recomputed national median — same caveat as every other cross-constituency average in this project.)');

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  console.log('\nWriting welfare_source_releases row...');
  const { data: release, error: relErr } = await supabase
    .from('welfare_source_releases')
    .insert({
      source_name: SOURCE_NAME,
      dataset_id: DATASET_ID,
      source_url: NOMIS_URL,
      release_date: PERIOD_END,
      reference_period_start: PERIOD_START,
      reference_period_end: PERIOD_END,
      retrieved_at: new Date().toISOString(),
      notes: 'ONS ASHE median gross annual pay, full-time employees, workplace analysis, by Westminster Parliamentary Constituency (2024 boundaries), via Nomis (NM_99_1). Matches TPA\'s own documented methodology (workplace-based, table NM_99). 4 constituencies suppressed by ONS as statistically unreliable.',
    })
    .select()
    .single();
  if (relErr) { console.error('Failed to insert source release:', relErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${release.id}`);

  const metricRows = ourGssCodes.map((code) => {
    const entry = wageMap.get(code);
    return {
      constituency_gss_code: code,
      metric_key: METRIC_KEY,
      value: entry.suppressed ? null : entry.value,
      unit: 'GBP',
      period_start: PERIOD_START,
      period_end: PERIOD_END,
      source_release_id: release.id,
      status: entry.suppressed ? 'suppressed' : 'ok',
      metadata_json: entry.suppressed
        ? {
            reason: 'suppressed_statistically_unreliable',
            source_status_text: SUPPRESSED_STATUS_TEXT,
            source: 'ons_via_nomis_ashe_workplace',
          }
        : {
            source: 'ons_via_nomis_ashe_workplace',
            measure: 'median_gross_annual_pay_full_time_employees',
            basis: 'workplace',
          },
    };
  });

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

  console.log(`\nDone. ${written} rows written for metric_key='${METRIC_KEY}', period_end=${PERIOD_END} (${suppressedCodes.length} suppressed).`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
