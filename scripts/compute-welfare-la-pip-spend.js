#!/usr/bin/env node
// Compute an ESTIMATED annual PIP spend figure per LOCAL AUTHORITY, using
// the exact same national-average-award methodology and the exact same
// 2026/27 award rate as compute-welfare-pip-spend.js (the constituency-
// level script) — only the geography tier and table differ. See that
// script for the full rationale on why this is an estimate, not a
// measured figure, and why Stat-Xplore has no genuine LA-level award
// dataset either.
//
// NATIONAL FIGURES — IDENTICAL TO THE CONSTITUENCY-LEVEL SCRIPT
// ──────────────────────────────────────────────────────────────────────
// DWP "Benefit expenditure and caseload tables 2025" (Autumn Budget 2025),
// "Disability benefits" sheet, row 10 / row 63, 2026/27 forecast:
//   £32,016,555,527 / 4,220,000 = £7,587.81/year
// (Scotland already excluded from these DWP figures since April 2020, so
// no mismatch to correct for against our England & Wales-only LA caseload.)
//
// SCOTLAND
// ────────
// Local authorities with an 'unavailable' pip_claimants row (the 32
// Scottish councils, PIP devolved to Adult Disability Payment) get a
// matching 'unavailable' pip_spend_estimated_annual row — no spend figure
// is computed for them since there is no caseload to multiply.
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics (metric_key = 'pip_spend_estimated_annual').

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIVE = process.argv.includes('--live');

const CASELOAD_METRIC_KEY = 'pip_claimants';
const SPEND_METRIC_KEY = 'pip_spend_estimated_annual';

// Same source/row/figures as compute-welfare-pip-spend.js.
const NATIONAL_EXPENDITURE_2026_27_GBP = 32_016_555_527; // £32,016.6m
const NATIONAL_CASELOAD_2026_27 = 4_220_000; // 4,220k
const AVERAGE_ANNUAL_AWARD_GBP = NATIONAL_EXPENDITURE_2026_27_GBP / NATIONAL_CASELOAD_2026_27;

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');
  console.log(`\nNational average annual PIP award (2026/27 forecast basis): £${AVERAGE_ANNUAL_AWARD_GBP.toFixed(2)}`);

  console.log(`\nFetching latest '${CASELOAD_METRIC_KEY}' rows from welfare_local_authority_metrics...`);
  const { data: allRows, error: fetchErr } = await supabase
    .from('welfare_local_authority_metrics')
    .select('council_gss_code, council_name, value, status, period_end, source_release_id, metadata_json')
    .eq('metric_key', CASELOAD_METRIC_KEY)
    .order('period_end', { ascending: false });
  if (fetchErr) { console.error('Failed to read caseload rows:', fetchErr.message); process.exit(1); }
  if (allRows.length === 0) {
    console.error(`No rows found for metric_key='${CASELOAD_METRIC_KEY}' — has the LA PIP caseload import been run?`);
    process.exit(1);
  }

  const latestPeriodEnd = allRows[0].period_end;
  const latestRows = allRows.filter((r) => r.period_end === latestPeriodEnd);
  const okRows = latestRows.filter((r) => r.status === 'ok');
  const unavailableRows = latestRows.filter((r) => r.status === 'unavailable');
  console.log(`Using ${latestRows.length} local authority rows for period_end=${latestPeriodEnd} (${okRows.length} ok, ${unavailableRows.length} unavailable/devolved).`);

  const results = okRows.map((r) => ({
    gss_code: r.council_gss_code,
    name: r.council_name,
    caseload: r.value,
    spend_estimate: Math.round(r.value * AVERAGE_ANNUAL_AWARD_GBP),
    source_release_id: r.source_release_id,
  }));

  console.log('\nFirst 5 results:');
  results.slice(0, 5).forEach((r) =>
    console.log(`  ${r.gss_code} (${r.name}): caseload ${r.caseload} × £${AVERAGE_ANNUAL_AWARD_GBP.toFixed(2)} = £${r.spend_estimate.toLocaleString()}`),
  );

  const totalEstimate = results.reduce((sum, r) => sum + r.spend_estimate, 0);
  console.log(`\nSum of all England & Wales local authority estimates: £${totalEstimate.toLocaleString()}`);
  console.log('Note: this is a forward-looking run-rate estimate from a July 2026 caseload snapshot combined with a 2026/27 forecast award rate — it will not exactly match any single published DWP figure.');

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these estimates to the database.');
    return;
  }

  console.log('\nUpserting welfare_local_authority_metrics rows (spend estimates)...');
  const spendRows = results.map((r) => ({
    council_gss_code: r.gss_code,
    council_name: r.name,
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
      national_expenditure_source: 'DWP Benefit expenditure and caseload tables 2025 (Autumn Budget 2025), "Disability benefits" sheet, row 10, 2026/27 forecast',
      national_expenditure_gbp: NATIONAL_EXPENDITURE_2026_27_GBP,
      national_caseload_source: 'Same sheet, row 63, 2026/27 forecast',
      national_caseload: NATIONAL_CASELOAD_2026_27,
      caveat: 'This is an estimate derived by applying one national average award uniformly to local caseload. DWP does not publish a genuine local-authority-level award/spend breakdown for PIP as far as this project could establish.',
    },
  }));

  const unavailableSpendRows = unavailableRows.map((r) => ({
    council_gss_code: r.council_gss_code,
    council_name: r.council_name,
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
      .from('welfare_local_authority_metrics')
      .upsert(batch, { onConflict: 'council_gss_code,metric_key,period_end' });
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
