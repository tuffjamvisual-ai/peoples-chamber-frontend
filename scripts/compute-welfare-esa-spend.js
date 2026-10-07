#!/usr/bin/env node
// Compute an ESTIMATED annual ESA spend figure per constituency, using the
// same DWP-documented methodology as the other compute-welfare-*-spend.js
// scripts: local caseload × a national average award rate. See
// compute-welfare-uc-spend.js for the full rationale on why this is an
// estimate, not a measured figure.
//
// NATIONAL FIGURES
// ────────────────
// DWP "Benefit expenditure and caseload tables 2025" (Autumn Budget 2025),
// "Incapacity benefits" sheet (sheet index 22):
//   Row [6]   Employment and Support Allowance total expenditure (£m nominal),
//             2026/27 forecast: £5,115.6m
//   Row [111] Employment and Support Allowance total caseload (thousands),
//             2026/27 forecast: 785k (includes 70k credits-only claimants,
//             row [120], who receive NI credits but no cash payment)
//   => £5,115,617,459 / 785,000 = £6,516.71/year
//
// The 785k total denominator (not the 715k paying-only figure) is used
// deliberately, as the ESA_Caseload_new Stat-Xplore dataset counts all ESA
// cases including credits-only, and using the matched total-caseload
// denominator keeps the average consistent with the dataset being
// distributed across constituencies.
//
// NO SCOTLAND SPLIT
// ─────────────────
// ESA is fully reserved to DWP — it has not been devolved to Scotland.
// All 632 GB constituencies receive a spend estimate, same as UC and HB.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics (metric_key = 'esa_spend_estimated_annual').

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIVE = process.argv.includes('--live');

const CASELOAD_METRIC_KEY = 'esa_claimants';
const SPEND_METRIC_KEY = 'esa_spend_estimated_annual';

// DWP "Benefit expenditure and caseload tables 2025" (Autumn Budget 2025),
// "Incapacity benefits" sheet, row [6] / row [111], 2026/27 forecast.
const NATIONAL_EXPENDITURE_2026_27_GBP = 5_115_617_459; // £5,115.6m
const NATIONAL_CASELOAD_2026_27 = 785_000;              // 785k (total, incl. credits-only)
const AVERAGE_ANNUAL_AWARD_GBP = NATIONAL_EXPENDITURE_2026_27_GBP / NATIONAL_CASELOAD_2026_27;

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');
  console.log(`\nNational average annual ESA award (2026/27 forecast basis): £${AVERAGE_ANNUAL_AWARD_GBP.toFixed(2)}`);

  console.log(`\nFetching latest '${CASELOAD_METRIC_KEY}' rows from welfare_constituency_metrics...`);
  const { data: caseloadRows, error: caseloadErr } = await supabase
    .from('welfare_constituency_metrics')
    .select('constituency_gss_code, value, period_end, source_release_id')
    .eq('metric_key', CASELOAD_METRIC_KEY)
    .order('period_end', { ascending: false });
  if (caseloadErr) { console.error('Failed to read caseload rows:', caseloadErr.message); process.exit(1); }
  if (caseloadRows.length === 0) {
    console.error(`No rows found for metric_key='${CASELOAD_METRIC_KEY}' — has the ESA caseload import been run?`);
    process.exit(1);
  }

  const latestPeriodEnd = caseloadRows[0].period_end;
  const latestRows = caseloadRows.filter((r) => r.period_end === latestPeriodEnd);
  console.log(`Using ${latestRows.length} constituency rows for period_end=${latestPeriodEnd}.`);

  const results = latestRows.map((r) => ({
    gss_code: r.constituency_gss_code,
    caseload: r.value,
    spend_estimate: Math.round(r.value * AVERAGE_ANNUAL_AWARD_GBP),
    source_release_id: r.source_release_id,
  }));

  console.log('\nFirst 5 results:');
  results.slice(0, 5).forEach((r) =>
    console.log(`  ${r.gss_code}: caseload ${r.caseload} × £${AVERAGE_ANNUAL_AWARD_GBP.toFixed(2)} = £${r.spend_estimate.toLocaleString()}`),
  );

  const totalEstimate = results.reduce((sum, r) => sum + r.spend_estimate, 0);
  console.log(`\nSum of all GB constituency estimates: £${totalEstimate.toLocaleString()}`);
  console.log('Note: run-rate estimate from a March 2026 caseload snapshot combined with a 2026/27 forecast award rate — will not exactly match any single published DWP figure.');

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these estimates to the database.');
    return;
  }

  console.log('\nUpserting welfare_constituency_metrics rows...');
  const metricRows = results.map((r) => ({
    constituency_gss_code: r.gss_code,
    metric_key: SPEND_METRIC_KEY,
    value: r.spend_estimate,
    unit: 'GBP',
    period_start: latestPeriodEnd,
    period_end: latestPeriodEnd,
    source_release_id: r.source_release_id,
    status: 'estimated',
    metadata_json: {
      method: 'national_average_award_times_local_caseload',
      national_average_annual_award_gbp: Math.round(AVERAGE_ANNUAL_AWARD_GBP * 100) / 100,
      national_expenditure_source: 'DWP Benefit expenditure and caseload tables 2025 (Autumn Budget 2025), "Incapacity benefits" sheet, row [6] Employment and Support Allowance total expenditure (nominal), 2026/27 forecast',
      national_expenditure_gbp: NATIONAL_EXPENDITURE_2026_27_GBP,
      national_caseload_source: 'Same sheet, row [111] Employment and Support Allowance total caseload (includes credits-only), 2026/27 forecast',
      national_caseload: NATIONAL_CASELOAD_2026_27,
      caveat: 'This is an estimate derived by applying one national average award uniformly to local caseload. DWP does not publish a genuine constituency-level award/spend breakdown for ESA as far as this project could establish.',
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

  console.log(`\nDone. ${written} rows written for metric_key='${SPEND_METRIC_KEY}', period_end=${latestPeriodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
