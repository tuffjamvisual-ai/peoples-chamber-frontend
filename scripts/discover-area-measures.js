// READ-ONLY check for the area league table (England first). Writes NOTHING.
//
// For every English district, unitary, metropolitan and London borough area (the
// 296 areas that together cover England) it works out each candidate measure as a
// rate or share, and reports per measure: how many areas have a figure, the period,
// the spread (min / median / max), the population or household base used, and any
// area missing. County-run services (schools, children's services, roads, adult
// social care) are taken from the county council for each of its districts.
// It also prints every measure for five sample areas so the figures can be checked
// by eye.
//
// Usage:
//   node scripts/discover-area-measures.js > area-measures-check.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SAMPLES = ['Cornwall', 'Leeds', 'Guildford', 'Tower Hamlets', 'Rutland', 'Barnsley', 'Sheffield'];
// Areas too small for reliable rates (a handful of events swings the figure); their
// rate-based measures are left out and the page would say so.
const SMALL_AREAS = { E09000001: 'City of London', E06000053: 'Isles of Scilly' };
const RATE_MEASURES = new Set(['crime', 'roads', 'temp_accommodation']);
// ONS mid-year population estimates (all ages) for every district / unitary area, via Nomis
// (dataset NM_2002_1, free, no key needed for this size of request).
const NOMIS_POP = 'https://www.nomisweb.co.uk/api/v01/dataset/NM_2002_1.data.csv?geography=TYPE424&date=latest&gender=0&c_age=200&measures=20100&select=date_name,geography_code,geography_name,obs_value';
const CODE_ALIASES = { E08000038: 'E08000016', E08000039: 'E08000019' };

