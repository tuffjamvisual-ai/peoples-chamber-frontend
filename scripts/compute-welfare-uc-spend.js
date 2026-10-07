#!/usr/bin/env node
// Compute an ESTIMATED annual Universal Credit spend figure per constituency,
// using DWP's own documented methodology for constituency-level expenditure
// estimates: local caseload × a national average award rate.
//
// THIS IS AN ESTIMATE, NOT A DIRECTLY MEASURED FIGURE
// ─────────────────────────────────────────────────────
// DWP's own guidance for "Benefit expenditure and caseload tables" states
// expenditure by Parliamentary Constituency is estimated using caseload and
// average-award data applied to national outturn expenditure — DWP does not
// publish a genuine constituency-level £ breakdown for Universal Credit (nor,
// as far as this project has found, for the other five benefits). Stat-Xplore
// was checked for a constituency-level average-award measure (BC_UC_Monthly)
// but that database covers only benefit-capped households, a small subset,
// and would understate spend if used generally — it is NOT used here.
//
// METHOD
// ──────
// annual_spend_estimate(constituency) = caseload(constituency) × national_average_annual_award
//
// national_average_annual_award is derived from DWP's "Benefit expenditure
// and caseload tables 2025" (Autumn Budget 2025 edition), "Universal Credit
// and equivalent" sheet:
//   https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025
//   Row 14 (Universal Credit expenditure, £m nominal), 2026/27 forecast: £87,630.5m
//   Row 51 (Universal Credit caseload, thousands),     2026/27 forecast: 6,918k
//   => £87,630,500,000 / 6,918,000 = £12,667.09/year (rounded below)
//
// The 2026/27 forecast year is used (rather than the 2024/25 outturn) because
// it is the fiscal year containing the caseload snapshot month this script
// multiplies against (May 2026, already imported as metric_key
// 'uc_people_on_uc'). The 2024/25 outturn figure (£66,743.9m / 5,480k ≈
// £12,179/year) was cross-checked against an independent NAO citation
// (£66.3bn for UC in 2024/25, from DWP's Annual Report and Accounts) before
// being accepted as correct — this script does not use that figure directly,
// but the cross-check is recorded here because it is what established
// confidence in the underlying DWP workbook figures used for 2026/27 too.
//
// This script does NOT scale/align results to a national total the way DWP's
// methodology note implies for a genuine past-year estimate, because no
// 2026/27 OUTTURN total exists yet (it is a forecast year, still in progress)
// — there is nothing to align to yet. This is a forward-looking run-rate
// estimate based on the latest known caseload and the latest forecast award
// rate, not a reconstruction of a specific past year's actual total.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics (metric_key = 'uc_spend_estimated_annual').

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIVE = process.argv.includes('--live');

const CASELOAD_METRIC_KEY = 'uc_people_on_uc';
const SPEND_METRIC_KEY = 'uc_spend_estimated_annual';

// DWP "Benefit expenditure and caseload tables 2025" (Autumn Budget 2025),
// "Universal Credit and equivalent" sheet, row 14 / row 51, 2026/27 forecast.
const NATIONAL_EXPENDITURE_2026_27_GBP = 87_630_500_000; // £87,630.5m
const NATIONAL_CASELOAD_2026_27 = 6_918_000; // 6,918k
const AVERAGE_ANNUAL_AWARD_GBP = NATIONAL_EXPENDITURE_2026_27_GBP / NATIONAL_CASELOAD_2026_27;

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');
  console.log(`\nNational average annual UC award (2026/27 forecast basis): £${AVERAGE_ANNUAL_AWARD_GBP.toFixed(2)}`);

  console.log(`\nFetching latest '${CASELOAD_METRIC_KEY}' rows from welfare_constituency_metrics...`);
  const { data: caseloadRows, error: caseloadErr } = await supabase
    .from('welfare_constituency_metrics')
    .select('constituency_gss_code, value, period_end, source_release_id')
    .eq('metric_key', CASELOAD_METRIC_KEY)
    .order('period_end', { ascending: false });
  if (caseloadErr) { console.error('Failed to read caseload rows:', caseloadErr.message); process.exit(1); }
  if (caseloadRows.length === 0) {
    console.error(`No rows found for metric_key='${CASELOAD_METRIC_KEY}' — has the UC caseload import been run?`);
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
  console.log(`\nSum of all constituency estimates: £${totalEstimate.toLocaleString()}`);
  console.log(`For comparison, national caseload (${latestPeriodEnd}) × award rate would give: £${Math.round(latestRows.reduce((s, r) => s + r.value, 0) * AVERAGE_ANNUAL_AWARD_GBP).toLocaleString()} (should match the sum above, since this is the same arithmetic applied row by row).`);
  console.log('Note: this total is a forward-looking run-rate estimate, not the DWP 2026/27 outturn total (which does not exist yet, as 2026/27 is still in progress) — it will not exactly match any single published DWP figure.');

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
    period_start: latestRows[0].period_end, // same snapshot period as the caseload it's derived from
    period_end: latestPeriodEnd,
    source_release_id: r.source_release_id, // same source release as the caseload import — this is a derived figure, not a new independent fetch
    status: 'estimated',
    metadata_json: {
      method: 'national_average_award_times_local_caseload',
      national_average_annual_award_gbp: Math.round(AVERAGE_ANNUAL_AWARD_GBP * 100) / 100,
      national_expenditure_source: 'DWP Benefit expenditure and caseload tables 2025 (Autumn Budget 2025), "Universal Credit and equivalent" sheet, row 14, 2026/27 forecast',
      national_expenditure_gbp: NATIONAL_EXPENDITURE_2026_27_GBP,
      national_caseload_source: 'Same sheet, row 51, 2026/27 forecast',
      national_caseload: NATIONAL_CASELOAD_2026_27,
      caveat: 'This is an estimate derived by applying one national average award uniformly to local caseload. DWP does not publish a genuine constituency-level award/spend breakdown for Universal Credit as far as this project could establish.',
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

  console.log(`\nDone. ${written} constituency spend-estimate rows written for metric_key='${SPEND_METRIC_KEY}', period_end=${latestPeriodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
