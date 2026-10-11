// Import recorded crime by council into council_crime_stats, from each
// nation's own source. See scripts/migrations/2026-10-11e-council-crime.sql
// for what each source is and why. All sources live-verified 2026-10-11 by
// scripts/discover-crime-sources.js and discover-crime-sources-2.js.
//
// Usage:
//   node scripts/import-council-crime.js --source=police-uk [--months=N] [--dry-run] [--heartbeat]
//   node scripts/import-council-crime.js --source=psni --url=<workbook link> [--dry-run] [--heartbeat]
//   node scripts/import-council-crime.js --source=scotland [--url=<tables xlsx>] [--dry-run]
//
//   --months=N   police-uk only: import the newest N months in the archive
//                (default 36 = everything). The weekly GitHub Actions job uses
//                12, re-importing the last year so revisions are picked up.
//   --url        psni: the "Police Recorded Crime Tables Period Ending ..." xlsx
//                link. Needed in practice: PSNI's web pages sit behind Cloudflare,
//                which blocks automated visits (verified 2026-10-11: HTTP 403 for
//                every user agent tried), while direct file downloads are allowed
//                (HTTP 200). So the page can't be read to find each month's link,
//                and NI is refreshed by hand monthly with the link copied from a
//                browser. Without --url the script still tries the page once, and
//                stops with a clear message if it's blocked.
//                scotland: the new year's tables xlsx (defaults to 2024-25).
//   --heartbeat  record the run in sync_heartbeat for the freshness monitor,
//                under a per-source route ('/github-actions/council-crime-police-uk'
//                or '-psni'), so one source failing can't be masked by another
//                succeeding.
//
// Every write is an upsert on (council, source, period, category), so any
// run can be repeated safely. Nothing is ever deleted.
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from
// .env.local locally, or GitHub Actions secrets).

require('dotenv').config({ path: '.env.local', quiet: true });
const zlib = require('zlib');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const SOURCE = args.source;
const DRY_RUN = !!args['dry-run'];
const HEARTBEAT = !!args.heartbeat;
const HEARTBEAT_ROUTE = `/github-actions/council-crime-${SOURCE}`;

const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const POLICE_ARCHIVE = 'https://data.police.uk/data/archive/latest.zip';
const LSOA_LOOKUP = 'https://open-geography-portalx-ons.hub.arcgis.com/api/download/v1/items/f29a49574cc84f6d8e6e59ce2d8efb18/csv?layers=0';
const PSNI_PAGE = 'https://www.psni.police.uk/about-us/our-publications-and-reports/official-statistics/police-recorded-crime-statistics';
const SCOT_DEFAULT = 'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2025/06/recorded-crime-scotland-2024-25/documents/recorded-crime-in-scotland-2024-25-tables/recorded-crime-in-scotland-2024-25-tables/govscot%3Adocument/Recorded%2BCrime%2Bin%2BScotland%2B2024-25%2Btables.xlsx';

// LAD25 codes that differ from the councils table (which keeps the codes
// DWP/Nomis use — see app/api/councils/lookup/route.ts).
const LAD_TO_COUNCIL_CODE = { E08000038: 'E08000016', E08000039: 'E08000019' };
// Scottish Government table names that don't normalise to the councils
// table's name.
const SCOT_NAME_OVERRIDE = { 'Na h-Eileanan Siar': 'S12000013' };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function normName(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(council|city|county|borough|district|of|the)\b/g, '')
    .replace(/[^a-z]/g, '');
}

function parseCsvLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function fetchRetry(url, opts = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { ...opts, headers: { ...UA, ...(opts.headers || {}) }, redirect: 'follow' });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * attempt * attempt));
    }
  }
  throw lastErr;
}

async function loadCouncils() {
  const { data, error } = await db.from('councils').select('gss_code, name, short_name, country');
  if (error) throw new Error(`councils read: ${error.message}`);
  return data;
}

async function upsertRows(rows) {
  if (DRY_RUN) return;
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 1000) {
    const batch = rows.slice(i, i + 1000).map((r) => ({ ...r, updated_at: now }));
    const { error } = await db
      .from('council_crime_stats')
      .upsert(batch, { onConflict: 'council_gss_code,source,period_type,period_start,crime_category' });
    if (error) throw new Error(`council_crime_stats upsert: ${error.message}`);
  }
}

// ── England & Wales: data.police.uk ──────────────────────────────────────
// The archive is ~1.7 GB; only the street-crime CSVs for the months being
// imported are read, via HTTP Range requests on the zip (the archive host
// supports byte ranges — verified).

