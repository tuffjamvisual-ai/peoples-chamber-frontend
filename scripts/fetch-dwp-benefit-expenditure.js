#!/usr/bin/env node
// READ-ONLY discovery script. Downloads DWP's "Benefit expenditure and
// caseload tables 2025" (Autumn Budget 2025 edition) and prints the sheet
// names plus a preview of any sheet whose name suggests it covers Universal
// Credit, so we can find the exact total-expenditure and total-caseload
// figures for a matching financial year before computing an average award.
//
// Does NOT write to Supabase. Does NOT assume which sheet/row holds the
// figures — prints enough of the actual workbook structure to let a human
// (or a follow-up script, once we know the real layout) find them.
//
// SOURCE
// ──────
// https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025
// Direct file (Autumn Budget 2025, the current latest edition — no 2026
// edition exists yet as of October 2026):
// https://assets.publishing.service.gov.uk/media/694931be888ddc41b48a546f/outturn-and-forecast-tables-autumn-budget-2025.xlsx
//
// Usage: node scripts/fetch-dwp-benefit-expenditure.js

'use strict';
const XLSX = require('xlsx');

const URL = 'https://assets.publishing.service.gov.uk/media/694931be888ddc41b48a546f/outturn-and-forecast-tables-autumn-budget-2025.xlsx';

async function main() {
  console.log(`Fetching ${URL} ...`);
  const res = await fetch(URL);
  if (!res.ok) {
    console.error(`Download failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`Downloaded ${buf.length.toLocaleString()} bytes. Parsing workbook...`);

  const wb = XLSX.read(buf, { type: 'buffer' });
  console.log(`\n${wb.SheetNames.length} sheet(s) found:`);
  wb.SheetNames.forEach((name, i) => console.log(`  [${i}] ${name}`));

  const ucSheets = wb.SheetNames.filter((name) =>
    /universal credit|\buc\b/i.test(name),
  );

  if (ucSheets.length === 0) {
    console.log('\nNo sheet name obviously matches "Universal Credit" or "UC" — printing first 15 sheet names\' first 10 rows each so a human can identify the right one.');
    wb.SheetNames.slice(0, 15).forEach((name) => {
      console.log(`\n--- Sheet: ${name} (first 10 rows) ---`);
      const sheet = wb.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      rows.slice(0, 10).forEach((row, i) => console.log(`  [${i}]`, JSON.stringify(row)));
    });
    return;
  }

  console.log(`\n${ucSheets.length} sheet(s) matching "Universal Credit"/"UC":`);
  ucSheets.forEach((name) => console.log(`  - ${name}`));

  ucSheets.forEach((name) => {
    console.log(`\n=== Sheet: ${name} (first 25 rows, raw) ===`);
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
    rows.slice(0, 25).forEach((row, i) => console.log(`  [${i}]`, JSON.stringify(row)));
    console.log(`  (${rows.length} total rows in this sheet)`);
  });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
