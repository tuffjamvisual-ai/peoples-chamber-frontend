#!/usr/bin/env node
// Rebuild welfare_constituency_summary: the denormalised, ranked summary
// table that powers fast page reads for the welfare explorer. Per the
// original schema migration's own design note, this is TRUNCATED AND
// REBUILT WHOLESALE after a validated import — never updated row by row.
//
// SCOPE: ENGLAND & WALES ONLY (575 constituencies) — NOT GB-WIDE
// ─────────────────────────────────────────────────────────────────
// This is a deliberate decision, confirmed with the project owner. PIP,
// DLA, and Carer's Allowance are devolved in Scotland (residents there
// receive Adult Disability Payment, Scottish Adult DLA/Child Disability
// Payment, and Carer Support Payment instead — see the Scotland-exclusion
// notes in import-welfare-pip.js / import-welfare-dla.js /
// import-welfare-ca.js). We have no figures for those Scottish-
// administered equivalents, so a Scottish constituency's six-benefit
// total would only ever include 3 of 6 benefits (UC, Housing Benefit,
// ESA) — summing and ranking that alongside England & Wales constituencies
// (which get all 6) would make every Scottish constituency look
// artificially cheap, which is misleading, not a genuine finding.
// Rather than show a partial, misleadingly-low total for Scotland, this
// summary table — and its ranking — is scoped to England & Wales only,
// matching TPA's own tool scope exactly. Scotland's real per-benefit data
// (UC, HB, ESA, plus the 'unavailable'-flagged devolved benefits) remains
// fully queryable from welfare_constituency_metrics directly; it's just
// not part of this particular ranked six-benefit summary.
//
// METHOD
// ──────
// For each of the 575 England & Wales constituencies:
//   total_six_benefit_spend = sum of the LATEST value for each of:
//     uc_spend_estimated_annual, pip_spend_estimated_annual,
//     hb_spend_estimated_annual, dla_spend_estimated_annual,
//     ca_spend_estimated_annual, esa_spend_estimated_annual
//   (each metric's own latest period_end is used independently — the six
//   benefits publish on different schedules, so "latest" necessarily means
//   different months for different benefits; TPA's own documented
//   methodology does exactly this and notes the resulting figures "may
//   relate to different months.")
//   spend_per_resident = total_six_benefit_spend / population_mid_year
//   rank_total_spend / rank_spend_per_resident = 1..575, descending
//   (rank 1 = highest)
//
// headline_period_end is set to the MOST RECENT of the six benefits'
// latest period_ends (the newest component), recorded alongside a
// per-benefit breakdown in metadata_json for full transparency.
//
// baseline_period_end / baseline_total_spend / cash_change /
// percentage_change (the "two-year change" feature) are left NULL here —
// not yet built; a future script will populate these once historical
// baseline data collection is in place.
//
// INTEGRITY CHECK
// ───────────────
// Every one of the 575 England & Wales constituencies must have a
// present, numeric value for all six benefit metrics and a population
// figure. Any constituency missing any of these aborts the whole rebuild
// with nothing written — a genuine gap here means something upstream
// broke, not a real zero.
//
// Run without --live to preview. Pass --live to truncate and rebuild
// welfare_constituency_summary.

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