async function rangeGet(url, start, end) {
  const res = await fetchRetry(url, { headers: { Range: `bytes=${start}-${end}` } });
  if (res.status !== 206) throw new Error(`Range request not honoured (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function zipDirectory(url) {
  const head = await fetchRetry(url, { method: 'HEAD' });
  const size = Number(head.headers.get('content-length'));
  const finalUrl = head.url || url;
  if (!size) throw new Error('No content-length on archive');
  const tailLen = Math.min(size, 1 << 20);
  const tail = await rangeGet(finalUrl, size - tailLen, size - 1);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('End of central directory not found');
  let cdSize = tail.readUInt32LE(eocd + 12);
  let cdOffset = tail.readUInt32LE(eocd + 16);
  let entries = tail.readUInt16LE(eocd + 10);
  if (cdOffset === 0xffffffff || entries === 0xffff) {
    const loc = eocd - 20;
    if (tail.readUInt32LE(loc) !== 0x07064b50) throw new Error('ZIP64 locator not found');
    const z64Off = Number(tail.readBigUInt64LE(loc + 8));
    const z64 = await rangeGet(finalUrl, z64Off, z64Off + 55);
    cdSize = Number(z64.readBigUInt64LE(40));
    cdOffset = Number(z64.readBigUInt64LE(48));
  }
  const cd = await rangeGet(finalUrl, cdOffset, cdOffset + cdSize - 1);
  const files = [];
  let p = 0;
  while (p < cd.length && cd.readUInt32LE(p) === 0x02014b50) {
    const method = cd.readUInt16LE(p + 10);
    let compSize = cd.readUInt32LE(p + 20);
    let uncompSize = cd.readUInt32LE(p + 24);
    const nameLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const commentLen = cd.readUInt16LE(p + 32);
    let localOff = cd.readUInt32LE(p + 42);
    const name = cd.slice(p + 46, p + 46 + nameLen).toString('utf8');
    let e = p + 46 + nameLen;
    const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = cd.readUInt16LE(e), len = cd.readUInt16LE(e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        if (uncompSize === 0xffffffff) { uncompSize = Number(cd.readBigUInt64LE(q)); q += 8; }
        if (compSize === 0xffffffff) { compSize = Number(cd.readBigUInt64LE(q)); q += 8; }
        if (localOff === 0xffffffff) { localOff = Number(cd.readBigUInt64LE(q)); }
      }
      e += 4 + len;
    }
    files.push({ name, method, compSize, localOff });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { url: finalUrl, files };
}

async function readZipEntry(url, f) {
  const lh = await rangeGet(url, f.localOff, f.localOff + 29);
  const nameLen = lh.readUInt16LE(26), extraLen = lh.readUInt16LE(28);
  const start = f.localOff + 30 + nameLen + extraLen;
  const data = await rangeGet(url, start, start + f.compSize - 1);
  if (f.method === 0) return data.toString('utf8');
  if (f.method === 8) return zlib.inflateRawSync(data).toString('utf8');
  throw new Error(`Unsupported compression method ${f.method} for ${f.name}`);
}

async function importPoliceUk() {
  const months = args.months ? Number(args.months) : 36;
  if (!Number.isInteger(months) || months < 1 || months > 36) throw new Error('--months must be 1-36');

  const councils = await loadCouncils();
  const byCode = new Map(councils.map((c) => [c.gss_code, c]));

  console.log('Loading ONS LSOA21 -> LAD25 lookup');
  const lres = await fetchRetry(LSOA_LOOKUP);
  if (!lres.ok) throw new Error(`lookup HTTP ${lres.status}`);
  const llines = (await lres.text()).split(/\r?\n/).filter(Boolean);
  const lh = parseCsvLine(llines[0].replace(/^﻿/, ''));
  const iL = lh.indexOf('LSOA21CD'), iLad = lh.indexOf('LAD25CD');
  if (iL < 0 || iLad < 0) throw new Error(`lookup columns changed: ${lh.join(',')}`);
  const lsoaToCouncil = new Map();
  for (const line of llines.slice(1)) {
    const c = parseCsvLine(line);
    lsoaToCouncil.set(c[iL], LAD_TO_COUNCIL_CODE[c[iLad]] || c[iLad]);
  }
  console.log(`  ${lsoaToCouncil.size.toLocaleString()} LSOAs`);

  console.log('Reading data.police.uk archive directory');
  const zip = await zipDirectory(POLICE_ARCHIVE);
  const street = zip.files.filter((f) => /^\d{4}-\d{2}\/\d{4}-\d{2}-.+-street\.csv$/.test(f.name));
  const allMonths = [...new Set(street.map((f) => f.name.slice(0, 7)))].sort();
  const wanted = allMonths.slice(-months);
  console.log(`  archive months ${allMonths[0]} to ${allMonths[allMonths.length - 1]}; importing ${wanted[0]} to ${wanted[wanted.length - 1]} (${wanted.length})`);

  let grandRows = 0, totalCrimes = 0, uncoded = 0, unresolved = 0, noCouncil = 0;
  const unresolvedCodes = new Map();
  const noCouncilCodes = new Set();
  for (const month of wanted) {
    const files = street.filter((f) => f.name.startsWith(month + '/') && !/northern-ireland/.test(f.name));
    const agg = new Map(); // council|type -> count
    let monthCrimes = 0;
    for (const f of files) {
      const lines = (await readZipEntry(zip.url, f)).split(/\r?\n/).filter(Boolean);
      const h = parseCsvLine(lines[0]);
      const iCode = h.indexOf('LSOA code'), iType = h.indexOf('Crime type');
      if (iCode < 0 || iType < 0) throw new Error(`${f.name}: columns changed`);
      for (const line of lines.slice(1)) {
        const c = parseCsvLine(line);
        totalCrimes++; monthCrimes++;
        const code = (c[iCode] || '').trim();
        const type = (c[iType] || '').trim() || 'Unknown';
        if (!code) { uncoded++; continue; }
        const council = lsoaToCouncil.get(code);
        if (!council) { unresolved++; unresolvedCodes.set(code, (unresolvedCodes.get(code) || 0) + 1); continue; }
        if (!byCode.has(council)) { noCouncil++; noCouncilCodes.add(council); continue; }
        const k = `${council}|${type}`;
        agg.set(k, (agg.get(k) || 0) + 1);
      }
    }
    const rows = [...agg.entries()].map(([k, count]) => {
      const [code, type] = k.split('|');
      const c = byCode.get(code);
      return {
        council_gss_code: code,
        council_name: c.name,
        nation: code.startsWith('W') ? 'Wales' : 'England',
        source: 'police_uk',
        period_type: 'month',
        period_start: `${month}-01`,
        period_label: month,
        crime_category: type,
        is_total: false,
        count,
        rate_per_10k: null,
      };
    });
    await upsertRows(rows);
    grandRows += rows.length;
    console.log(`  ${month}: ${monthCrimes.toLocaleString()} crimes in ${files.length} force files -> ${rows.length} rows across ${new Set(rows.map((r) => r.council_gss_code)).size} councils`);
  }
  console.log(`\npolice.uk: ${grandRows.toLocaleString()} rows ${DRY_RUN ? 'computed' : 'written'}`);
  console.log(`  crimes read ${totalCrimes.toLocaleString()}; no location code ${uncoded.toLocaleString()} (${((uncoded / totalCrimes) * 100).toFixed(2)}%); LSOA not in lookup ${unresolved}; council code not in councils table ${noCouncil}`);
  if (unresolvedCodes.size) console.log(`  unresolved LSOAs (first 20): ${[...unresolvedCodes.entries()].slice(0, 20).map(([k, v]) => `${k}(${v})`).join(', ')}`);
  if (noCouncilCodes.size) console.log(`  council codes missing from councils table: ${[...noCouncilCodes].join(', ')}`);
  return grandRows;
}

// ── Northern Ireland: PSNI monthly workbook ──────────────────────────────

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

async function latestPsniWorkbookUrl() {
  const res = await fetchRetry(PSNI_PAGE);
  if (res.status === 403) {
    throw new Error(
      'PSNI\'s statistics page blocks automated access (HTTP 403, Cloudflare). Open ' + PSNI_PAGE +
      ' in a browser, copy the link to the newest "Police Recorded Crime Tables Period Ending ..." Excel file, and re-run with --url=<that link>.',
    );
  }
  if (!res.ok) throw new Error(`PSNI page HTTP ${res.status}`);
  const html = await res.text();
  const links = [...new Set([...html.matchAll(/href="([^"]+\.xlsx)"/gi)].map((m) => m[1]))]
    .filter((l) => /Police(%20|_| )Recorded(%20|_| )Crime(%20|_| )Tables(%20|_| )Period(%20|_| )Ending/i.test(l));
  // "Period Ending 31st August 2026" -> sortable date.
  const dated = links.map((l) => {
    const m = decodeURIComponent(l).match(/Period Ending \d{1,2}(?:st|nd|rd|th)? ([A-Za-z]+) (\d{4})/i);
    const mon = m ? MONTHS[m[1].slice(0, 3).toLowerCase()] : null;
    return { l, key: m && mon ? Number(m[2]) * 100 + mon : 0 };
  }).filter((x) => x.key > 0).sort((a, b) => b.key - a.key);
  if (!dated.length) throw new Error('No "Police Recorded Crime Tables Period Ending ..." xlsx link found on the PSNI page');
  const href = dated[0].l;
  return href.startsWith('http') ? href : `https://www.psni.police.uk${href}`;
}

async function importPsni() {
  const councils = await loadCouncils();
  const ni = councils.filter((c) => c.gss_code && c.gss_code.startsWith('N09'));
  const niByName = new Map();
  for (const c of ni) {
    niByName.set(normName(c.name), c);
    if (c.short_name) niByName.set(normName(c.short_name), c);
  }

  const url = args.url || (await latestPsniWorkbookUrl());
  if (!/^https:\/\/www\.psni\.police\.uk\/.+\.xlsx$/i.test(url)) {
    throw new Error(`--url must be a https://www.psni.police.uk/...xlsx link, got: ${url}`);
  }
  console.log(`PSNI workbook: ${decodeURIComponent(url)}`);
  const res = await fetchRetry(url);
  if (!res.ok) throw new Error(`PSNI workbook HTTP ${res.status}`);
  const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
  const sheet = wb.Sheets['Pivot Table-Crime'];
  if (!sheet) throw new Error(`"Pivot Table-Crime" sheet not found; sheets: ${wb.SheetNames.join(' | ')}`);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });

  const hdr = rows.findIndex((r) => String(r[0]).trim() === 'Policing_District' && String(r[1]).trim() === 'Crime_Type');
  if (hdr < 1) throw new Error('Pivot header row (Policing_District | Crime_Type) not found');
  const yearRow = rows[hdr - 1];
  const monthRow = rows[hdr];
  // Column -> YYYY-MM, carrying the calendar year forward across blank cells.
  const colMonth = new Map();
  let year = null;
  for (let c = 2; c < monthRow.length; c++) {
    const y = String(yearRow[c] ?? '').trim();
    if (/^\d{4}$/.test(y)) year = Number(y);
    const m = MONTHS[String(monthRow[c] ?? '').trim().slice(0, 3).toLowerCase()];
    if (year && m) colMonth.set(c, `${year}-${String(m).padStart(2, '0')}`);
  }
  console.log(`  months in pivot: ${colMonth.size} (${[...colMonth.values()][0]} to ${[...colMonth.values()].slice(-1)[0]})`);

  const out = [];
  const types = new Set();
  const unmatched = new Set();
  let district = null;
  for (const r of rows.slice(hdr + 1)) {
    const d = String(r[0] ?? '').trim();
    const t = String(r[1] ?? '').trim();
    if (d) district = d;
    if (/grand total/i.test(d) || /grand total/i.test(t)) continue;
    if (!district || !t) continue;
    if (/^northern ireland$/i.test(district)) continue;
    const council = niByName.get(normName(district));
    if (!council) { unmatched.add(district); continue; }
    types.add(t);
    const isTotal = /^total/i.test(t);
    for (const [c, ym] of colMonth) {
      const v = r[c];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      out.push({
        council_gss_code: council.gss_code,
        council_name: council.name,
        nation: 'Northern Ireland',
        source: 'psni',
        period_type: 'month',
        period_start: `${ym}-01`,
        period_label: ym,
        crime_category: t,
        is_total: isTotal,
        count: Math.round(v),
        rate_per_10k: null,
      });
    }
  }
  const matchedCouncils = new Set(out.map((r) => r.council_gss_code));
  console.log(`  NI councils in table: ${ni.length}; matched in pivot: ${matchedCouncils.size}`);
  if (unmatched.size) console.log(`  UNMATCHED district names: ${[...unmatched].join(' | ')}`);
  console.log(`  crime types (${types.size}): ${[...types].join(' | ')}`);
  if (matchedCouncils.size !== ni.length) throw new Error(`Expected all ${ni.length} NI councils matched, got ${matchedCouncils.size} — not writing`);
  await upsertRows(out);
  console.log(`\nPSNI: ${out.length.toLocaleString()} rows ${DRY_RUN ? 'computed' : 'written'}`);
  return out.length;
}

