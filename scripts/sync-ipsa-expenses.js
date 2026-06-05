// Pulls IPSA totalSpend CSVs (annual aggregate per MP) and upserts into
// mp_expenses_summary keyed on member_id + year. Joins on pID == member_id.
//
// Usage:
//   node scripts/sync-ipsa-expenses.js                # default: 24_25 and 23_24
//   node scripts/sync-ipsa-expenses.js 24_25 23_24 22_23
//
// Source format reference:
//   https://www.theipsa.org.uk/api/download?type=totalSpend&year=YY_YY
//   CSV columns: MP's name, Previous constituency, Constituency since 5 July 2024,
//                Office budget, Reason..., Office spend, Remaining office budget,
//                Staffing budget, Reason..., Staffing spend, Remaining...,
//                Winding-up budget, Reason..., Winding-up spend, Remaining...,
//                Accommodation budget, Reason..., Accommodation spend, Remaining...,
//                Travel and subsistence (uncapped), Other costs (uncapped), pID

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required (psql is used to bypass anon RLS)'); process.exit(1); }

const argv = process.argv.slice(2);
// Default to the four most recent years. IPSA publishes the totalSpend
// (annual summary) ~3-4 months after the FY closes, so newer years
// will return 'no data' until the year-end reconciliation completes —
// that's expected and the per-year handler just logs and skips.
const YEARS = argv.length > 0 ? argv : ['26_27', '25_26', '24_25', '23_24'];

function parseCsv(text) {
  const rows = [];
  let cur = '';
  let row = [];
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { cur += c; }
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  // strip BOM(s) from first cell
  if (rows.length && rows[0].length) rows[0][0] = rows[0][0].replace(/^﻿+/, '');
  return rows;
}