async function fetchLatestByConstituency(metricKey) {
  const { data, error } = await supabase
    .from('welfare_constituency_metrics')
    .select('constituency_gss_code, value, status, period_end')
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
  for (const r of latestRows) {
    if (typeof r.value === 'number') map.set(r.constituency_gss_code, r.value);
  }
  return { map, latestPeriodEnd, rowCount: latestRows.length, valueCount: map.size };
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will truncate and rebuild welfare_constituency_summary) ---' : '--- DRY RUN (pass --live to rebuild) ---');

  console.log('\nFetching our own England & Wales constituency GSS code list from welfare_constituency_geography...');
  const { data: geoRows, error: geoErr } = await supabase
    .from('welfare_constituency_geography')
    .select('constituency_gss_code');
  if (geoErr) { console.error('Failed to read welfare_constituency_geography:', geoErr.message); process.exit(1); }
  const allGssCodes = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  const ewGssCodes = allGssCodes.filter((c) => !c.startsWith('S14'));
  console.log(`Found ${allGssCodes.length} GB constituencies; using the ${ewGssCodes.length} England & Wales ones for this summary (Scotland excluded — see header comment).`);

  console.log('\nFetching latest value for each of the six benefit spend metrics...');
  const benefitData = {};
  for (const key of SPEND_METRIC_KEYS) {
    const result = await fetchLatestByConstituency(key);
    benefitData[key] = result;
    console.log(`  ${key}: period_end=${result.latestPeriodEnd}, ${result.valueCount} numeric values out of ${result.rowCount} rows`);
  }

  console.log(`\nFetching latest '${POPULATION_METRIC_KEY}' values...`);
  const populationData = await fetchLatestByConstituency(POPULATION_METRIC_KEY);
  console.log(`  ${POPULATION_METRIC_KEY}: period_end=${populationData.latestPeriodEnd}, ${populationData.valueCount} numeric values`);

  const headlinePeriodEnd = Object.values(benefitData)
    .map((b) => b.latestPeriodEnd)
    .sort()
    .pop();
  console.log(`\nHeadline period_end (most recent of the six benefits' latest periods): ${headlinePeriodEnd}`);

  console.log('\nBuilding per-constituency totals...');
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
    const population = populationData.map.get(code);
    if (anyMissing || typeof population !== 'number') {
      missing.push({ code, anyMissing, hasPopulation: typeof population === 'number' });
      continue;
    }
    results.push({
      gss_code: code,
      total_six_benefit_spend: Math.round(total),
      population,
      spend_per_resident: total / population,
      breakdown,
    });
  }

  if (missing.length > 0) {
    console.error(`\n${missing.length} England & Wales constituency(ies) are missing a required value — ABORTING, nothing written.`);
    console.error(JSON.stringify(missing.slice(0, 10), null, 2));
    process.exit(1);
  }

  console.log(`\nIntegrity check passed: all ${results.length} England & Wales constituencies have all six benefit values and a population figure.`);

  // Rank by total spend (descending — rank 1 = highest) and separately by
  // spend per resident (descending — rank 1 = highest).
  const byTotal = [...results].sort((a, b) => b.total_six_benefit_spend - a.total_six_benefit_spend);
  byTotal.forEach((r, i) => { r.rank_total_spend = i + 1; });
  const byPerResident = [...results].sort((a, b) => b.spend_per_resident - a.spend_per_resident);
  byPerResident.forEach((r, i) => { r.rank_spend_per_resident = i + 1; });

  console.log('\nTop 5 by total spend:');
  byTotal.slice(0, 5).forEach((r) => console.log(`  #${r.rank_total_spend} ${r.gss_code}: £${r.total_six_benefit_spend.toLocaleString()}`));
  console.log('\nTop 5 by spend per resident:');
  byPerResident.slice(0, 5).forEach((r) => console.log(`  #${r.rank_spend_per_resident} ${r.gss_code}: £${r.spend_per_resident.toFixed(2)}/resident (population ${r.population.toLocaleString()})`));

  const totalSpendSum = results.reduce((s, r) => s + r.total_six_benefit_spend, 0);
  const totalPopulation = results.reduce((s, r) => s + r.population, 0);
  console.log(`\nEngland & Wales total six-benefit spend: £${totalSpendSum.toLocaleString()}`);
  console.log(`England & Wales total population: ${totalPopulation.toLocaleString()}`);
  console.log(`Implied overall average spend per resident: £${(totalSpendSum / totalPopulation).toFixed(2)}`);

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to truncate and rebuild welfare_constituency_summary.');
    return;
  }

  console.log('\nDeleting existing welfare_constituency_summary rows...');
  const { error: deleteErr } = await supabase
    .from('welfare_constituency_summary')
    .delete()
    .not('constituency_gss_code', 'is', null); // delete all rows (Supabase requires a filter)
  if (deleteErr) { console.error('Failed to delete existing summary rows:', deleteErr.message); process.exit(1); }
  console.log('  Deleted.');

  const now = new Date().toISOString();
  const summaryRows = results.map((r) => ({
    constituency_gss_code: r.gss_code,
    headline_period_end: headlinePeriodEnd,
    total_six_benefit_spend: r.total_six_benefit_spend,
    spend_per_resident: r.spend_per_resident,
    rank_total_spend: r.rank_total_spend,
    rank_spend_per_resident: r.rank_spend_per_resident,
    baseline_period_end: null,
    baseline_total_spend: null,
    cash_change: null,
    percentage_change: null,
    population: r.population,
    population_reference_year: 2024,
    latest_source_update: now,
    metadata_json: {
      benefit_breakdown: r.breakdown,
      benefit_period_ends: Object.fromEntries(SPEND_METRIC_KEYS.map((k) => [k, benefitData[k].latestPeriodEnd])),
      population_period_end: populationData.latestPeriodEnd,
      scope: 'england_and_wales_only',
      scope_reason: 'PIP, DLA, and Carer\'s Allowance are devolved in Scotland; Scottish-administered equivalents (ADP, SADLA/CDP, CSP) are not included here. Including Scotland with only 3 of 6 benefits would misleadingly understate its total relative to England & Wales.',
    },
  }));

  console.log('\nInserting rebuilt summary rows...');
  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < summaryRows.length; i += BATCH_SIZE) {
    const batch = summaryRows.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await supabase
      .from('welfare_constituency_summary')
      .insert(batch);
    if (insertErr) { console.error('Failed to insert summary batch:', insertErr.message); process.exit(1); }
    written += batch.length;
    console.log(`  Inserted ${written}/${summaryRows.length}`);
  }

  console.log(`\nDone. welfare_constituency_summary rebuilt with ${written} England & Wales constituencies, headline_period_end=${headlinePeriodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