// ── Scotland: Recorded Crime in Scotland tables ──────────────────────────

function cleanHeader(v) {
  return String(v ?? '').replace(/\[note[^\]]*\]/gi, '').trim();
}

function readScotTable(wb, sheetName) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false, defval: '' });
  const hdr = rows.findIndex((r) => String(r[0]).trim() === 'Local Authority');
  if (hdr < 0) throw new Error(`${sheetName}: "Local Authority" header row not found`);
  const yearCols = [];
  rows[hdr].forEach((v, i) => {
    const h = cleanHeader(v);
    if (/^\d{4}-\d{2}$/.test(h)) yearCols.push({ i, label: h });
  });
  const map = new Map(); // la|category -> { label: value }
  for (const r of rows.slice(hdr + 1)) {
    const la = String(r[0] ?? '').trim();
    const group = cleanHeader(r[1]);
    const type = cleanHeader(r[2]);
    if (!la || !group || !type) continue;
    const category = group === 'Total Crimes' ? 'Total crimes' : type === 'Total' ? group : `${group}: ${type}`;
    const vals = {};
    for (const { i, label } of yearCols) if (typeof r[i] === 'number' && Number.isFinite(r[i])) vals[label] = r[i];
    map.set(`${la}|${category}`, { la, category, isTotal: group === 'Total Crimes', vals });
  }
  return { map, years: yearCols.map((y) => y.label) };
}

