#!/usr/bin/env node
// READ-ONLY discovery script. Downloads DWP's "Benefit expenditure and
// caseload tables 2025" (Autumn Budget 2025 edition) and prints the full
// "Disability benefits" sheet (the same sheet PIP's expenditure/caseload
// rows were found in — row 10 / row 63) so DLA's equivalent rows can be
// identified by eye before computing an average award.
//
// Does NOT write to Supabase. Does NOT assume which row holds DLA's
// figures — prints enough of the actual sheet to let a human find them.
//
// SOURCE
// ──────
// https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025
// https://assets.publishing.service.gov.uk/media/694931be888ddc41b48a546f/outturn-and-forecast-tables-autumn-budget-2025.xlsx
//
// Usage: node scripts/fetch-dwp-dla-expenditure.js

'use strict';
const XLSX = require('xlsx');

const URL = 'https://assets.publishing.service.gov.uk/media/694931be888ddc41b48a546f/outturn-and-forecast-tables-autumn-budget-2025.xlsx';
const SHEET_NAME_MATCH = /disability benefits/i;

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
  const sheetNames = wb.SheetNames.filter((name) => SHEET_NAME_MATCH.test(name));

  if (sheetNames.length === 0) {
    console.log('\nNo sheet name matches "Disability benefits" — full sheet list:');
    wb.SheetNames.forEach((name, i) => console.log(`  [${i}] ${name}`));
    return;
  }

  sheetNames.forEach((name) => {
    console.log(`\n=== Sheet: ${name} (all rows mentioning "DLA" or "Disability Living Allowance", plus full row dump) ===`);
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
    console.log(`(${rows.length} total rows in this sheet — printing all of them)`);
    rows.forEach((row, i) => console.log(`  [${i}]`, JSON.stringify(row)));
  });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