(async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  async function all(table, cols, filter) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      let q = db.from(table).select(cols).range(from, from + 999);
      if (filter) q = filter(q);
      const { data, error } = await q;
      if (error) throw new Error(`${table}: ${error.message}`);
      out.push(...data);
      if (data.length < 1000) break;
    }
    return out;
  }

  const councils = await all('councils', 'gss_code, name, short_name, slug, type, country, parent_slug, population');
  const bySlug = new Map(councils.map((c) => [c.slug, c]));
  const areas = councils.filter((c) => c.country === 'England' && c.type !== 'county' && c.gss_code);
  const upper = (a) => (a.type === 'district' && a.parent_slug ? bySlug.get(a.parent_slug) : a); // provider of county-run services
  // Official population (ONS mid-year estimate).
  const ons = new Map(); let onsYear = null;
  {
    const res = await fetch(NOMIS_POP);
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/).slice(1);
    for (const l of lines) {
      const m = l.match(/^"?([^",]*)"?,"?([^",]*)"?,"?(.*?)"?,"?([\d.]+)"?$/);
      if (!m) continue;
      onsYear = m[1];
      ons.set(CODE_ALIASES[m[2]] || m[2], Number(m[4]));
    }
    console.log(`ONS population: ${ons.size} areas, ${onsYear}`);
  }
  console.log(`=== Area measures check (England) ===\nareas: ${areas.length}; with population: ${areas.filter((a) => a.population).length}; districts with a county: ${areas.filter((a) => a.type === 'district' && a.parent_slug && bySlug.get(a.parent_slug)).length} of ${areas.filter((a) => a.type === 'district').length}`);
  const noPop = areas.filter((a) => !a.population).map((a) => a.name);
  if (noPop.length) console.log(`areas without population in the councils table: ${noPop.join(', ')}`);
  const noOns = areas.filter((a) => !ons.has(a.gss_code)).map((a) => `${a.name} ${a.gss_code}`);
  console.log(`areas without an ONS population: ${noOns.length}${noOns.length ? ` - ${noOns.join(', ')}` : ''}`);
  const bigDiff = areas.filter((a) => a.population && ons.has(a.gss_code) && Math.abs(a.population - ons.get(a.gss_code)) / ons.get(a.gss_code) > 0.05);
  console.log(`areas whose councils-table population differs from ONS by more than 5%: ${bigDiff.length}${bigDiff.length ? ` - ${bigDiff.slice(0, 20).map((a) => `${a.short_name || a.name} ${a.population} vs ${ons.get(a.gss_code)}`).join('; ')}` : ''}`);
  for (const code of ['E08000016', 'E08000019']) console.log(`  ONS population ${code}: ${ons.get(code)}`);
  const pop = (a) => ons.get(a.gss_code) || null;

  const measures = {}; // key -> { label, period, base, values: Map(code -> number), better: 'higher'|'lower' }
  const add = (key, label, better, period, base) => (measures[key] = { label, better, period, base, values: new Map() });

  // Schools: % of schools whose latest graded inspection was Good or Outstanding (by the area's education authority).
  {
    const rows = await all('school_inspections', 'la_gss_code, oeif_overall, oeif_quality, oeif_relates_to_current, rc_category, rc_relates_to_current');
    const t = {}; let rcOnly = 0;
    for (const r of rows) {
      const k = r.la_gss_code; const g = String(r.oeif_overall || '').trim();
      const q = String(r.oeif_quality || '').trim();
      t[k] = t[k] || { graded: 0, good: 0, total: 0, qGraded: 0, qGood: 0 };
      t[k].total++;
      if (/^[1-4]$/.test(g)) { t[k].graded++; if (g === '1' || g === '2') t[k].good++; }
      else if (r.rc_category) rcOnly++;
      if (/^[1-4]$/.test(q)) { t[k].qGraded++; if (q === '1' || q === '2') t[k].qGood++; }
    }
    const qVals = {}; for (const r of rows) { const q = String(r.oeif_quality || '').trim() || '(blank)'; qVals[q] = (qVals[q] || 0) + 1; }
    console.log(`schools: oeif_quality (quality of education) values: ${JSON.stringify(qVals)}`);
    const vals = {}; for (const r of rows) { const g = String(r.oeif_overall || '').trim() || '(blank)'; vals[g] = (vals[g] || 0) + 1; }
    console.log(`\nschools: ${rows.length} schools; oeif_overall values: ${JSON.stringify(vals)}; schools with only a new-style report card: ${rcOnly}`);
    add('schools_quality', '% of schools Good or Outstanding for quality of education (latest inspection)', 'higher', 'Ofsted snapshot 31 March 2026', 'schools with a quality of education judgement');
    add('schools_overall_old', '(reference only) % Good or Outstanding overall - mostly pre-September 2024 inspections', 'higher', 'Ofsted snapshot', 'schools with an overall grade');
    const share = [];
    for (const a of areas) {
      const u = upper(a); const x = u && t[u.gss_code];
      if (x && x.qGraded) { measures.schools_quality.values.set(a.gss_code, (x.qGood / x.qGraded) * 100); share.push(x.qGraded / x.total); }
      if (x && x.graded) measures.schools_overall_old.values.set(a.gss_code, (x.good / x.graded) * 100);
    }
    share.sort((a, b) => a - b);
    console.log(`schools: share of an area's schools with a quality of education judgement - min ${Math.round(share[0] * 100)}%, median ${Math.round(share[Math.floor(share.length / 2)] * 100)}%`);
  }

  // Ofsted children's services and CQC (council_ratings), by provider.
  {
    let rows = [];
    try { rows = await all('council_ratings', 'measure, council_gss_code, period, value_num, grade_rank'); } catch (e) { console.log(`\ncouncil_ratings: ${e.message} (not created or empty yet)`); }
    const by = (m) => new Map(rows.filter((r) => r.measure === m).map((r) => [r.council_gss_code, r]));
    const of = by('ofsted_childrens_services'), cqc = by('cqc_adult_social_care'), rec = by('recycling_rate'), pmaj = by('planning_major_speed'), pnon = by('planning_nonmajor_speed');
    console.log(`\ncouncil_ratings rows: ${rows.length} (ofsted ${of.size}, cqc ${cqc.size}, recycling ${rec.size}, planning major ${pmaj.size}, non-major ${pnon.size})`);
    add('childrens_services', "Ofsted children's services grade (1 best .. 4 worst)", 'lower', 'as at 31 March 2026', 'grade');
    add('adult_social_care', 'CQC adult social care grade (1 best .. 4 worst)', 'lower', 'latest assessment', 'grade');
    add('recycling', '% household waste recycled, reused or composted', 'higher', '2024-25', 'household waste');
    add('planning_major', '% major planning decisions on time (24 months, with penalty)', 'higher', '24 months to June 2026', 'decisions');
    add('planning_nonmajor', '% non-major planning decisions on time (24 months, with penalty)', 'higher', '24 months to June 2026', 'decisions');
    for (const a of areas) {
      const u = upper(a);
      if (u && of.get(u.gss_code)) measures.childrens_services.values.set(a.gss_code, of.get(u.gss_code).grade_rank);
      if (u && cqc.get(u.gss_code) && cqc.get(u.gss_code).grade_rank) measures.adult_social_care.values.set(a.gss_code, cqc.get(u.gss_code).grade_rank);
      if (rec.get(a.gss_code)) measures.recycling.values.set(a.gss_code, Number(rec.get(a.gss_code).value_num));
      if (pmaj.get(a.gss_code)) measures.planning_major.values.set(a.gss_code, Number(pmaj.get(a.gss_code).value_num));
      if (pnon.get(a.gss_code)) measures.planning_nonmajor.values.set(a.gss_code, Number(pnon.get(a.gss_code).value_num));
    }
  }

  // Crime: police.uk has no total rows, so add up the crime categories per area and month,
  // leaving out anti-social behaviour (police.uk lists it, but it is not a recorded crime).
  {
    const rows = await all('council_crime_stats', 'council_gss_code, period_label, crime_category, count', (q) => q.eq('source', 'police_uk').eq('is_total', false));
    const cats = {}; for (const r of rows) cats[r.crime_category] = (cats[r.crime_category] || 0) + 1;
    console.log(`\ncrime categories (police.uk): ${Object.keys(cats).sort().join(' | ')}`);
    const months = [...new Set(rows.map((r) => r.period_label))].sort();
    const last12 = months.slice(-12);
    const sum = {}; const seenMonths = {};
    for (const r of rows) {
      if (!last12.includes(r.period_label) || /anti-?social/i.test(r.crime_category)) continue;
      sum[r.council_gss_code] = (sum[r.council_gss_code] || 0) + r.count;
      (seenMonths[r.council_gss_code] = seenMonths[r.council_gss_code] || new Set()).add(r.period_label);
    }
    add('crime', 'Recorded crimes per 1,000 residents (12 months, excluding anti-social behaviour)', 'lower', `${last12[0]} to ${last12[last12.length - 1]}`, `residents (ONS ${onsYear})`);
    const partial = [];
    for (const a of areas) {
      if (sum[a.gss_code] == null || !pop(a)) continue;
      measures.crime.values.set(a.gss_code, (sum[a.gss_code] / pop(a)) * 1000);
      if (seenMonths[a.gss_code].size < 12) partial.push(`${a.name} (${seenMonths[a.gss_code].size} months)`);
    }
    console.log(`crime: months held ${months.length} (${months[0]} to ${months[months.length - 1]}); areas with fewer than 12 months in the window: ${partial.length}${partial.length ? ` - ${partial.slice(0, 10).join(', ')}` : ''}`);
  }

  // Roads: killed or seriously injured (adjusted) per billion vehicle miles, latest year (by highway authority).
  {
    const rows = await all('council_road_casualties', 'council_gss_code, year, measure, casualties, rate_per_bn_miles', (q) => q.eq('measure', 'ksi_adjusted'));
    const latest = Math.max(...rows.map((r) => r.year));
    const by = new Map(rows.filter((r) => r.year === latest).map((r) => [r.council_gss_code, r]));
    add('roads', 'Road deaths and serious injuries per billion vehicle miles (adjusted)', 'lower', String(latest), 'vehicle miles');
    for (const a of areas) { const u = upper(a); const r = u && by.get(u.gss_code); if (r && r.rate_per_bn_miles != null) measures.roads.values.set(a.gss_code, Number(r.rate_per_bn_miles)); }
  }

  // Health: life expectancy and obesity.
  {
    const rows = await all('council_public_health_metrics', 'council_gss_code, metric_key, value, period_label');
    for (const [key, metric, label, better] of [['life_exp_f', 'life_expectancy_female', 'Life expectancy, women (years)', 'higher'], ['life_exp_m', 'life_expectancy_male', 'Life expectancy, men (years)', 'higher'], ['obesity', 'obesity_prevalence', '% adults overweight or obese', 'lower']]) {
      const all_ = rows.filter((r) => r.metric_key === metric && r.value != null);
      const periods = {}; for (const r of all_) periods[r.period_label] = (periods[r.period_label] || 0) + 1;
      // Use only the period most areas share, so every area is compared on the same years.
      const period = Object.entries(periods).sort((a, b) => b[1] - a[1])[0]?.[0];
      console.log(`\n${metric}: periods held ${JSON.stringify(periods)}; using "${period}" only`);
      const sel = all_.filter((r) => r.period_label === period);
      add(key, label, better, period, 'published rate');
      const by = new Map(sel.map((r) => [r.council_gss_code, Number(r.value)]));
      for (const a of areas) { const v = by.get(a.gss_code) ?? by.get(upper(a)?.gss_code); if (v != null) measures[key].values.set(a.gss_code, v); }
      const fromCounty = areas.filter((a) => !by.has(a.gss_code) && upper(a) && by.has(upper(a).gss_code)).length;
      if (fromCounty) console.log(`\n${metric}: ${fromCounty} districts take their county's figure`);
    }
  }

  // Jobs and poverty.
  {
    const cc = await all('council_claimant_count', 'council_gss_code, month, rate');
    const latest = cc.map((r) => r.month).sort().pop();
    const ccBy = new Map(cc.filter((r) => r.month === latest).map((r) => [r.council_gss_code, r.rate]));
    add('claimants', '% of residents aged 16-64 claiming unemployment-related benefits', 'lower', latest, 'residents 16-64');
    const cp = await all('council_child_poverty', 'council_gss_code, measure, fye, percentage');
    const cpFye = Math.max(...cp.filter((r) => r.measure === 'relative_ahc').map((r) => r.fye));
    const cpBy = new Map(cp.filter((r) => r.measure === 'relative_ahc' && r.fye === cpFye).map((r) => [r.council_gss_code, r.percentage]));
    add('child_poverty', '% of children in relative poverty (after housing costs)', 'lower', `FYE ${cpFye}`, 'children');
    const fp = await all('council_fuel_poverty', 'council_gss_code, data_year, percentage');
    const fpYear = Math.max(...fp.map((r) => r.data_year));
    const fpBy = new Map(fp.filter((r) => r.data_year === fpYear).map((r) => [r.council_gss_code, r.percentage]));
    add('fuel_poverty', '% of households in fuel poverty', 'lower', String(fpYear), 'households');
    for (const a of areas) {
      if (ccBy.get(a.gss_code) != null) measures.claimants.values.set(a.gss_code, Number(ccBy.get(a.gss_code)));
      if (cpBy.get(a.gss_code) != null) measures.child_poverty.values.set(a.gss_code, Number(cpBy.get(a.gss_code)));
      if (fpBy.get(a.gss_code) != null) measures.fuel_poverty.values.set(a.gss_code, Number(fpBy.get(a.gss_code)));
    }
    const cpMeasures = [...new Set(cp.map((r) => r.measure))];
    console.log(`\nchild poverty measures held: ${cpMeasures.join(', ')}`);
  }

  // Housing: households in temporary accommodation per 1,000 households (latest quarter).
  {
    const rows = await all('council_homelessness', 'council_gss_code, period_start, period_label, ta_total, households_thousands');
    const latest = rows.map((r) => r.period_start).sort().pop();
    const by = new Map(rows.filter((r) => r.period_start === latest).map((r) => [r.council_gss_code, r]));
    add('temp_accommodation', 'Households in temporary accommodation per 1,000 households', 'lower', rows.find((r) => r.period_start === latest)?.period_label, 'households');
    let suppressed = 0;
    for (const a of areas) { const r = by.get(a.gss_code); if (r && r.ta_total != null && r.households_thousands) measures.temp_accommodation.values.set(a.gss_code, r.ta_total / Number(r.households_thousands)); else if (r) suppressed++; }
    console.log(`\ntemporary accommodation: areas with a row but no usable figure (suppressed or missing): ${suppressed}`);
  }

  // Environment: sewage spill hours per overflow with figures (2025).
  {
    const rows = await all('sewage_area_totals', 'area_type, area_gss_code, year, overflows_with_data, spill_hours', (q) => q.eq('area_type', 'council').eq('year', 2025));
    const by = new Map(rows.map((r) => [r.area_gss_code, r]));
    add('sewage', 'Sewage spill hours per storm overflow with figures', 'lower', '2025', 'overflows with figures');
    let none = 0;
    for (const a of areas) { const r = by.get(a.gss_code); if (r && r.overflows_with_data) measures.sewage.values.set(a.gss_code, Number(r.spill_hours) / r.overflows_with_data); else none++; }
    console.log(`\nsewage: areas with no storm overflows listed: ${none} (no figure; they would not be marked down)`);
  }

  // Connectivity.
  {
    const bb = await all('council_broadband', 'council_gss_code, data_month, all_premises, gigabit_n');
    const m = await all('council_mobile_coverage', 'council_gss_code, data_month, g4_in_none_pct, g4_in_all_pct');
    add('gigabit', '% of premises able to get gigabit broadband', 'higher', bb[0]?.data_month, 'premises');
    add('indoor_4g_all', '% of premises with indoor 4G from all four networks', 'higher', m[0]?.data_month, 'premises');
    const bbBy = new Map(bb.map((r) => [r.council_gss_code, r])); const mBy = new Map(m.map((r) => [r.council_gss_code, r]));
    for (const a of areas) {
      const b = bbBy.get(a.gss_code); if (b && b.gigabit_n != null && b.all_premises) measures.gigabit.values.set(a.gss_code, (b.gigabit_n / b.all_premises) * 100);
      const x = mBy.get(a.gss_code); if (x && x.g4_in_all_pct != null) measures.indoor_4g_all.values.set(a.gss_code, Number(x.g4_in_all_pct));
    }
  }

  for (const [key, m] of Object.entries(measures)) if (RATE_MEASURES.has(key)) for (const code of Object.keys(SMALL_AREAS)) m.values.delete(code);
  console.log(`\nsmall areas left out of rate measures (${[...RATE_MEASURES].join(', ')}): ${Object.values(SMALL_AREAS).join(', ')}`);
  console.log('\n=== Coverage per measure ===');
  for (const [key, m] of Object.entries(measures)) {
    const v = [...m.values.values()].sort((a, b) => a - b);
    const missing = areas.filter((a) => !m.values.has(a.gss_code)).map((a) => a.short_name || a.name);
    const f = (x) => (x == null ? '-' : Math.round(x * 10) / 10);
    console.log(`  ${key}: ${m.label} | ${m.better} is better | period ${m.period} | base ${m.base}`);
    console.log(`      areas with a figure ${v.length} of ${areas.length}; min ${f(v[0])}, median ${f(v[Math.floor(v.length / 2)])}, max ${f(v[v.length - 1])}${missing.length ? `; missing (${missing.length}): ${missing.slice(0, 25).join(', ')}${missing.length > 25 ? ' ...' : ''}` : ''}`);
  }

  console.log('\n=== Sample areas ===');
  for (const s of SAMPLES) {
    const a = areas.find((x) => x.short_name === s || x.name.startsWith(s));
    if (!a) { console.log(`  ${s}: not found`); continue; }
    const u = upper(a);
    console.log(`  ${a.name} (${a.type}${u !== a ? `, county services from ${u ? u.name : '?'}` : ''}, ONS population ${pop(a) ?? '?'})`);
    for (const [key, m] of Object.entries(measures)) { const v = m.values.get(a.gss_code); console.log(`      ${key}: ${v == null ? '-' : Math.round(v * 10) / 10}`); }
  }
  console.log('\nDone. Nothing was written.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
