// Combined council service spending import — England, Scotland, Wales.
// Northern Ireland deliberately excluded: confirmed via the NI Audit
// Office's own 2026 Local Government Auditor's Report that no comparable
// per-council, per-service breakdown is published for NI councils.
//
// Sources (all free, no API key, all live-verified on 2026-10-09):
//
// ENGLAND — MHCLG "Local authority revenue expenditure and financing
// England 2025 to 2026" RSX workbook (ODS). Row 6 = real header, data
// rows 7 onward. Column 1 = "ONS Code" (verbatim GSS code, no
// translation). 13 services, each with a genuine
// "<Service> - Net Current Expenditure (C7 = C3 - C6)" column, located
// dynamically by exact header-string match rather than hardcoded column
// index. Also imports the "Total Service Expenditure" aggregate.
//
// SCOTLAND — 8 separate per-service LFR workbooks (xlsx), one sheet per
// council (32 real council sheets, confirmed against the live councils
// table). The LFR 00 "Services Summary" workbook was checked first and
// is NOT usable — it's a cost-type x service matrix with no per-service
// total row at all. Each per-service workbook instead has a row labelled
// exactly "Net Revenue Expenditure on a funding basis" (NOT the
// "...: 2023-24" prior-year variant) and a "Total <ServiceName>" column,
// where <ServiceName> is read directly from the sheet's own row 0 title
// ("LFR 0X: <ServiceName>") rather than hardcoded, so the column is
// located by matching that derived text against the header rows — this
// was confirmed identically on 2 of 8 workbooks (Education, Social Work)
// with genuinely different internal layouts, and the same derivation is
// trusted for the other 6 rather than manually re-verified one by one.
// One sheet-name override is needed: the LFR workbooks use "Na h-Eileanan
// Siar", but the live councils table stores the Gaelic form "Comhairle
// nan Eilean Siar" for S12000013 — confirmed via the live cross-check
// script, not assumed.
//
// WALES — StatsWales open API (api.stats.gov.wales/v2), dataset
// 213aeb99-18eb-42c9-b00e-e4b716e82cdf ("Revenue outturn expenditure, by
// authority and service"). No API key. 11 real service categories plus
// a "Revenue expenditure" aggregate, confirmed for year 2024-25. Values
// come in BOTH "£ thousand" and "£ per head" — only "£ thousand" rows are
// used. Authority names (not GSS codes) are mapped to the live councils
// table; all 22 matched cleanly in the cross-check script, no overrides
// needed.
//
// All values are converted from £ thousand to actual pounds
// (value_pounds = raw * 1000) so England/Scotland/Wales are directly
// comparable despite different source formats.
//
// Safety net (same pattern as the public health import): every row is
// checked against a live snapshot of the councils table before writing;
// any GSS code that doesn't match a real row is SKIPPED and logged, never
// silently written.

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────────────────────────────────
// ENGLAND
// ─────────────────────────────────────────────────────────────────────────

const ENGLAND_RSX_URL =
  'https://assets.publishing.service.gov.uk/media/6ab26f73997a4b2950cced10/RSX_LA_Data_2025-26_data_by_LA.ods';

const ENGLAND_SERVICES = [
  'Education services',
  'Highways and transport services',
  'Children Social Care',
  'Adult Social Care',
  'Public Health',
  'Housing services (GFRA only)',
  'Cultural and related services',
  'Environmental and regulatory services',
  'Planning and development services',
  'Police services',
  'Fire and rescue services',
  'Central services',
  'Other services',
  'Total Service Expenditure',
];

