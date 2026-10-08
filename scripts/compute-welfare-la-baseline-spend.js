#!/usr/bin/env node
// Compute BASELINE (~2 years ago) annual spend estimates for all six
// benefits, by LOCAL AUTHORITY, for the two-year % change feature. Writes
// to the SAME metric_keys as the current LA spend estimates (e.g.
// 'pip_spend_estimated_annual') but at each benefit's baseline
// period_end — the unique index on (council_gss_code, metric_key,
// period_end) lets both coexist. Mirrors compute-welfare-baseline-
// spend.js (constituency level) exactly — same 2024/25 DWP workbook
// figures, same method — only the geography tier and table differ.
//
// METHOD
// ──────
// For PIP, Housing Benefit, DLA, Carer's Allowance, ESA: the same
// "national average award × local caseload" method as the current LA
// spend scripts, but using the 2024/25 DWP workbook rows (NOT the
// 2026/27 rows) — award rates rise each year, so the baseline award rate
// must match the baseline year, not today's forecast. Identical figures
// to compute-welfare-baseline-spend.js (national rates don't vary by
// geography tier).
//
// For Universal Credit: the genuine local-authority-level method
// (baseline households × baseline local authority mean monthly payment ×
// 12), using Stat-Xplore's own May 2024 data — no national average rate
// involved, same as the current LA UC spend script.
//
// BASELINE PERIOD_ENDS — discovered from the database, not hardcoded
// ────────────────────────────────────────────────────────────────────
// For each metric_key, this script fetches ALL period_ends present and
// uses the EARLIEST one as "baseline" (the current/live estimate is
// always the latest). This avoids hardcoding exact date strings that
// might not exactly match what the LA baseline caseload import scripts
// actually wrote.
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

// Identical to compute-welfare-baseline-spend.js — same workbook, same
// rows, 2024/25 column (national rates don't vary by geography tier).
const AWARD_RATE_BENEFITS = [
  {
    label: 'PIP',
    caseloadMetricKey: 'pip_claimants',
    spendMetricKey: 'pip_spend_estimated_annual',
    nationalExpenditureGbp: 25_876_200_000, // £25,876.2m, "Disability benefits" sheet, row 10, 2024/25
    nationalCaseload: 3_531_000, // row 63 "of which in payment", 2024/25
    expenditureSource: 'DWP Benefit expenditure and caseload tables 2025 (Autumn Budget 2025), "Disability benefits" sheet, row 10, 2024/25 column',
    caseloadSource: 'Same sheet, row 63, 2024/25 column',
  },
  {
    label: 'Housing Benefit',
    caseloadMetricKey: 'hb_claimants',
    spendMetricKey: 'hb_spend_estimated_annual',
    nationalExpenditureGbp: 15_397_300_000, // £15,397.3m, "Housing benefits" sheet, rows 4+6, 2024/25
    nationalCaseload: 2_072_000, // row 122 "Total", 2024/25
    expenditureSource: 'DWP Benefit expenditure and caseload tables 2025 (Autumn Budget 2025), "Housing benefits" sheet, rows 4+6, 2024/25 column (HB only, UC housing element excluded)',
    caseloadSource: 'Same sheet, row 122, 2024/25 column',
  },
  {
    label: 'DLA',
    caseloadMetricKey: 'dla_claimants',
    spendMetricKey: 'dla_spend_estimated_annual',
    nationalExpenditureGbp: 7_722_600_000, // £7,722.6m, "Disability benefits" sheet, row 5, 2024/25
    nationalCaseload: 1_281_000, // row 54 "of which in payment", 2024/25
    expenditureSource: 'DWP Benefit expenditure and caseload tables 2025 (Autumn Budget 2025), "Disability benefits" sheet, row 5, 2024/25 column',
    caseloadSource: 'Same sheet, row 54, 2024/25 column',
  },
  {
    label: 'Carer\'s Allowance',
    caseloadMetricKey: 'ca_claimants',
    spendMetricKey: 'ca_spend_estimated_annual',
    nationalExpenditureGbp: 4_239_300_000, // £4,239.3m, "Carers Allowance" sheet, row [3], 2024/25
    nationalCaseload: 954_000, // row [15] "of which in payment", 2024/25
    expenditureSource: 'DWP Benefit expenditure and caseload tables 2025 (Autumn Budget 2025), "Carers Allowance" sheet, row [3] Total expenditure, 2024/25 column',
    caseloadSource: 'Same sheet, row [15] "of which in payment", 2024/25 column',
  },
  {
    label: 'ESA',
    caseloadMetricKey: 'esa_claimants',
    spendMetricKey: 'esa_spend_estimated_annual',
    nationalExpenditureGbp: 12_337_400_000, // £12,337.4m, "Incapacity benefits" sheet, row [7], 2024/25
    nationalCaseload: 1_438_000, // row [123] total (incl. credits-only), 2024/25
    expenditureSource: 'DWP Benefit expenditure and caseload tables 2025 (Autumn Budget 2025), "Incapacity benefits" sheet, row [7] ESA total expenditure, 2024/25 column. Note: this 2024/25 figure (£12,337.4m) is much higher than the 2026/27 figure (£5,115.6m) used for the current estimate — this is real, not an error: income-based ESA is still substantial in 2024/25 and drops to near-zero by 2026/27 as UC managed migration completes.',
    caseloadSource: 'Same sheet, row [123] total (includes credits-only), 2024/25 column',
  },
];

