// Pulls IPSA individualBusinessCosts CSVs (one row per claim) and bulk-loads
// into mp_expenses_detail via psql \copy. Joins on Parliamentary ID == member_id.
//
// Usage:
//   node scripts/sync-ipsa-expenses-detail.js                # default: 24_25
//   node scripts/sync-ipsa-expenses-detail.js 24_25 23_24
//
// Source: https://www.theipsa.org.uk/api/download?type=individualBusinessCosts&year=YY_YY
// 24 columns: Parliamentary ID, Year, Date, Claim Number, Name, Constituency,
// Category, Cost Type, Short Description, Details, Journey Type, From, To,
// Travel, Nights, Mileage, Amount Claimed, Amount Paid, Amount Not Paid,
// Amount Repaid, Status, Reason If Not Paid, Supply Month, Supply Period.
//
// Idempotent per year: deletes WHERE year=X then \copies the fresh data.

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const argv = process.argv.slice(2);
// IPSA publishes detail (individualBusinessCosts) per quarter with ~2-3
// months lag, so the very-latest months drift in over time. Re-sync is
// idempotent per year (deletes by year, then COPYs the fresh CSV), so
// running on a year that's still filling in is safe.
const YEARS = argv.length > 0 ? argv : ['26_27', '25_26', '24_25'];

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
  if (rows.length && rows[0].length) rows[0][0] = rows[0][0].replace(/^﻿+/, '');
  return rows;
}

const num = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || /^N\/A$/i.test(s)) return null;
  const n = Number(s.replace(/£|,|\s/g, ''));
  return Number.isFinite(n) ? n : null;
};

// DD/MM/YYYY -> YYYY-MM-DD
const toIsoDate = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
};

// CSV-safe escape for a field about to be written into our staging file
const csvEsc = (v) => {
  if (v == null) return '';
  const s = String(v);
  if (s === '') return '';
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

async function fetchYear(year) {
  const url = `https://www.theipsa.org.uk/api/download?type=individualBusinessCosts&year=${year}`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', Accept: 'text/csv,*/*' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for year ${year}`);
  return res.text();
}

function rowsToTsv(year, csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [0, ''];
  const header = rows[0].map((h) => h.trim());
  const idx = (label) => header.findIndex((h) => h.toLowerCase() === label.toLowerCase());
  const cols = {
    pid: idx('Parliamentary ID'),
    year: idx('Year'),
    date: idx('Date'),
    claim: idx('Claim Number'),
    name: idx('Name'),
    cons: idx('Constituency'),
    cat: idx('Category'),
    cost: idx('Cost Type'),
    short: idx('Short Description'),
    detail: idx('Details'),
    jt: idx('Journey Type'),
    from: idx('From'),
    to: idx('To'),
    travel: idx('Travel'),
    nights: idx('Nights'),
    mileage: idx('Mileage'),
    claimed: idx('Amount Claimed'),
    paid: idx('Amount Paid'),
    notpaid: idx('Amount Not Paid'),
    repaid: idx('Amount Repaid'),
    status: idx('Status'),
    reason: idx('Reason If Not Paid'),
    sm: idx('Supply Month'),
    sp: idx('Supply Period'),
  };
  const missing = Object.entries(cols).filter(([, v]) => v === -1).map(([k]) => k);
  if (missing.length) throw new Error(`year ${year}: missing CSV columns: ${missing.join(', ')}`);

  // Output column order must match the COPY column list in main()
  const out = [];
  let written = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < header.length - 1) continue;
    const pid = parseInt(String(r[cols.pid]).trim(), 10);
    if (!Number.isFinite(pid)) continue;
    out.push([
      csvEsc(r[cols.claim] || ''),
      String(pid),
      csvEsc(year),
      csvEsc(toIsoDate(r[cols.date])),
      csvEsc(r[cols.name] || ''),
      csvEsc(r[cols.cons] || ''),
      csvEsc(r[cols.cat] || ''),
      csvEsc(r[cols.cost] || ''),
      csvEsc(r[cols.short] || ''),
      csvEsc(r[cols.detail] || ''),
      csvEsc(r[cols.jt] || ''),
      csvEsc(r[cols.from] || ''),
      csvEsc(r[cols.to] || ''),
      csvEsc(r[cols.travel] || ''),
      csvEsc(num(r[cols.nights])),
      csvEsc(num(r[cols.mileage])),
      csvEsc(num(r[cols.claimed])),
      csvEsc(num(r[cols.paid])),
      csvEsc(num(r[cols.notpaid])),
      csvEsc(num(r[cols.repaid])),
      csvEsc(r[cols.status] || ''),
      csvEsc(r[cols.reason] || ''),
      csvEsc(r[cols.sm] || ''),
      csvEsc(r[cols.sp] || ''),
    ].join(','));
    written++;
  }
  return [written, out.join('\n') + '\n'];
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipsa-detail-'));
  console.log(`Staging dir: ${tmpDir}`);

  for (const year of YEARS) {
    // IPSA returns either 403 (year not enabled) or a header-only CSV
    // (year enabled but empty) for the not-yet-published current year.
    // Skip both gracefully rather than crashing the COPY with an empty
    // file or aborting the whole run.
    let csv;
    try {
      csv = await fetchYear(year);
    } catch (e) {
      console.log(`  year ${year}: ${e.message} — skipping`);
      continue;
    }
    const [count, tsv] = rowsToTsv(year, csv);
    if (count === 0) {
      console.log(`  year ${year}: 0 rows — skipping (IPSA hasn't published any detail yet)`);
      continue;
    }
    console.log(`  year ${year}: parsed ${count} rows`);
    const stagePath = path.join(tmpDir, `${year}.csv`);
    fs.writeFileSync(stagePath, tsv);

    const sqlScript = `
BEGIN;
DELETE FROM mp_expenses_detail WHERE year = '${year}';
\\copy mp_expenses_detail (claim_number, member_id, year, claim_date, mp_name, constituency, category, cost_type, short_description, details, journey_type, journey_from, journey_to, travel, nights, mileage, amount_claimed, amount_paid, amount_not_paid, amount_repaid, status, reason_if_not_paid, supply_month, supply_period) FROM '${stagePath}' WITH (FORMAT csv, NULL '');
COMMIT;
`.trim();
    const sqlPath = path.join(tmpDir, `${year}.sql`);
    fs.writeFileSync(sqlPath, sqlScript + '\n');

    console.log(`  loading ${stagePath} via psql...`);
    const t0 = Date.now();
    execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], { stdio: 'inherit' });
    console.log(`  loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // Cleanup
  for (const f of fs.readdirSync(tmpDir)) fs.unlinkSync(path.join(tmpDir, f));
  fs.rmdirSync(tmpDir);
  console.log('Done.');
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
