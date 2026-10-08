#!/usr/bin/env node
// Rebuild welfare_local_authority_summary: the denormalised, ranked
// summary table that powers fast page reads for the welfare explorer's
// Local Authority tier. Mirrors compute-welfare-constituency-summary.js
// exactly — same scope decision, same method, same two-year-change
// fields — only the geography tier and table differ. Per the schema
// migration's own design note, this is TRUNCATED AND REBUILT WHOLESALE
// after a validated import — never updated row by row.
//
// SCOPE: ENGLAND & WALES ONLY (318 local authorities) — NOT GB-WIDE
// ─────────────────────────────────────────────────────────────────
// Same reasoning as the constituency-level summary (see that script's
// header for the full rationale). PIP, DLA, and Carer's Allowance are
// devolved in Scotland, so a Scottish local authority's six-benefit
// total would only ever include 3 of 6 benefits (UC, Housing Benefit,
// ESA) — summing and ranking that alongside England & Wales local
// authorities (which get all 6) would make every Scottish council look
// artificially cheap, which is misleading, not a genuine finding. This
// summary table — and its ranking — is scoped to England & Wales only
// (318 of the 350 GB local authorities), matching both TPA's own tool
// scope and the constituency-level summary's scope exactly. Scotland's
// real per-benefit data remains fully queryable from
// welfare_local_authority_metrics directly; it's just not part of this
// particular ranked six-benefit summary.
//
// LOCAL AUTHORITY LIST — derived from the metrics table itself
// ──────────────────────────────────────────────────────────────────────
// Unlike the constituency tier, there is no separate
// welfare_local_authority_geography table. The full list of 350 GB local
// authorities (with their DWP/Nomis-native GSS codes — see the schema
// migration's header for the Barnsley/Sheffield code-vintage caveat) is
// derived here from the distinct council_gss_code values present for
// population_mid_year (a GB-wide metric, so it has all 350), then
// filtered down to the 318 non-Scottish ones (GSS codes NOT starting
// with 'S12') for this summary's England & Wales scope.
//
// METHOD
// ──────
// For each of the 318 England & Wales local authorities:
//   total_six_benefit_spend = sum of the LATEST value for each of:
//     uc_spend_estimated_annual, pip_spend_estimated_annual,
//     hb_spend_estimated_annual, dla_spend_estimated_annual,
//     ca_spend_estimated_annual, esa_spend_estimated_annual
//   spend_per_resident = total_six_benefit_spend / population_mid_year
//   rank_total_spend / rank_spend_per_resident = 1..318, descending
//
// headline_period_end is set to the MOST RECENT of the six benefits'
// latest period_ends, recorded alongside a per-benefit breakdown in
// metadata_json. baseline_period_end / baseline_total_spend / cash_change
// / percentage_change mirror the constituency-level summary's two-year
// change fields exactly — see that script's header for the full
// rationale (same expected direction: ESA/HB baselines higher than
// current, PIP/DLA/CA/UC baselines lower than current).
//
// INTEGRITY CHECK
// ───────────────
// Every one of the 318 England & Wales local authorities must have a
// present, numeric value for all six benefit metrics (both current AND
// baseline) and a population figure. Any local authority missing any of
// these aborts the whole rebuild with nothing written.
//
// Run without --live to preview. Pass --live to truncate and rebuild
// welfare_local_authority_summary.

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LIVE = process.argv.includes('--live');

const SPEND_METRIC_KEYS = [
  'uc_spend_estimated_annual',
  'pip_spend_estimated_annual',
  'hb_spend_estimated_annual',
  'dla_spend_estimated_annual',
  'ca_spend_estimated_annual',
  'esa_spend_estimated_annual',
];
const POPULATION_METRIC_KEY = 'population_mid_year';

async function fetchLatestByCouncil(metricKey) {
  const { data, error } = await supabase
    .from('welfare_local_authority_metrics')
    .select('council_gss_code, council_name, value, status, period_end')
    .eq('metric_key', metricKey)
    .order('period_end', { ascending: false });
  if (error) { console.error(`Failed to read '${metricKey}' rows:`, error.message); process.exit(1); }
  if (data.length === 0) {
    console.error(`No rows found for metric_key='${metricKey}'.`);
    process.exit(1);
  }
  const latestPeriodEnd = data[0].period_end;
  const latestRows = data.filter((r) => r.period_end === latestPeriodEnd);
  const map = new Map();
  const nameMap = new Map();
  for (const r of latestRows) {
    if (typeof r.value === 'number') map.set(r.council_gss_code, r.value);
    nameMap.set(r.council_gss_code, r.council_name);
  }
  return { map, nameMap, latestPeriodEnd, rowCount: latestRows.length, valueCount: map.size };
}