async function fetchPeriodEnds(metricKey) {
  const { data, error } = await supabase
    .from('welfare_local_authority_metrics')
    .select('period_end')
    .eq('metric_key', metricKey);
  if (error) { console.error(`Failed to read period_ends for '${metricKey}':`, error.message); process.exit(1); }
  const distinct = [...new Set(data.map((r) => r.period_end))].sort();
  return distinct;
}

async function fetchRowsForPeriod(metricKey, periodEnd) {
  const { data, error } = await supabase
    .from('welfare_local_authority_metrics')
    .select('council_gss_code, council_name, value, status, period_end, source_release_id, metadata_json')
    .eq('metric_key', metricKey)
    .eq('period_end', periodEnd);
  if (error) { console.error(`Failed to read rows for '${metricKey}' at ${periodEnd}:`, error.message); process.exit(1); }
  return data;
}

async function computeAwardRateBenefitBaseline(benefit) {
  console.log(`\n=== ${benefit.label} LA baseline spend ===`);
  const periodEnds = await fetchPeriodEnds(benefit.caseloadMetricKey);
  if (periodEnds.length < 2) {
    console.error(`Expected at least 2 distinct period_ends for '${benefit.caseloadMetricKey}' (current + baseline), found ${periodEnds.length}: ${JSON.stringify(periodEnds)}. Has the LA baseline caseload import been run? Aborting.`);
    process.exit(1);
  }
  const baselinePeriodEnd = periodEnds[0]; // earliest
  console.log(`Baseline period_end: ${baselinePeriodEnd} (period_ends found: ${periodEnds.join(', ')})`);

  const rows = await fetchRowsForPeriod(benefit.caseloadMetricKey, baselinePeriodEnd);
  const okRows = rows.filter((r) => r.status === 'ok');
  const unavailableRows = rows.filter((r) => r.status === 'unavailable');
  console.log(`${rows.length} rows at baseline (${okRows.length} ok, ${unavailableRows.length} unavailable).`);

  const awardRate = benefit.nationalExpenditureGbp / benefit.nationalCaseload;
  console.log(`National average annual award (2024/25 basis): £${awardRate.toFixed(2)}`);

  const results = okRows.map((r) => ({
    gss_code: r.council_gss_code,
    name: r.council_name,
    caseload: r.value,
    spend_estimate: Math.round(r.value * awardRate),
    source_release_id: r.source_release_id,
  }));

  const total = results.reduce((s, r) => s + r.spend_estimate, 0);
  console.log(`Sum of baseline spend estimates: £${total.toLocaleString()}`);
  results.slice(0, 3).forEach((r) => console.log(`  ${r.gss_code} (${r.name}): ${r.caseload} × £${awardRate.toFixed(2)} = £${r.spend_estimate.toLocaleString()}`));

  return { benefit, baselinePeriodEnd, results, unavailableRows, awardRate };
}