async function importScotland() {
  const councils = await loadCouncils();
  const scot = councils.filter((c) => c.gss_code && c.gss_code.startsWith('S12'));
  const byName = new Map();
  for (const c of scot) {
    byName.set(normName(c.name), c);
    if (c.short_name) byName.set(normName(c.short_name), c);
  }
  const byCode = new Map(scot.map((c) => [c.gss_code, c]));

  const url = args.url || SCOT_DEFAULT;
  console.log(`Scotland tables: ${decodeURIComponent(url)}`);
  const res = await fetchRetry(url);
  if (!res.ok) throw new Error(`Scotland workbook HTTP ${res.status}`);
  const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
  const counts = readScotTable(wb, 'Table_1');
  const rates = readScotTable(wb, 'Table_4');
  console.log(`  years: ${counts.years.join(', ')}`);

  const out = [];
  const unmatched = new Set();
  const categories = new Set();
  for (const { la, category, isTotal, vals } of counts.map.values()) {
    if (la === 'Scotland') continue;
    const council = SCOT_NAME_OVERRIDE[la] ? byCode.get(SCOT_NAME_OVERRIDE[la]) : byName.get(normName(la));
    if (!council) { unmatched.add(la); continue; }
    categories.add(category);
    const rateVals = rates.map.get(`${la}|${category}`)?.vals || {};
    for (const [label, count] of Object.entries(vals)) {
      out.push({
        council_gss_code: council.gss_code,
        council_name: council.name,
        nation: 'Scotland',
        source: 'scotland_rcs',
        period_type: 'financial_year',
        period_start: `${label.slice(0, 4)}-04-01`,
        period_label: label,
        crime_category: category,
        is_total: isTotal,
        count: Math.round(count),
        rate_per_10k: typeof rateVals[label] === 'number' ? Math.round(rateVals[label] * 10000) / 10000 : null,
      });
    }
  }
  const matched = new Set(out.map((r) => r.council_gss_code));
  console.log(`  Scottish councils in table: ${scot.length}; matched: ${matched.size}`);
  if (unmatched.size) console.log(`  UNMATCHED local authority names: ${[...unmatched].join(' | ')}`);
  console.log(`  categories (${categories.size}): ${[...categories].join(' | ')}`);
  if (matched.size !== scot.length) throw new Error(`Expected all ${scot.length} Scottish councils matched, got ${matched.size} — not writing`);
  await upsertRows(out);
  console.log(`\nScotland: ${out.length.toLocaleString()} rows ${DRY_RUN ? 'computed' : 'written'}`);
  return out.length;
}

async function heartbeat(status, rows) {
  if (!HEARTBEAT || DRY_RUN) return;
  const { error } = await db.rpc('record_sync_run', { p_route: HEARTBEAT_ROUTE, p_status: status, p_rows: rows });
  if (error) console.error(`heartbeat failed (non-fatal): ${error.message}`);
}

async function main() {
  console.log(`Council crime import — source ${SOURCE}${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);
  let rows;
  if (SOURCE === 'police-uk') rows = await importPoliceUk();
  else if (SOURCE === 'psni') rows = await importPsni();
  else if (SOURCE === 'scotland') rows = await importScotland();
  else throw new Error('--source must be police-uk, psni or scotland');
  await heartbeat(200, rows);
}

main().catch(async (e) => {
  console.error('Fatal:', e.message);
  await heartbeat(500, null);
  process.exit(1);
});
