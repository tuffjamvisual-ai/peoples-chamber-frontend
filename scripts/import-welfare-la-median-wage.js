#!/usr/bin/env node
// Import GB local authority median annual pay (workplace-based) for the
// welfare explorer's Local Authority tier.
//
// SOURCE
// ──────
// Nomis NM_99_1 (ASHE — Annual Survey of Hours and Earnings),
// geography TYPE424 ("local authorities: district / unitary, as of April
// 2023"), date=latest, sex=8 (All), pay=7 (Annual pay – gross), item=2
// (Median), measures=20100.
//
// Confirmed by research-nomis-la-country-breakdown.js: NM_99_1 returns
// 350 rows at TYPE424 covering all of GB (England 296, Wales 22,
// Scotland 32) — no second source needed, unlike the population import.
//
// The 350 Nomis GSS codes match Stat-Xplore's LA valueset exactly
// (including the old Barnsley E08000016 / Sheffield E08000019 boundary-
// vintage codes, which are what both sources use consistently).
//
// SUPPRESSED VALUES
// ─────────────────
// ASHE suppresses small-cell estimates. A suppressed row has OBS_VALUE=""
// and carries OBS_STATUS flags. This script writes those as
// status='suppressed', value=NULL so the table has a complete geography
// with honest coverage metadata.
//
// metric_key  : 'median_annual_pay_workplace'
// period_end  : '2025-04-30' (ASHE reference period is the April survey)
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics.

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIVE = process.argv.includes('--live');

const METRIC_KEY = 'median_annual_pay_workplace';
const PERIOD_START = '2025-04-01';
const PERIOD_END = '2025-04-30';

const NOMIS_URL =
  'https://www.nomisweb.co.uk/api/v01/dataset/NM_99_1.data.csv?geography=TYPE424&date=latest&sex=8&pay=7&item=2&measures=20100';

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

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');
  console.log(`\nFetching Nomis ASHE LA median wage...\n  ${NOMIS_URL}`);

  const res = await fetch(NOMIS_URL);
  if (!res.ok) {
    const body = await res.text();
    console.error(`Nomis fetch failed (${res.status}):`, body.slice(0, 500));
    process.exit(1);
  }
  const rows = parseCsv(await res.text());
  console.log(`  Raw rows from Nomis: ${rows.length}`);

  // Confirm actual date used (Nomis resolves "latest" server-side).
  const dates = [...new Set(rows.map((r) => r.DATE_CODE || r.DATE).filter(Boolean))];
  console.log(`  Reference date(s) returned: ${dates.join(', ')}`);

  const results = [];
  let suppressed = 0;
  let missing = 0;
  for (const row of rows) {
    const code = row.GEOGRAPHY_CODE;
    const name = row.GEOGRAPHY_NAME;
    const rawValue = row.OBS_VALUE;
    const obsStatus = row.OBS_STATUS || '';
    if (!code || !name) continue;
    const isSupp = rawValue === '' || rawValue === null || rawValue === undefined;
    if (isSupp) {
      suppressed++;
      results.push({ code, name, value: null, status: 'suppressed', obsStatus });
    } else {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) { missing++; continue; }
      results.push({ code, name, value, status: 'ok', obsStatus: '' });
    }
  }
  console.log(`\n  Parsed: ${results.length} local authorities (${results.length - suppressed} with values, ${suppressed} suppressed, ${missing} unparseable).`);

  const countryBreakdown = { E: 0, W: 0, S: 0, other: 0 };
  for (const r of results) {
    const prefix = r.code.charAt(0);
    if (prefix === 'E') countryBreakdown.E++;
    else if (prefix === 'W') countryBreakdown.W++;
    else if (prefix === 'S') countryBreakdown.S++;
    else countryBreakdown.other++;
  }
  console.log(`  Country breakdown: England=${countryBreakdown.E}, Wales=${countryBreakdown.W}, Scotland=${countryBreakdown.S}, other=${countryBreakdown.other}`);
  if (results.length !== 350) console.warn(`  WARNING: expected 350 LAs, got ${results.length}. Review before proceeding.`);

  const validValues = results.filter((r) => r.value !== null).map((r) => r.value);
  validValues.sort((a, b) => a - b);
  const median = validValues[Math.floor(validValues.length / 2)];
  console.log(`  Value range: £${validValues[0].toLocaleString()} – £${validValues[validValues.length - 1].toLocaleString()}, overall median: £${median.toLocaleString()}`);
  console.log('  First 5 results:');
  results.slice(0, 5).forEach((r) => console.log(`    ${r.code} (${r.name}): ${r.value !== null ? '£' + r.value.toLocaleString() : 'suppressed'}`));
  console.log('  Sample Scotland results:');
  results.filter((r) => r.code.startsWith('S')).slice(0, 5).forEach((r) => console.log(`    ${r.code} (${r.name}): ${r.value !== null ? '£' + r.value.toLocaleString() : 'suppressed'}`));
  if (suppressed > 0) {
    console.log('  Suppressed examples:');
    results.filter((r) => r.status === 'suppressed').slice(0, 5).forEach((r) => console.log(`    ${r.code} (${r.name})`));
  }

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  console.log('\nWriting welfare_source_releases row...');
  const { data: release, error: relErr } = await supabase
    .from('welfare_source_releases')
    .insert({
      source_name: 'nomis_ashe_median_wage_2025_la',
      dataset_id: 'NM_99_1',
      source_url: NOMIS_URL,
      release_date: PERIOD_END,
      reference_period_start: PERIOD_START,
      reference_period_end: PERIOD_END,
      retrieved_at: new Date().toISOString(),
      notes: 'ASHE median annual gross pay (workplace-based), local authority level (April 2023 boundaries), Great Britain, April 2025, via Nomis. Suppressed cells written with status="suppressed".',
    })
    .select()
    .single();
  if (relErr) { console.error('Failed to insert source release:', relErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${release.id}`);

  const metricRows = results.map((r) => ({
    council_gss_code: r.code,
    council_name: r.name,
    metric_key: METRIC_KEY,
    value: r.value,
    unit: 'gbp_annual',
    period_start: PERIOD_START,
    period_end: PERIOD_END,
    source_release_id: release.id,
    status: r.status,
    metadata_json: r.obsStatus ? { obs_status: r.obsStatus } : {},
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
  process.exit(1);
});
