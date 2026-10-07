#!/usr/bin/env node
// Compute an ESTIMATED annual Carer's Allowance spend figure per
// constituency, using the same DWP-documented methodology as the other
// compute-welfare-*-spend.js scripts: local in-payment caseload ×
// a national average award rate. See compute-welfare-uc-spend.js for
// the full rationale on why this is an estimate, not a measured figure.
//
// NATIONAL FIGURES
// ────────────────
// DWP "Benefit expenditure and caseload tables 2025" (Autumn Budget 2025),
// "Carers Allowance" sheet (sheet index 19):
//   Row [3]  Total expenditure (£m nominal), 2026/27 forecast: £4,994.6m
//   Row [15] Caseload "of which in payment" (thousands), 2026/27: 1,077k
//   => £4,994,557,713 / 1,077,000 = £4,637.47/year
//
// Row [3] is used for expenditure because it represents actual money paid
// out, which flows only to in-payment claimants — not the 386k entitled-
// but-nil-payment cases (Row [18]). Row [15] is used (not Row [14] total
// caseload of 1,463k) because our constituency import uses the
// CA_In_Payment_New dataset, which counts only in-payment claimants.
// Using the matched denominator gives a meaningful per-claimant rate.
//
// The implied average award of £4,637.47/year is somewhat above the flat
// weekly rate of £83.30 × 52 = £4,331.60 — the gap reflects mid-year
// uprating effects and the 2025/26 forecast snapshot timing, which is
// consistent with DWP's own projection methodology.
//
// SCOTLAND
// ────────
// Constituencies with an 'unavailable' ca_claimants row (Scotland, CA
// devolved to Carer Support Payment since Autumn 2025) get a matching
// 'unavailable' ca_spend_estimated_annual row carrying the same
// devolution metadata — no spend figure is computed for them.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics (metric_key = 'ca_spend_estimated_annual').

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIVE = process.argv.includes('--live');

const CASELOAD_METRIC_KEY = 'ca_claimants';
const SPEND_METRIC_KEY = 'ca_spend_estimated_annual';

// DWP "Benefit expenditure and caseload tables 2025" (Autumn Budget 2025),
// "Carers Allowance" sheet, row [3] / row [15], 2026/27 forecast.
const NATIONAL_EXPENDITURE_2026_27_GBP = 4_994_557_713; // £4,994.6m
const NATIONAL_CASELOAD_2026_27 = 1_077_000;            // 1,077k in-payment
const AVERAGE_ANNUAL_AWARD_GBP = NATIONAL_EXPENDITURE_2026_27_GBP / NATIONAL_CASELOAD_2026_27;

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');
  console.log(`\nNational average annual CA award (2026/27 forecast basis, in-payment): £${AVERAGE_ANNUAL_AWARD_GBP.toFixed(2)}`);

  console.log(`\nFetching latest '${CASELOAD_METRIC_KEY}' rows from welfare_constituency_metrics...`);
  const { data: allRows, error: fetchErr } = await supabase
    .from('welfare_constituency_metrics')
    .select('constituency_gss_code, value, status, period_end, source_release_id, metadata_json')
    .eq('metric_key', CASELOAD_METRIC_KEY)
    .order('period_end', { ascending: false });
  if (fetchErr) { console.error('Failed to read caseload rows:', fetchErr.message); process.exit(1); }
  if (allRows.length === 0) {
    console.error(`No rows found for metric_key='${CASELOAD_METRIC_KEY}' — has the CA caseload import been run?`);
    process.exit(1);
  }

  const latestPeriodEnd = allRows[0].period_end;
  const latestRows = allRows.filter((r) => r.period_end === latestPeriodEnd);
  const okRows = latestRows.filter((r) => r.status === 'ok');
  const unavailableRows = latestRows.filter((r) => r.status === 'unavailable');
  console.log(`Using ${latestRows.length} constituency rows for period_end=${latestPeriodEnd} (${okRows.length} ok, ${unavailableRows.length} unavailable/devolved).`);

  const results = okRows.map((r) => ({
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
  console.log(`\nSum of all England & Wales constituency estimates: £${totalEstimate.toLocaleString()}`);
  console.log('Note: run-rate estimate from a March 2026 in-payment caseload snapshot combined with a 2026/27 forecast award rate — will not exactly match any single published DWP figure.');

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these estimates to the database.');
    return;
  }

  console.log('\nUpserting welfare_constituency_metrics rows (spend estimates)...');
  const spendRows = results.map((r) => ({
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
      national_expenditure_source: 'DWP Benefit expenditure and caseload tables 2025 (Autumn Budget 2025), "Carers Allowance" sheet, row [3] Total expenditure (nominal), 2026/27 forecast',
      national_expenditure_gbp: NATIONAL_EXPENDITURE_2026_27_GBP,
      national_caseload_source: 'Same sheet, row [15] "of which in payment", 2026/27 forecast',
      national_caseload: NATIONAL_CASELOAD_2026_27,
      caveat: 'This is an estimate derived by applying one national average award uniformly to local in-payment caseload. DWP does not publish a genuine constituency-level award/spend breakdown for Carer\'s Allowance as far as this project could establish.',
    },
  }));

  const unavailableSpendRows = unavailableRows.map((r) => ({
    constituency_gss_code: r.constituency_gss_code,
    metric_key: SPEND_METRIC_KEY,
    value: null,
    unit: 'GBP',
    period_start: latestPeriodEnd,
    period_end: latestPeriodEnd,
    source_release_id: r.source_release_id,
    status: 'unavailable',
    metadata_json: r.metadata_json,
  }));

  const allSpendRows = [...spendRows, ...unavailableSpendRows];
  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < allSpendRows.length; i += BATCH_SIZE) {
    const batch = allSpendRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_constituency_metrics')
      .upsert(batch, { onConflict: 'constituency_gss_code,metric_key,period_end' });
    if (upsertErr) { console.error('Failed to upsert metrics batch:', upsertErr.message); process.exit(1); }
    written += batch.length;
    console.log(`  Upserted ${written}/${allSpendRows.length}`);
  }

  console.log(`\nDone. ${written} rows written for metric_key='${SPEND_METRIC_KEY}' (${spendRows.length} estimated, ${unavailableSpendRows.length} unavailable), period_end=${latestPeriodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
