#!/usr/bin/env node
// Compute an ESTIMATED annual Universal Credit spend figure per LOCAL
// AUTHORITY, using the exact same genuine-local-mean-payment methodology
// as compute-welfare-uc-spend.js (the constituency-level script) — only
// the geography tier and table differ. See that script's header for the
// full rationale on why UC uses households × local mean payment rather
// than a national-average-award rate, unlike the other five benefits.
//
// METHOD
// ──────
// annual_spend_estimate(local authority) = households(local authority)
//   × mean_monthly_payment(local authority) × 12
//
// Both inputs come from the same Stat-Xplore request/period (see
// import-welfare-la-uc-households.js, metric_keys 'uc_households' and
// 'uc_mean_monthly_payment') — no DWP workbook figures or national
// averages are used in this calculation at all.
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics (metric_key = 'uc_spend_estimated_annual').

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIVE = process.argv.includes('--live');

const HOUSEHOLDS_METRIC_KEY = 'uc_households';
const MEAN_PAYMENT_METRIC_KEY = 'uc_mean_monthly_payment';
const SPEND_METRIC_KEY = 'uc_spend_estimated_annual';

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  console.log(`\nFetching latest '${HOUSEHOLDS_METRIC_KEY}' rows from welfare_local_authority_metrics...`);
  const { data: householdsRows, error: hhErr } = await supabase
    .from('welfare_local_authority_metrics')
    .select('council_gss_code, council_name, value, period_end, source_release_id')
    .eq('metric_key', HOUSEHOLDS_METRIC_KEY)
    .order('period_end', { ascending: false });
  if (hhErr) { console.error('Failed to read households rows:', hhErr.message); process.exit(1); }
  if (householdsRows.length === 0) {
    console.error(`No rows found for metric_key='${HOUSEHOLDS_METRIC_KEY}' — has import-welfare-la-uc-households.js been run?`);
    process.exit(1);
  }

  console.log(`Fetching latest '${MEAN_PAYMENT_METRIC_KEY}' rows from welfare_local_authority_metrics...`);
  const { data: meanPaymentRows, error: mpErr } = await supabase
    .from('welfare_local_authority_metrics')
    .select('council_gss_code, value, period_end')
    .eq('metric_key', MEAN_PAYMENT_METRIC_KEY)
    .order('period_end', { ascending: false });
  if (mpErr) { console.error('Failed to read mean payment rows:', mpErr.message); process.exit(1); }
  if (meanPaymentRows.length === 0) {
    console.error(`No rows found for metric_key='${MEAN_PAYMENT_METRIC_KEY}' — has import-welfare-la-uc-households.js been run?`);
    process.exit(1);
  }

  const latestPeriodEnd = householdsRows[0].period_end;
  const latestHouseholds = householdsRows.filter((r) => r.period_end === latestPeriodEnd);
  const latestMeanPayments = meanPaymentRows.filter((r) => r.period_end === latestPeriodEnd);

  if (latestMeanPayments.length === 0) {
    console.error(`No '${MEAN_PAYMENT_METRIC_KEY}' rows found for period_end=${latestPeriodEnd} — the two imports are out of sync. Aborting.`);
    process.exit(1);
  }

  const meanPaymentByGss = new Map(latestMeanPayments.map((r) => [r.council_gss_code, r.value]));

  console.log(`Using ${latestHouseholds.length} local authority rows for period_end=${latestPeriodEnd}.`);

  const results = [];
  const missingMeanPayment = [];
  for (const r of latestHouseholds) {
    const meanPayment = meanPaymentByGss.get(r.council_gss_code);
    if (typeof meanPayment !== 'number') {
      missingMeanPayment.push(r.council_gss_code);
      continue;
    }
    results.push({
      gss_code: r.council_gss_code,
      name: r.council_name,
      households: r.value,
      mean_payment: meanPayment,
      spend_estimate: Math.round(r.value * meanPayment * 12),
      source_release_id: r.source_release_id,
    });
  }

  if (missingMeanPayment.length > 0) {
    console.error(`\n${missingMeanPayment.length} local authority(ies) have households data but no matching mean-payment row for the same period — ABORTING, nothing written.`);
    console.error(JSON.stringify(missingMeanPayment.slice(0, 10), null, 2));
    process.exit(1);
  }

  if (results.length !== latestHouseholds.length) {
    console.error('Row count mismatch after joining households and mean-payment data — aborting.');
    process.exit(1);
  }

  console.log('\nFirst 5 results:');
  results.slice(0, 5).forEach((r) =>
    console.log(`  ${r.gss_code} (${r.name}): ${r.households} households × £${r.mean_payment.toFixed(2)}/month × 12 = £${r.spend_estimate.toLocaleString()}`),
  );

  const totalEstimate = results.reduce((sum, r) => sum + r.spend_estimate, 0);
  console.log(`\nSum of all GB local authority estimates: £${totalEstimate.toLocaleString()}`);
  console.log('Note: this is a run-rate estimate from a single month\'s household caseload and mean payment, annualised (×12) — it will not exactly match any single published DWP annual outturn figure.');

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these estimates to the database.');
    return;
  }

  console.log('\nUpserting welfare_local_authority_metrics rows (spend estimates)...');
  const metricRows = results.map((r) => ({
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
      method: 'local_authority_households_times_local_authority_mean_monthly_payment_times_12',
      households_metric_key: HOUSEHOLDS_METRIC_KEY,
      mean_payment_metric_key: MEAN_PAYMENT_METRIC_KEY,
      households: r.households,
      mean_monthly_payment_gbp: r.mean_payment,
      source: 'DWP Stat-Xplore, UC_Households database — genuine local-authority-level mean monthly payment (MEAN statistical function on HNTOTAL_PAYMENT_AMOUNT), not a national average.',
      caveat: 'Annualised run-rate from a single month\'s snapshot (mean monthly payment × 12), not a reconstruction of a specific past year\'s actual total. Same methodology as the constituency-level UC spend estimate, applied at the local authority tier.',
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

  console.log(`\nDone. ${written} local authority spend-estimate rows written for metric_key='${SPEND_METRIC_KEY}', period_end=${latestPeriodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