async function buildEnglandRows(councilsByGss) {
  console.log('Downloading England RSX workbook...');
  const res = await fetch(ENGLAND_RSX_URL, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`England RSX download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames.find((n) => /RSX_LA_Data/i.test(n));
  if (!sheetName) throw new Error('England RSX: could not find the RSX_LA_Data sheet');
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null, raw: true });

  const headerRowIndex = rows.findIndex((r) => r && r[1] === 'ONS Code');
  if (headerRowIndex === -1) throw new Error('England RSX: could not find the header row (ONS Code column)');
  const header = rows[headerRowIndex];

  const colIndexByService = {};
  for (const service of ENGLAND_SERVICES) {
    const wanted = `${service} - Net Current Expenditure (C7 = C3 - C6)`;
    const idx = header.findIndex((h) => h === wanted);
    if (idx === -1) throw new Error(`England RSX: could not find column "${wanted}"`);
    colIndexByService[service] = idx;
  }

  const out = [];
  let skipped = 0;
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const gss = row[1];
    const name = row[2];
    if (typeof gss !== 'string' || !/^E\d{8}$/.test(gss)) continue; // not a real council row
    if (!councilsByGss.has(gss)) {
      skipped++;
      continue;
    }
    for (const service of ENGLAND_SERVICES) {
      const raw = row[colIndexByService[service]];
      if (typeof raw !== 'number') continue;
      out.push({
        council_gss_code: gss,
        council_name: name,
        nation: 'England',
        source: 'mhclg_rsx',
        service_category: service,
        value_pounds: raw * 1000,
        period_label: '2025-26',
        period_end: '2026-03-31',
        metadata_json: { raw_thousands: raw },
      });
    }
  }
  console.log(`England: built ${out.length} rows, skipped ${skipped} rows with no matching council.`);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// SCOTLAND
// ─────────────────────────────────────────────────────────────────────────

const SCOTLAND_WORKBOOKS = [
  {
    label: 'Education',
    url:
      'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2026/02/scottish-local-government-finance-statistics-slgfs-2024-25-workbooks/documents/2024-25-lfr-01---education---published-on-3-february-2026/2024-25-lfr-01---education---published-on-3-february-2026/govscot%3Adocument/2024-25%2BLFR%2B01%2B-%2BEducation%2B-%2Brevised%2Bon%2B30%2BJune%2B2026.xlsx',
  },
  {
    label: 'Culture',
    url:
      'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2026/02/scottish-local-government-finance-statistics-slgfs-2024-25-workbooks/documents/2024-25-lfr-02---culture---published-on-3-february-2026/2024-25-lfr-02---culture---published-on-3-february-2026/govscot%3Adocument/2024-25%2BLFR%2B02%2B-%2BCulture%2B-%2Brevised%2Bon%2B30%2BJune%2B2026.xlsx',
  },
  {
    label: 'Social Work',
    url:
      'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2026/02/scottish-local-government-finance-statistics-slgfs-2024-25-workbooks/documents/2024-25-lfr-03---social-work---published-on-3-february-2026/2024-25-lfr-03---social-work---published-on-3-february-2026/govscot%3Adocument/2024-25%2BLFR%2B03%2B-%2BSocial%2BWork%2B-%2Brevised%2Bon%2B30%2BJune%2B2026.xlsx',
  },
  {
    label: 'Roads and Transport',
    url:
      'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2026/02/scottish-local-government-finance-statistics-slgfs-2024-25-workbooks/documents/2024-25-lfr-05---roads--transport---published-on-3-february-2026/2024-25-lfr-05---roads--transport---published-on-3-february-2026/govscot%3Adocument/2024-25%2BLFR%2B05%2B-%2BRoads%2B%2526%2BTransport%2B-%2Brevised%2Bon%2B30%2BJune%2B2026.xlsx',
  },
  {
    label: 'Environmental',
    url:
      'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2026/02/scottish-local-government-finance-statistics-slgfs-2024-25-workbooks/documents/2024-25-lfr-06---environmental---published-on-3-february-2026/2024-25-lfr-06---environmental---published-on-3-february-2026/govscot%3Adocument/2024-25%2BLFR%2B06%2B-%2BEnvironmental%2B-%2Brevised%2Bon%2B30%2BJune%2B2026.xlsx',
  },
  {
    label: 'Planning',
    url:
      'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2026/02/scottish-local-government-finance-statistics-slgfs-2024-25-workbooks/documents/2024-25-lfr-07---planning---published-on-3-february-2026/2024-25-lfr-07---planning---published-on-3-february-2026/govscot%3Adocument/2024-25%2BLFR%2B07%2B-%2BPlanning%2B-%2Brevised%2Bon%2B30%2BJune%2B2026.xlsx',
  },
  {
    label: 'Central Services',
    url:
      'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2026/02/scottish-local-government-finance-statistics-slgfs-2024-25-workbooks/documents/2024-25-lfr-09---central-services---published-on-3-february-2026/2024-25-lfr-09---central-services---published-on-3-february-2026/govscot%3Adocument/2024-25%2BLFR%2B09%2B-%2BCentral%2BServices%2B-%2Brevised%2Bon%2B30%2BJune%2B2026.xlsx',
  },
  {
    label: 'Non-HRA Housing',
    url:
      'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2026/02/scottish-local-government-finance-statistics-slgfs-2024-25-workbooks/documents/2024-25-lfr-20---non-hra-housing---published-on-3-february-2026/2024-25-lfr-20---non-hra-housing---published-on-3-february-2026/govscot%3Adocument/2024-25%2BLFR%2B20%2B-%2BNon-HRA%2BHousing%2B-%2Brevised%2Bon%2B30%2BJune%2B2026.xlsx',
  },
];

const SCOTLAND_SHEET_NAMES = [
  'Aberdeen City', 'Aberdeenshire', 'Angus', 'Argyll & Bute', 'City of Edinburgh',
  'Clackmannanshire', 'Dumfries & Galloway', 'Dundee City', 'East Ayrshire',
  'East Dunbartonshire', 'East Lothian', 'East Renfrewshire', 'Falkirk', 'Fife',
  'Glasgow City', 'Highland', 'Inverclyde', 'Midlothian', 'Moray',
  'Na h-Eileanan Siar', 'North Ayrshire', 'North Lanarkshire', 'Orkney Islands',
  'Perth & Kinross', 'Renfrewshire', 'Scottish Borders', 'Shetland Islands',
  'South Ayrshire', 'South Lanarkshire', 'Stirling', 'West Dunbartonshire', 'West Lothian',
];

// Confirmed via discover-scotland-wales-spending-name-crosscheck.js
// against the live councils table on 2026-10-09.
const SCOTLAND_SHEET_NAME_TO_GSS_OVERRIDE = {
  'Na h-Eileanan Siar': 'S12000013', // live table stores "Comhairle nan Eilean Siar"
};

function normalizeCouncilName(name) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\bcouncil\b/g, '')
    .replace(/\bcity\b/g, '')
    .replace(/\bcounty\b/g, '')
    .replace(/\bborough\b/g, '')
    .replace(/[^a-z]/g, '');
}

function normalizeHeaderText(cell) {
  if (typeof cell !== 'string') return null;
  return cell.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/&/g, 'and').trim();
}

async function buildScotlandRows(scotlandCouncilsByName) {
  const out = [];
  let totalSkipped = 0;

  for (const workbook of SCOTLAND_WORKBOOKS) {
    console.log(`Downloading Scotland LFR workbook: ${workbook.label}...`);
    const res = await fetch(workbook.url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Scotland ${workbook.label} download failed: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });

    for (const sheetName of SCOTLAND_SHEET_NAMES) {
      if (!wb.SheetNames.includes(sheetName)) {
        console.warn(`  WARNING: sheet "${sheetName}" not found in ${workbook.label} workbook — skipping.`);
        totalSkipped++;
        continue;
      }
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null, raw: true });

      // Service name derived from the sheet's own title row, not hardcoded.
      const titleCell = normalizeHeaderText(rows[0] && rows[0][1]);
      if (!titleCell || !titleCell.includes(':')) {
        throw new Error(`Scotland ${workbook.label} / ${sheetName}: could not read title row 0`);
      }
      const serviceName = titleCell.split(':').slice(1).join(':').trim();
      const wantedTotalHeader = `Total ${serviceName}`;

      // Find the "Total <ServiceName>" column by scanning the first 10 rows.
      let totalColIndex = -1;
      for (let r = 0; r < Math.min(10, rows.length) && totalColIndex === -1; r++) {
        const row = rows[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          if (normalizeHeaderText(row[c]) === wantedTotalHeader) {
            totalColIndex = c;
            break;
          }
        }
      }
      if (totalColIndex === -1) {
        throw new Error(
          `Scotland ${workbook.label} / ${sheetName}: could not find column "${wantedTotalHeader}" in the first 10 rows`,
        );
      }

      // Find the row labelled EXACTLY "Net Revenue Expenditure on a funding basis".
      const netRowIndex = rows.findIndex(
        (r) => r && normalizeHeaderText(r[1]) === 'Net Revenue Expenditure on a funding basis',
      );
      if (netRowIndex === -1) {
        throw new Error(
          `Scotland ${workbook.label} / ${sheetName}: could not find the "Net Revenue Expenditure on a funding basis" row`,
        );
      }

      const value = rows[netRowIndex][totalColIndex];
      if (typeof value !== 'number') {
        console.warn(`  WARNING: ${workbook.label} / ${sheetName}: net expenditure value is not numeric (${JSON.stringify(value)}) — skipping.`);
        totalSkipped++;
        continue;
      }

      const gss =
        SCOTLAND_SHEET_NAME_TO_GSS_OVERRIDE[sheetName] ||
        scotlandCouncilsByName.get(normalizeCouncilName(sheetName));
      if (!gss) {
        console.warn(`  WARNING: no GSS match for Scotland sheet "${sheetName}" — skipping.`);
        totalSkipped++;
        continue;
      }

      out.push({
        council_gss_code: gss,
        council_name: sheetName,
        nation: 'Scotland',
        source: 'scotland_lfr',
        service_category: serviceName,
        value_pounds: value * 1000,
        period_label: '2024-25',
        period_end: '2025-03-31',
        metadata_json: { raw_thousands: value, source_workbook: workbook.label },
      });
    }
  }
  console.log(`Scotland: built ${out.length} rows, skipped ${totalSkipped}.`);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// WALES
// ─────────────────────────────────────────────────────────────────────────

const WALES_DATASET_ID = '213aeb99-18eb-42c9-b00e-e4b716e82cdf';
const WALES_API_BASE = `https://api.stats.gov.wales/v2/${WALES_DATASET_ID}/data`;

const WALES_AUTHORITY_NAMES = [
  'Blaenau Gwent', 'Bridgend', 'Caerphilly', 'Cardiff', 'Carmarthenshire', 'Ceredigion',
  'Conwy', 'Denbighshire', 'Flintshire', 'Gwynedd', 'Isle of Anglesey', 'Merthyr Tydfil',
  'Monmouthshire', 'Neath Port Talbot', 'Newport', 'Pembrokeshire', 'Powys',
  'Rhondda Cynon Taf', 'Swansea', 'Torfaen', 'Vale of Glamorgan', 'Wrexham',
];

const WALES_LATEST_YEAR = '2024-25';

async function buildWalesRows(walesCouncilsByName) {
  console.log('Downloading Wales StatsWales data...');
  const allRows = [];
  let pageNumber = 1;
  while (true) {
    const url = `${WALES_API_BASE}?format=json&page_size=5000&page_number=${pageNumber}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Wales API failed on page ${pageNumber}: HTTP ${res.status}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    allRows.push(...page);
    if (page.length < 5000) break;
    pageNumber++;
  }
  console.log(`Wales: fetched ${allRows.length} total rows across all years/authorities/services.`);

  const latestRows = allRows.filter(
    (r) => r.Year === WALES_LATEST_YEAR && r['Data description'] === '£ thousand' && WALES_AUTHORITY_NAMES.includes(r.Authority),
  );

  const out = [];
  let skipped = 0;
  for (const r of latestRows) {
    const gss = walesCouncilsByName.get(normalizeCouncilName(r.Authority));
    if (!gss) {
      skipped++;
      continue;
    }
    if (typeof r['Data values'] !== 'number') continue;
    out.push({
      council_gss_code: gss,
      council_name: r.Authority,
      nation: 'Wales',
      source: 'statswales',
      service_category: r.Service,
      value_pounds: r['Data values'] * 1000,
      period_label: WALES_LATEST_YEAR,
      period_end: '2025-03-31',
      metadata_json: { raw_thousands: r['Data values'] },
    });
  }
  console.log(`Wales: built ${out.length} rows, skipped ${skipped} rows with no matching council.`);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  const { data: councils, error } = await supabase.from('councils').select('gss_code, name, country');
  if (error) throw error;
  console.log(`Loaded ${councils.length} councils from the live table for the GSS safety-net check.`);

  const councilsByGss = new Set(councils.map((c) => c.gss_code));
  const scotlandCouncilsByName = new Map(
    councils.filter((c) => c.country === 'Scotland').map((c) => [normalizeCouncilName(c.name), c.gss_code]),
  );
  const walesCouncilsByName = new Map(
    councils.filter((c) => c.country === 'Wales').map((c) => [normalizeCouncilName(c.name), c.gss_code]),
  );

  const englandRows = await buildEnglandRows(councilsByGss);
  const scotlandRows = await buildScotlandRows(scotlandCouncilsByName);
  const walesRows = await buildWalesRows(walesCouncilsByName);

  const allRows = [...englandRows, ...scotlandRows, ...walesRows];
  console.log(`\nTotal rows to write: ${allRows.length}`);

  // Final safety net: every row's GSS code must exist in the live councils table.
  const badRows = allRows.filter((r) => !councilsByGss.has(r.council_gss_code));
  if (badRows.length > 0) {
    console.error(`FATAL: ${badRows.length} rows have a GSS code not present in the live councils table:`);
    for (const r of badRows.slice(0, 20)) console.error(`  ${r.nation} / ${r.council_name} / ${r.council_gss_code}`);
    process.exit(1);
  }

  const BATCH_SIZE = 500;
  let written = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error: upsertError } = await supabase
      .from('council_service_spending')
      .upsert(batch, { onConflict: 'council_gss_code,service_category' });
    if (upsertError) throw upsertError;
    written += batch.length;
    console.log(`Written ${written} / ${allRows.length}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