async function computeUcBaseline() {
  console.log('\n=== UC LA baseline spend ===');
  const hhPeriodEnds = await fetchPeriodEnds('uc_households');
  const mpPeriodEnds = await fetchPeriodEnds('uc_mean_monthly_payment');
  if (hhPeriodEnds.length < 2 || mpPeriodEnds.length < 2) {
    console.error(`Expected at least 2 distinct period_ends for both uc_households and uc_mean_monthly_payment (current + baseline). Found households=${JSON.stringify(hhPeriodEnds)}, mean_payment=${JSON.stringify(mpPeriodEnds)}. Has the LA UC households baseline import been run? Aborting.`);
    process.exit(1);
  }
  const baselinePeriodEnd = hhPeriodEnds[0];
  if (mpPeriodEnds[0] !== baselinePeriodEnd) {
    console.error(`Earliest period_end mismatch between uc_households (${baselinePeriodEnd}) and uc_mean_monthly_payment (${mpPeriodEnds[0]}) — aborting.`);
    process.exit(1);
  }
  console.log(`Baseline period_end: ${baselinePeriodEnd}`);

  const hhRows = await fetchRowsForPeriod('uc_households', baselinePeriodEnd);
  const mpRows = await fetchRowsForPeriod('uc_mean_monthly_payment', baselinePeriodEnd);
  const mpByGss = new Map(mpRows.map((r) => [r.council_gss_code, r.value]));

  const results = [];
  const missing = [];
  for (const r of hhRows) {
    const meanPayment = mpByGss.get(r.council_gss_code);
    if (typeof meanPayment !== 'number') { missing.push(r.council_gss_code); continue; }
    results.push({
      gss_code: r.council_gss_code,
      name: r.council_name,
      households: r.value,
      mean_payment: meanPayment,
      spend_estimate: Math.round(r.value * meanPayment * 12),
      source_release_id: r.source_release_id,
    });
  }
  if (missing.length > 0) {
    console.error(`${missing.length} local authorities have baseline households but no matching mean-payment row — ABORTING.`);
    console.error(JSON.stringify(missing.slice(0, 10), null, 2));
    process.exit(1);
  }

  const total = results.reduce((s, r) => s + r.spend_estimate, 0);
  console.log(`Sum of baseline UC spend estimates: £${total.toLocaleString()}`);
  results.slice(0, 3).forEach((r) => console.log(`  ${r.gss_code} (${r.name}): ${r.households} households × £${r.mean_payment.toFixed(2)} × 12 = £${r.spend_estimate.toLocaleString()}`));

  return { baselinePeriodEnd, results };
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  const awardRateResults = [];
  for (const benefit of AWARD_RATE_BENEFITS) {
    awardRateResults.push(await computeAwardRateBenefitBaseline(benefit));
  }
  const ucResult = await computeUcBaseline();

  console.log('\n=== Summary ===');
  awardRateResults.forEach((r) => console.log(`  ${r.benefit.label}: baseline period_end=${r.baselinePeriodEnd}, ${r.results.length} estimated, ${r.unavailableRows.length} unavailable`));
  console.log(`  UC: baseline period_end=${ucResult.baselinePeriodEnd}, ${ucResult.results.length} estimated`);

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these estimates to the database.');
    return;
  }

  for (const r of awardRateResults) {
    const { benefit, baselinePeriodEnd, results, unavailableRows, awardRate } = r;
    const spendRows = results.map((row) => ({
      council_gss_code: row.gss_code,
      council_name: row.name,
      metric_key: benefit.spendMetricKey,
      value: row.spend_estimate,
      unit: 'GBP',
      period_start: baselinePeriodEnd,
      period_end: baselinePeriodEnd,
      source_release_id: row.source_release_id,
      status: 'estimated',
      metadata_json: {
        baseline: true,
        purpose: 'two_year_change_comparison',
        method: 'national_average_award_times_local_caseload',
        national_average_annual_award_gbp: Math.round(awardRate * 100) / 100,
        national_expenditure_source: benefit.expenditureSource,
        national_expenditure_gbp: benefit.nationalExpenditureGbp,
        national_caseload_source: benefit.caseloadSource,
        national_caseload: benefit.nationalCaseload,
        caveat: 'Baseline estimate using the 2024/25 DWP forecast award rate against the baseline-period local caseload — matches the methodology of the current estimate but with the award rate for the correct (earlier) year.',
      },
    }));
    const unavailableSpendRows = unavailableRows.map((row) => ({
      council_gss_code: row.council_gss_code,
      council_name: row.council_name,
      metric_key: benefit.spendMetricKey,
      value: null,
      unit: 'GBP',
      period_start: baselinePeriodEnd,
      period_end: baselinePeriodEnd,
      source_release_id: row.source_release_id,
      status: 'unavailable',
      metadata_json: row.metadata_json,
    }));
    const allRows = [...spendRows, ...unavailableSpendRows];
    const BATCH_SIZE = 200;
    let written = 0;
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      const { error: upsertErr } = await supabase
        .from('welfare_local_authority_metrics')
        .upsert(batch, { onConflict: 'council_gss_code,metric_key,period_end' });
      if (upsertErr) { console.error(`Failed to upsert ${benefit.label} LA baseline spend batch:`, upsertErr.message); process.exit(1); }
      written += batch.length;
    }
    console.log(`${benefit.label}: wrote ${written} rows for metric_key='${benefit.spendMetricKey}', period_end=${baselinePeriodEnd}.`);
  }

  const ucSpendRows = ucResult.results.map((row) => ({
    council_gss_code: row.gss_code,
    council_name: row.name,
    metric_key: 'uc_spend_estimated_annual',
    value: row.spend_estimate,
    unit: 'GBP',
    period_start: ucResult.baselinePeriodEnd,
    period_end: ucResult.baselinePeriodEnd,
    source_release_id: row.source_release_id,
    status: 'estimated',
    metadata_json: {
      baseline: true,
      purpose: 'two_year_change_comparison',
      method: 'local_authority_households_times_local_authority_mean_monthly_payment_times_12',
      households: row.households,
      mean_monthly_payment_gbp: row.mean_payment,
      source: 'DWP Stat-Xplore, UC_Households database — genuine local-authority-level mean monthly payment, baseline period.',
    },
  }));
  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < ucSpendRows.length; i += BATCH_SIZE) {
    const batch = ucSpendRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_local_authority_metrics')
      .upsert(batch, { onConflict: 'council_gss_code,metric_key,period_end' });
    if (upsertErr) { console.error('Failed to upsert UC LA baseline spend batch:', upsertErr.message); process.exit(1); }
    written += batch.length;
  }
  console.log(`UC: wrote ${written} rows for metric_key='uc_spend_estimated_annual', period_end=${ucResult.baselinePeriodEnd}.`);

  console.log('\nAll six LA baseline spend computations complete.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
