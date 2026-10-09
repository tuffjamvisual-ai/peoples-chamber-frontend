#!/usr/bin/env node
// Combined import script for the full-UK council public health metrics
// phase. Pulls all four confirmed sources, builds every row, verifies
// every GSS code against the real `councils` table before writing
// anything, and upserts into council_public_health_metrics.
//
// MUST be run AFTER the migration
// (scripts/migrations/2026-10-09-council-public-health-metrics-v2.sql)
// has been applied to the database.
//
// Sources (all confirmed live via discovery scripts earlier this
// session — see that migration's comments for the full verification
// history):
//   1. Fingertips (England) — smoking (92443), physical activity
//      (93014), obesity (93088).
//   2. ONS "Life expectancy for local areas of Great Britain" (XLSX) —
//      England + Wales + Scotland life expectancy.
//   3. ONS "Life expectancy for local areas in England, Northern
//      Ireland and Wales" (XLSX) — Northern Ireland life expectancy
//      only (England/Wales already covered by source 2).
//   4. Scottish Health Survey-Local area level data (CKAN, resource_id
//      0bba33f7-491e-4a77-b0ca-5a1d8a72f59f) — smoking, physical
//      activity (MVPA), obesity for Scotland.
//   Plus: explicit NULL/no_data_available rows for Wales and Northern
//   Ireland smoking/physical activity/obesity, per the user's explicit
//   decision — no local-authority-level source exists for either
//   nation for these three indicators.
//
// GSS CODE SAFETY NET
// ───────────────────────────────────────────────────────────────────
// Rather than re-verifying every single source's code vintage in a
// fresh discovery round, this script verifies EVERY row's
// council_gss_code against the real `councils` table before writing
// anything: known translations (Barnsley/Sheffield, the one confirmed
// recurring exception across this whole project) are applied first,
// then anything still unmatched is logged loudly and SKIPPED rather
// than written — so a bad code surfaces as a clear warning, not a
// silent wrong row in the database.
//
// Run from the project root:
//   node scripts/import-council-public-health-metrics.js

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Barnsley/Sheffield: the welfare import scripts translate OLD->NEW
// because the welfare tables use new 2025 codes. For this script, the
// councils table itself stores the old codes (E08000016/E08000019),
// so Fingertips and ONS life expectancy codes (which also return old
// codes) match directly — no translation needed here.
function translateGssCode(code) {
  return code;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ─── Source 1: Fingertips (England) ────────────────────────────────

async function fetchFingertipsIndicator(indicatorId) {
  const url = `https://fingertips.phe.org.uk/api/all_data/csv/by_indicator_id?indicator_ids=${indicatorId}&area_type_id=501&parent_area_type_id=15`;
  const res = await fetch(url);
  const text = await res.text();
  const rows = parseCsv(text);
  const header = rows[0];
  const data = rows.slice(1);
  const idx = (col) => header.indexOf(col);
  return { data, idx };
}

async function buildEnglandRows() {
  console.log('\nFetching Fingertips England data (smoking, physical activity, obesity)...');
  const rows = [];

  // Smoking (92443): Sex=Persons, Age="18+ yrs", blank Category Type, blank Category.
  {
    const { data, idx } = await fetchFingertipsIndicator(92443);
    const timeSortIdx = idx('Time period Sortable');
    const latest = [...new Set(data.map((r) => r[timeSortIdx]))].sort().pop();
    const matches = data.filter(
      (r) =>
        r[timeSortIdx] === latest &&
        r[idx('Sex')] === 'Persons' &&
        r[idx('Age')] === '18+ yrs' &&
        !r[idx('Category Type')] &&
        !r[idx('Category')] &&
        ['UA', 'District'].includes(r[idx('Area Type')]),
    );
    console.log(`  Smoking: ${matches.length} England council rows at period ${data.find((r) => r[timeSortIdx] === latest)[idx('Time period')]}`);
    for (const r of matches) {
      rows.push({
        council_gss_code: translateGssCode(r[idx('Area Code')]),
        council_name: r[idx('Area Name')],
        metric_key: 'smoking_prevalence',
        nation: 'England',
        source: 'fingertips',
        indicator_id: 92443,
        value: parseFloat(r[idx('Value')]),
        unit: 'percent',
        period_label: r[idx('Time period')],
        period_end: periodLabelToDate(r[idx('Time period')]),
      });
    }
  }

  // Physical activity (93014): Sex=Persons, Age="19+ yrs", blank Category Type, blank Category.
  {
    const { data, idx } = await fetchFingertipsIndicator(93014);
    const timeSortIdx = idx('Time period Sortable');
    const latest = [...new Set(data.map((r) => r[timeSortIdx]))].sort().pop();
    const matches = data.filter(
      (r) =>
        r[timeSortIdx] === latest &&
        r[idx('Sex')] === 'Persons' &&
        r[idx('Age')] === '19+ yrs' &&
        !r[idx('Category Type')] &&
        !r[idx('Category')] &&
        ['UA', 'District'].includes(r[idx('Area Type')]),
    );
    console.log(`  Physical activity: ${matches.length} England council rows at period ${data.find((r) => r[timeSortIdx] === latest)[idx('Time period')]}`);
    for (const r of matches) {
      rows.push({
        council_gss_code: translateGssCode(r[idx('Area Code')]),
        council_name: r[idx('Area Name')],
        metric_key: 'physical_activity_prevalence',
        nation: 'England',
        source: 'fingertips',
        indicator_id: 93014,
        value: parseFloat(r[idx('Value')]),
        unit: 'percent',
        period_label: r[idx('Time period')],
        period_end: periodLabelToDate(r[idx('Time period')]),
      });
    }
  }

  // Obesity (93088): Sex=Persons, Age="18+ yrs", blank Category Type, blank Category.
  {
    const { data, idx } = await fetchFingertipsIndicator(93088);
    const timeSortIdx = idx('Time period Sortable');
    const latest = [...new Set(data.map((r) => r[timeSortIdx]))].sort().pop();
    const matches = data.filter(
      (r) =>
        r[timeSortIdx] === latest &&
        r[idx('Sex')] === 'Persons' &&
        r[idx('Age')] === '18+ yrs' &&
        !r[idx('Category Type')] &&
        !r[idx('Category')] &&
        ['UA', 'District'].includes(r[idx('Area Type')]),
    );
    console.log(`  Obesity: ${matches.length} England council rows at period ${data.find((r) => r[timeSortIdx] === latest)[idx('Time period')]}`);
    for (const r of matches) {
      rows.push({
        council_gss_code: translateGssCode(r[idx('Area Code')]),
        council_name: r[idx('Area Name')],
        metric_key: 'obesity_prevalence',
        nation: 'England',
        source: 'fingertips',
        indicator_id: 93088,
        value: parseFloat(r[idx('Value')]),
        unit: 'percent',
        period_label: r[idx('Time period')],
        period_end: periodLabelToDate(r[idx('Time period')]),
      });
    }
  }

  return rows;
}

function periodLabelToDate(label) {
  // "2025" -> 2025-12-31. "2024/25" -> 2025-03-31 (UK financial year end).
  const fyMatch = label.match(/^(\d{4})\/(\d{2})$/);
  if (fyMatch) {
    const endYear = parseInt(fyMatch[1], 10) + 1;
    return `${endYear}-03-31`;
  }
  const yearMatch = label.match(/^(\d{4})$/);
  if (yearMatch) {
    return `${yearMatch[1]}-12-31`;
  }
  // "2019-2023" style multi-year window -> use the end year.
  const rangeMatch = label.match(/(\d{4})\D*$/);
  if (rangeMatch) {
    return `${rangeMatch[1]}-12-31`;
  }
  return null;
}

// ─── Sources 2 & 3: ONS life expectancy XLSX files ─────────────────

const GB_XLSX_URL =
  'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/healthandsocialcare/healthandlifeexpectancies/datasets/lifeexpectancyforlocalareasofgreatbritain/between2001to2003and2021to2023/lifeexpectancylocalareas.xlsx';

const EN_NI_WALES_XLSX_URL =
  'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/healthandsocialcare/healthandlifeexpectancies/datasets/lifeexpectancyforlocalareasinenglandnorthernirelandandwalesbetween2001to2003and2020to2022/between2001to2003and2020to2022/lifeexpectancylocalareas.xlsx';

const NATIONAL_ROLLUP_CODES = new Set(['E92000001', 'W92000004', 'S92000003', 'N92000002']);

async function loadLifeExpectancySheet(url) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const workbook = XLSX.read(buf, { type: 'buffer' });
  const sheet = workbook.Sheets['1'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  let headerRowIndex = -1;
  let col = {};
  for (let i = 0; i < rows.length; i++) {
    const codeIdx = rows[i].findIndex((c) => String(c).trim() === 'Area code');
    if (codeIdx !== -1) {
      headerRowIndex = i;
      col = {
        period: rows[i].findIndex((c) => String(c).trim() === 'Period'),
        country: rows[i].findIndex((c) => String(c).trim() === 'Country'),
        areaType: rows[i].findIndex((c) => String(c).trim() === 'Area type'),
        areaCode: codeIdx,
        areaName: rows[i].findIndex((c) => String(c).trim() === 'Area name'),
        sex: rows[i].findIndex((c) => String(c).trim() === 'Sex'),
        ageGroup: rows[i].findIndex((c) => String(c).trim() === 'Age group'),
        lifeExpectancy: (() => { const i2 = rows[i].findIndex((c) => String(c).trim() === 'Life expectancy'); return i2 !== -1 ? i2 : rows[i].findIndex((c) => String(c).trim() === 'Life expectancy (years)'); })(),
      };
      break;
    }
  }
  if (headerRowIndex === -1) throw new Error(`Could not find header row in ${url}`);
  return { dataRows: rows.slice(headerRowIndex + 1), col };
}

async function buildLifeExpectancyRowsForCountries(url, countryNames) {
  const { dataRows, col } = await loadLifeExpectancySheet(url);

  const rowsForCountries = dataRows.filter(
    (r) => countryNames.includes(String(r[col.country]).trim()) && String(r[col.areaType]).trim() === 'Local Areas',
  );

  const results = [];
  for (const country of countryNames) {
    const countryRows = rowsForCountries.filter((r) => String(r[col.country]).trim() === country);
    const periods = [...new Set(countryRows.map((r) => String(r[col.period]).trim()))].sort();
    const latestPeriod = periods[periods.length - 1];
    const latestRows = countryRows.filter((r) => String(r[col.period]).trim() === latestPeriod);

    const birthRows = latestRows.filter((r) => String(r[col.ageGroup]).trim() === '<1');
    for (const r of birthRows) {
      const code = String(r[col.areaCode]).trim();
      if (NATIONAL_ROLLUP_CODES.has(code)) continue;

      const sex = String(r[col.sex]).trim();
      const metricKey = sex === 'Male' ? 'life_expectancy_male' : sex === 'Female' ? 'life_expectancy_female' : null;
      if (!metricKey) continue;

      results.push({
        council_gss_code: translateGssCode(code),
        council_name: String(r[col.areaName]).trim(),
        metric_key: metricKey,
        nation: country,
        source: country === 'Northern Ireland' ? 'ons_life_expectancy_ni' : 'ons_life_expectancy_gb',
        indicator_id: null,
        value: parseFloat(r[col.lifeExpectancy]),
        unit: 'years',
        period_label: latestPeriod,
        period_end: periodLabelToDate(latestPeriod),
      });
    }
  }
  return results;
}

async function buildLifeExpectancyRows() {
  console.log('\nFetching ONS GB life expectancy file (England + Wales + Scotland)...');
  const gbRows = await buildLifeExpectancyRowsForCountries(GB_XLSX_URL, ['England', 'Wales', 'Scotland']);
  console.log(`  ${gbRows.length} rows built (England + Wales + Scotland, male + female).`);

  console.log('\nFetching ONS EN+NI+Wales life expectancy file (Northern Ireland only)...');
  const niRows = await buildLifeExpectancyRowsForCountries(EN_NI_WALES_XLSX_URL, ['Northern Ireland']);
  console.log(`  ${niRows.length} rows built (Northern Ireland, male + female).`);

  return [...gbRows, ...niRows];
}

// ─── Source 4: Scotland Health Survey (CKAN) ───────────────────────

const SCOTLAND_RESOURCE_ID = '0bba33f7-491e-4a77-b0ca-5a1d8a72f59f';

const SCOTLAND_INDICATORS = [
  { metricKey: 'smoking_prevalence', indicatorValue: 'Smoking status: Current smoker' },
  { metricKey: 'obesity_prevalence', indicatorValue: 'Overweight: Overweight (including obesity)' },
  { metricKey: 'physical_activity_prevalence', indicatorValue: 'Whether meets MVPA & muscle strengthening recommendations: Meets MVPA & muscle strengthening recommendations' },
];

async function fetchEntireScotlandResource() {
  console.log('\nDownloading the entire Scotland Health Survey resource (filters param proven unreliable on this field)...');
  const PAGE_SIZE = 5000;
  let offset = 0;
  let total = null;
  const all = [];
  do {
    const url = `https://api.data.gov.scot/api/3/action/datastore_search?resource_id=${SCOTLAND_RESOURCE_ID}&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(`CKAN paging error: ${JSON.stringify(json)}`);
    total = json.result.total;
    all.push(...json.result.records);
    offset += PAGE_SIZE;
  } while (offset < total);
  console.log(`  Downloaded ${all.length} rows.`);
  return all;
}

function buildScotlandRows(allRows) {
  const rows = [];
  for (const { metricKey, indicatorValue } of SCOTLAND_INDICATORS) {
    const indicatorRows = allRows.filter((r) => r['Scottish Health Survey Indicator'] === indicatorValue);
    const councilRows = indicatorRows.filter((r) => r.GeographyType === 'Council Areas');
    const dateCodes = [...new Set(councilRows.map((r) => r.DateCode))].sort();
    const latestDateCode = dateCodes[dateCodes.length - 1];
    const cleanRows = councilRows.filter(
      (r) => r.DateCode === latestDateCode && r.Measurement === 'Percent' && r.Sex === 'All',
    );
    console.log(`  ${metricKey}: ${cleanRows.length} Scotland council rows at period ${latestDateCode}`);
    for (const r of cleanRows) {
      rows.push({
        council_gss_code: r.GeographyCode,
        council_name: r.GeographyName,
        metric_key: metricKey,
        nation: 'Scotland',
        source: 'scottish_health_survey',
        indicator_id: null,
        value: parseFloat(r.Value),
        unit: 'percent',
        period_label: latestDateCode,
        period_end: periodLabelToDate(latestDateCode),
      });
    }
  }
  return rows;
}

// ─── Wales / NI: no_data_available rows ────────────────────────────

async function buildNoDataAvailableRows(councilsByCode) {
  const metricKeys = ['smoking_prevalence', 'physical_activity_prevalence', 'obesity_prevalence'];
  const rows = [];
  for (const [code, council] of councilsByCode) {
    let nation = null;
    if (code.startsWith('W06')) nation = 'Wales';
    if (code.startsWith('N09')) nation = 'Northern Ireland';
    if (!nation) continue;
    for (const metricKey of metricKeys) {
      rows.push({
        council_gss_code: code,
        council_name: council.name,
        metric_key: metricKey,
        nation,
        source: 'no_data_available',
        indicator_id: null,
        value: null,
        unit: null,
        period_label: null,
        period_end: null,
      });
    }
  }
  console.log(`\nBuilt ${rows.length} no_data_available rows for Wales + Northern Ireland (${metricKeys.length} metrics x councils).`);
  return rows;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('Loading councils table for GSS code verification...');
  const { data: councils, error } = await supabase.from('councils').select('gss_code,name');
  if (error) throw new Error(`Failed to load councils table: ${JSON.stringify(error)}`);
  const councilsByCode = new Map(councils.map((c) => [c.gss_code, c]));
  console.log(`  Loaded ${councils.length} councils.`);

  const englandRows = await buildEnglandRows();
  const lifeExpectancyRows = await buildLifeExpectancyRows();
  const scotlandAllRows = await fetchEntireScotlandResource();
  const scotlandRows = buildScotlandRows(scotlandAllRows);
  const noDataRows = await buildNoDataAvailableRows(councilsByCode);

  const allRows = [...englandRows, ...lifeExpectancyRows, ...scotlandRows, ...noDataRows];
  console.log(`\nTotal rows built across all sources: ${allRows.length}`);

  const verifiedRows = [];
  const unmatched = [];
  for (const row of allRows) {
    if (councilsByCode.has(row.council_gss_code)) {
      row.council_name = councilsByCode.get(row.council_gss_code).name;
      verifiedRows.push(row);
    } else {
      unmatched.push(row);
    }
  }

  console.log(`\nRows with a GSS code verified against councils table: ${verifiedRows.length}`);
  console.log(`Rows with an UNMATCHED GSS code (skipped, not written): ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('UNMATCHED rows (first 20):');
    for (const r of unmatched.slice(0, 20)) {
      console.log(`  ${r.council_gss_code} (${r.council_name}) — metric=${r.metric_key}, source=${r.source}`);
    }
  }

  console.log('\nUpserting verified rows into council_public_health_metrics in batches of 500...');
  const BATCH_SIZE = 500;
  let written = 0;
  for (let i = 0; i < verifiedRows.length; i += BATCH_SIZE) {
    const batch = verifiedRows.slice(i, i + BATCH_SIZE);
    const { error: upsertError } = await supabase
      .from('council_public_health_metrics')
      .upsert(batch, { onConflict: 'council_gss_code,metric_key' });
    if (upsertError) {
      console.log(`Batch ${i / BATCH_SIZE} FAILED:`, JSON.stringify(upsertError));
    } else {
      written += batch.length;
      console.log(`  Batch ${i / BATCH_SIZE}: wrote ${batch.length} rows (${written}/${verifiedRows.length} total so far).`);
    }
  }

  console.log(`\nDone. ${written} rows written.`);
}

main().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