function pounds(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || /^N\/A$/i.test(s)) return null;
  const cleaned = s.replace(/£|,|\s/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const sqlEsc = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
const sqlNum = (v) => v == null ? 'NULL' : String(v);

async function fetchYear(year) {
  const url = `https://www.theipsa.org.uk/api/download?type=totalSpend&year=${year}`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', Accept: 'text/csv,*/*' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for year ${year}`);
  return res.text();
}

function rowsForYear(year, csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (label) => header.findIndex((h) => h.toLowerCase() === label.toLowerCase());
  const cols = {
    name: idx("MP's name"),
    officeBudget: idx('Office budget'),
    officeSpend: idx('Office spend'),
    staffingBudget: idx('Staffing budget'),
    staffingSpend: idx('Staffing spend'),
    windUpBudget: idx('Winding-up budget'),
    windUpSpend: idx('Winding-up spend'),
    accomBudget: idx('Accommodation budget'),
    accomSpend: idx('Accommodation spend'),
    travel: idx('Travel and subsistence (uncapped)'),
    other: idx('Other costs (uncapped)'),
    pid: idx('pID'),
  };
  const missing = Object.entries(cols).filter(([, v]) => v === -1).map(([k]) => k);
  if (missing.length) throw new Error(`year ${year}: missing CSV columns: ${missing.join(', ')}`);
  // Constituency column varies by year: 'Constituency since 5 July 2024' (24_25),
  // 'Constituency' (most years), or 'Previous constituency' (24_25 fallback).
  const consColIdxs = [
    header.findIndex((h) => /^Constituency since/i.test(h)),
    header.findIndex((h) => /^Constituency$/i.test(h)),
    header.findIndex((h) => /^Previous constituency$/i.test(h)),
  ].filter((i) => i !== -1);

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < header.length - 1) continue; // ragged trailing line
    const pid = parseInt(String(r[cols.pid]).trim(), 10);
    if (!Number.isFinite(pid)) continue;
    const officeSpend = pounds(r[cols.officeSpend]);
    const staffingSpend = pounds(r[cols.staffingSpend]);
    const windUpSpend = pounds(r[cols.windUpSpend]);
    const accomSpend = pounds(r[cols.accomSpend]);
    const travel = pounds(r[cols.travel]);
    const other = pounds(r[cols.other]);
    const total = [officeSpend, staffingSpend, windUpSpend, accomSpend, travel, other]
      .reduce((a, b) => a + (b || 0), 0);

    out.push({
      member_id: pid,
      year,
      mp_name: (r[cols.name] || '').trim(),
      constituency: (() => {
        for (const i of consColIdxs) {
          const v = (r[i] || '').trim();
          if (v && v !== 'N/A') return v;
        }
        return null;
      })(),
      office_budget: pounds(r[cols.officeBudget]),
      office_spend: officeSpend,
      staffing_budget: pounds(r[cols.staffingBudget]),
      staffing_spend: staffingSpend,
      winding_up_budget: pounds(r[cols.windUpBudget]),
      winding_up_spend: windUpSpend,
      accommodation_budget: pounds(r[cols.accomBudget]),
      accommodation_spend: accomSpend,
      travel_subsistence_spend: travel,
      other_costs_spend: other,
      total_spend: Number(total.toFixed(2)),
    });
  }
  return out;
}

async function main() {
  const all = [];
  for (const year of YEARS) {
    // IPSA returns 403 for years they haven't enabled yet (most often
    // the not-yet-closed current year). Skip and continue rather than
    // aborting the whole run — the older years are still worth syncing.
    let csv;
    try {
      csv = await fetchYear(year);
    } catch (e) {
      console.log(`  year ${year}: ${e.message} — skipping`);
      continue;
    }
    if (!csv || csv.trim().toLowerCase().startsWith('no data')) {
      console.log(`  year ${year}: IPSA returned 'no data' — skipping (year-end totals not yet published)`);
      continue;
    }
    const rows = rowsForYear(year, csv);
    console.log(`  year ${year}: parsed ${rows.length} rows`);
    all.push(...rows);
  }
  console.log(`Total rows to upsert: ${all.length}`);

  if (all.length === 0) { console.log('Nothing to write.'); return; }

  const sqlPath = path.join(__dirname, '.sync-ipsa-expenses.sql');
  const lines = ['BEGIN;'];
  for (const r of all) {
    lines.push(
      `INSERT INTO mp_expenses_summary
       (member_id, year, mp_name, constituency,
        office_budget, office_spend, staffing_budget, staffing_spend,
        winding_up_budget, winding_up_spend, accommodation_budget, accommodation_spend,
        travel_subsistence_spend, other_costs_spend, total_spend, updated_at)
       VALUES (${r.member_id}, ${sqlEsc(r.year)}, ${sqlEsc(r.mp_name)}, ${sqlEsc(r.constituency)},
        ${sqlNum(r.office_budget)}, ${sqlNum(r.office_spend)}, ${sqlNum(r.staffing_budget)}, ${sqlNum(r.staffing_spend)},
        ${sqlNum(r.winding_up_budget)}, ${sqlNum(r.winding_up_spend)}, ${sqlNum(r.accommodation_budget)}, ${sqlNum(r.accommodation_spend)},
        ${sqlNum(r.travel_subsistence_spend)}, ${sqlNum(r.other_costs_spend)}, ${sqlNum(r.total_spend)}, now())
       ON CONFLICT (member_id, year) DO UPDATE SET
         mp_name = EXCLUDED.mp_name,
         constituency = EXCLUDED.constituency,
         office_budget = EXCLUDED.office_budget,
         office_spend  = EXCLUDED.office_spend,
         staffing_budget = EXCLUDED.staffing_budget,
         staffing_spend  = EXCLUDED.staffing_spend,
         winding_up_budget = EXCLUDED.winding_up_budget,
         winding_up_spend  = EXCLUDED.winding_up_spend,
         accommodation_budget = EXCLUDED.accommodation_budget,
         accommodation_spend  = EXCLUDED.accommodation_spend,
         travel_subsistence_spend = EXCLUDED.travel_subsistence_spend,
         other_costs_spend = EXCLUDED.other_costs_spend,
         total_spend = EXCLUDED.total_spend,
         updated_at = now();`
    );
  }
  lines.push('COMMIT;');
  fs.writeFileSync(sqlPath, lines.join('\n') + '\n');
  console.log(`Wrote SQL → ${sqlPath}`);

  console.log('Executing via psql...');
  execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], { stdio: 'inherit' });
  fs.unlinkSync(sqlPath);
  console.log('Done.');
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