async function fetchEarliestByCouncil(metricKey) {
  const { data, error } = await supabase
    .from('welfare_local_authority_metrics')
    .select('council_gss_code, value, status, period_end')
    .eq('metric_key', metricKey)
    .order('period_end', { ascending: true });
  if (error) { console.error(`Failed to read '${metricKey}' rows:`, error.message); process.exit(1); }
  if (data.length === 0) {
    console.error(`No rows found for metric_key='${metricKey}'.`);
    process.exit(1);
  }
  const distinctPeriodEnds = [...new Set(data.map((r) => r.period_end))];
  if (distinctPeriodEnds.length < 2) {
    console.error(`Expected at least 2 distinct period_ends for '${metricKey}' (baseline + current) — found ${distinctPeriodEnds.length}. Has the LA baseline import/compute been run? Aborting.`);
    process.exit(1);
  }
  const earliestPeriodEnd = data[0].period_end;
  const earliestRows = data.filter((r) => r.period_end === earliestPeriodEnd);
  const map = new Map();
  for (const r of earliestRows) {
    if (typeof r.value === 'number') map.set(r.council_gss_code, r.value);
  }
  return { map, earliestPeriodEnd, rowCount: earliestRows.length, valueCount: map.size };
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will truncate and rebuild welfare_local_authority_summary) ---' : '--- DRY RUN (pass --live to rebuild) ---');

  console.log('\nDeriving the full GB local authority GSS code list from population_mid_year...');
  const populationData = await fetchLatestByCouncil(POPULATION_METRIC_KEY);
  const allGssCodes = [...populationData.map.keys()].sort();
  const ewGssCodes = allGssCodes.filter((c) => !c.startsWith('S12'));
  console.log(`Found ${allGssCodes.length} GB local authorities; using the ${ewGssCodes.length} England & Wales ones for this summary (Scotland excluded — see header comment).`);
  console.log(`  population_mid_year: period_end=${populationData.latestPeriodEnd}, ${populationData.valueCount} numeric values`);

  console.log('\nFetching latest value for each of the six benefit spend metrics...');
  const benefitData = {};
  for (const key of SPEND_METRIC_KEYS) {
    const result = await fetchLatestByCouncil(key);
    benefitData[key] = result;
    console.log(`  ${key}: period_end=${result.latestPeriodEnd}, ${result.valueCount} numeric values out of ${result.rowCount} rows`);
  }

  console.log('\nFetching baseline (earliest) value for each of the six benefit spend metrics...');
  const baselineBenefitData = {};
  for (const key of SPEND_METRIC_KEYS) {
    const result = await fetchEarliestByCouncil(key);
    baselineBenefitData[key] = result;
    console.log(`  ${key}: baseline period_end=${result.earliestPeriodEnd}, ${result.valueCount} numeric values out of ${result.rowCount} rows`);
  }

  const headlinePeriodEnd = Object.values(benefitData)
    .map((b) => b.latestPeriodEnd)
    .sort()
    .pop();
  console.log(`\nHeadline period_end (most recent of the six benefits' latest periods): ${headlinePeriodEnd}`);

  const baselinePeriodEnd = Object.values(baselineBenefitData)
    .map((b) => b.earliestPeriodEnd)
    .sort()
    .pop();
  console.log(`Baseline period_end (most recent of the six benefits' baseline periods): ${baselinePeriodEnd}`);

  console.log('\nBuilding per-local-authority totals (current and baseline)...');
  const missing = [];
  const results = [];
  for (const code of ewGssCodes) {
    const breakdown = {};
    let total = 0;
    let anyMissing = false;
    for (const key of SPEND_METRIC_KEYS) {
      const value = benefitData[key].map.get(code);
      if (typeof value !== 'number') { anyMissing = true; break; }
      breakdown[key] = value;
      total += value;
    }

    const baselineBreakdown = {};
    let baselineTotal = 0;
    let baselineAnyMissing = false;
    for (const key of SPEND_METRIC_KEYS) {
      const value = baselineBenefitData[key].map.get(code);
      if (typeof value !== 'number') { baselineAnyMissing = true; break; }
      baselineBreakdown[key] = value;
      baselineTotal += value;
    }

    const population = populationData.map.get(code);
    const name = populationData.nameMap.get(code);
    if (anyMissing || baselineAnyMissing || typeof population !== 'number') {
      missing.push({
        code,
        anyMissing,
        baselineAnyMissing,
        hasPopulation: typeof population === 'number',
      });
      continue;
    }

    const roundedBaselineTotal = Math.round(baselineTotal);
    const roundedTotal = Math.round(total);
    results.push({
      gss_code: code,
      name,
      total_six_benefit_spend: roundedTotal,
      population,
      spend_per_resident: total / population,
      breakdown,
      baseline_total_six_benefit_spend: roundedBaselineTotal,
      baseline_breakdown: baselineBreakdown,
      cash_change: roundedTotal - roundedBaselineTotal,
      percentage_change: roundedBaselineTotal !== 0 ? ((roundedTotal - roundedBaselineTotal) / roundedBaselineTotal) * 100 : null,
    });
  }

  if (missing.length > 0) {
    console.error(`\n${missing.length} England & Wales local authority(ies) are missing a required value — ABORTING, nothing written.`);
    console.error(JSON.stringify(missing.slice(0, 10), null, 2));
    process.exit(1);
  }

  console.log(`\nIntegrity check passed: all ${results.length} England & Wales local authorities have all six current benefit values, all six baseline benefit values, and a population figure.`);

  const totalCashChange = results.reduce((s, r) => s + r.cash_change, 0);
  const totalBaselineSpend = results.reduce((s, r) => s + r.baseline_total_six_benefit_spend, 0);
  const overallPercentageChange = totalBaselineSpend !== 0 ? (totalCashChange / totalBaselineSpend) * 100 : null;
  console.log(`\nEngland & Wales baseline (${baselinePeriodEnd}) six-benefit total: £${totalBaselineSpend.toLocaleString()}`);
  console.log(`England & Wales current (${headlinePeriodEnd}) six-benefit total: £${(totalBaselineSpend + totalCashChange).toLocaleString()}`);
  console.log(`Overall cash change: £${totalCashChange.toLocaleString()} (${overallPercentageChange !== null ? overallPercentageChange.toFixed(2) : 'n/a'}%)`);

  // Rank by total spend (descending — rank 1 = highest) and separately by
  // spend per resident (descending — rank 1 = highest).
  const byTotal = [...results].sort((a, b) => b.total_six_benefit_spend - a.total_six_benefit_spend);
  byTotal.forEach((r, i) => { r.rank_total_spend = i + 1; });
  const byPerResident = [...results].sort((a, b) => b.spend_per_resident - a.spend_per_resident);
  byPerResident.forEach((r, i) => { r.rank_spend_per_resident = i + 1; });

  console.log('\nTop 5 by total spend:');
  byTotal.slice(0, 5).forEach((r) => console.log(`  #${r.rank_total_spend} ${r.gss_code} (${r.name}): £${r.total_six_benefit_spend.toLocaleString()}`));
  console.log('\nTop 5 by spend per resident:');
  byPerResident.slice(0, 5).forEach((r) => console.log(`  #${r.rank_spend_per_resident} ${r.gss_code} (${r.name}): £${r.spend_per_resident.toFixed(2)}/resident (population ${r.population.toLocaleString()})`));

  const byPercentageChange = [...results].sort((a, b) => (b.percentage_change ?? -Infinity) - (a.percentage_change ?? -Infinity));
  console.log('\nTop 5 by two-year percentage change (highest increase):');
  byPercentageChange.slice(0, 5).forEach((r) => console.log(`  ${r.gss_code} (${r.name}): £${r.baseline_total_six_benefit_spend.toLocaleString()} → £${r.total_six_benefit_spend.toLocaleString()} (${r.percentage_change !== null ? r.percentage_change.toFixed(2) : 'n/a'}%)`));
  console.log('Bottom 5 by two-year percentage change (biggest decrease):');
  byPercentageChange.slice(-5).reverse().forEach((r) => console.log(`  ${r.gss_code} (${r.name}): £${r.baseline_total_six_benefit_spend.toLocaleString()} → £${r.total_six_benefit_spend.toLocaleString()} (${r.percentage_change !== null ? r.percentage_change.toFixed(2) : 'n/a'}%)`));

  const totalSpendSum = results.reduce((s, r) => s + r.total_six_benefit_spend, 0);
  const totalPopulation = results.reduce((s, r) => s + r.population, 0);
  console.log(`\nEngland & Wales total six-benefit spend: £${totalSpendSum.toLocaleString()}`);
  console.log(`England & Wales total population: ${totalPopulation.toLocaleString()}`);
  console.log(`Implied overall average spend per resident: £${(totalSpendSum / totalPopulation).toFixed(2)}`);

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to truncate and rebuild welfare_local_authority_summary.');
    return;
  }

  console.log('\nDeleting existing welfare_local_authority_summary rows...');
  const { error: deleteErr } = await supabase
    .from('welfare_local_authority_summary')
    .delete()
    .not('council_gss_code', 'is', null); // delete all rows (Supabase requires a filter)
  if (deleteErr) { console.error('Failed to delete existing summary rows:', deleteErr.message); process.exit(1); }
  console.log('  Deleted.');

  const now = new Date().toISOString();
  const summaryRows = results.map((r) => ({
    council_gss_code: r.gss_code,
    council_name: r.name,
    headline_period_end: headlinePeriodEnd,
    total_six_benefit_spend: r.total_six_benefit_spend,
    spend_per_resident: r.spend_per_resident,
    rank_total_spend: r.rank_total_spend,
    rank_spend_per_resident: r.rank_spend_per_resident,
    baseline_period_end: baselinePeriodEnd,
    baseline_total_spend: r.baseline_total_six_benefit_spend,
    cash_change: r.cash_change,
    percentage_change: r.percentage_change,
    population: r.population,
    population_reference_year: 2024,
    latest_source_update: now,
    metadata_json: {
      benefit_breakdown: r.breakdown,
      benefit_period_ends: Object.fromEntries(SPEND_METRIC_KEYS.map((k) => [k, benefitData[k].latestPeriodEnd])),
      baseline_benefit_breakdown: r.baseline_breakdown,
      baseline_benefit_period_ends: Object.fromEntries(SPEND_METRIC_KEYS.map((k) => [k, baselineBenefitData[k].earliestPeriodEnd])),
      population_period_end: populationData.latestPeriodEnd,
      scope: 'england_and_wales_only',
      scope_reason: 'PIP, DLA, and Carer\'s Allowance are devolved in Scotland; Scottish-administered equivalents (ADP, SADLA/CDP, CSP) are not included here. Including Scotland with only 3 of 6 benefits would misleadingly understate its total relative to England & Wales. Matches the constituency-level summary\'s scope decision exactly.',
      two_year_change_note: 'baseline_total_spend sums the same six benefit estimates as total_six_benefit_spend, but each at its own baseline period (~2 years earlier). ESA and Housing Benefit baselines are higher than current (caseloads shrinking as claimants migrate to Universal Credit); PIP, DLA, Carer\'s Allowance, and UC baselines are lower than current (caseloads/awards growing). headline_period_end and baseline_period_end each mix benefits with different reference dates — see benefit_period_ends / baseline_benefit_period_ends for the exact dates used for each.',
      geography_note: 'council_gss_code uses the DWP Stat-Xplore / Nomis native local authority geography (V_C_MASTERGEOG21_LA_TO_REGION / TYPE424), which differs from welfare_constituency_geography.council_gss_code for Barnsley and Sheffield (2025 boundary reorganisation) — see the welfare_local_authority_metrics schema migration header for the full translation note.',
    },
  }));

  console.log('\nInserting rebuilt summary rows...');
  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < summaryRows.length; i += BATCH_SIZE) {
    const batch = summaryRows.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await supabase
      .from('welfare_local_authority_summary')
      .insert(batch);
    if (insertErr) { console.error('Failed to insert summary batch:', insertErr.message); process.exit(1); }
    written += batch.length;
    console.log(`  Inserted ${written}/${summaryRows.length}`);
  }

  console.log(`\nDone. welfare_local_authority_summary rebuilt with ${written} England & Wales local authorities, headline_period_end=${headlinePeriodEnd}, baseline_period_end=${baselinePeriodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
