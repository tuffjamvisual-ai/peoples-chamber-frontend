// READ-ONLY discovery for the UK House Price Index (HM Land Registry).
// Downloads the latest monthly "UK HPI full file" CSV, prints its columns,
// date range and area codes, and compares the codes with the councils table.
// Writes NOTHING to the database.
//
// Usage:
//   node scripts/discover-uk-hpi.js > hpi-discovery.txt 2>&1

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');

const BASE = 'https://publicdata.landregistry.gov.uk/market-trend-data/house-price-index-data/';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Minimal RFC 4180 CSV parser (handles quoted fields with commas/quotes).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function findLatest() {
  const d = new Date();
  for (let back = 0; back < 6; back++) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1 - back;
    const dt = new Date(Date.UTC(y, m - 1, 1));
    const tag = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
    const url = `${BASE}UK-HPI-full-file-${tag}.csv`;
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' } });
    console.log(`  HEAD ${tag}: ${res.status}${res.headers.get('content-length') ? ` (${(Number(res.headers.get('content-length')) / 1e6).toFixed(1)} MB)` : ''}`);
    if (res.ok) return { url, tag };
  }
  throw new Error('No full file found in the last 6 months');
}

async function main() {
  console.log('UK HPI discovery (read-only)');
  const { url, tag } = await findLatest();
  console.log(`  latest full file: ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  console.log(`  downloaded ${(text.length / 1e6).toFixed(1)} MB (file tag ${tag})`);

  const rows = parseCsv(text).filter((r) => r.length > 1);
  const header = rows[0].map((h) => h.trim());
  console.log(`\nCOLUMNS (${header.length}):`);
  header.forEach((h, i) => console.log(`  ${i}: ${h}`));
  const data = rows.slice(1);
  console.log(`\nDATA ROWS: ${data.length.toLocaleString()}`);
  console.log('FIRST 2 ROWS:');
  for (const r of data.slice(0, 2)) console.log('  ' + JSON.stringify(Object.fromEntries(header.map((h, i) => [h, r[i]]))));

  const col = (name) => header.indexOf(name);
  const iDate = col('Date');
  const iCode = col('AreaCode');
  const iName = col('RegionName');
  const iPrice = col('AveragePrice');
  if ([iDate, iCode, iName, iPrice].some((i) => i < 0)) {
    console.log('\nExpected columns Date/AreaCode/RegionName/AveragePrice not all present; stopping analysis here.');
    return;
  }

  // Date format and range
  console.log(`\nDATE samples: ${[...new Set(data.slice(0, 5).map((r) => r[iDate]))].join(' | ')}`);
  const toIso = (s) => {
    const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m1) return `${m1[1]}-${m1[2]}`;
    const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m2) return `${m2[3]}-${m2[2]}`;
    return null;
  };
  const months = [...new Set(data.map((r) => toIso(r[iDate])).filter(Boolean))].sort();
  console.log(`DATE RANGE: ${months[0]} to ${months[months.length - 1]} (${months.length} months; unparsed dates: ${data.filter((r) => !toIso(r[iDate])).length})`);
  const latest = months[months.length - 1];

  // Area codes
  const areas = new Map(); // code -> { name, rows, latestPrice, first }
  for (const r of data) {
    const code = r[iCode].trim();
    const ym = toIso(r[iDate]);
    const a = areas.get(code) || { name: r[iName], rows: 0, first: ym, latestPrice: null, latestRow: null };
    a.rows++;
    if (ym && ym < a.first) a.first = ym;
    if (ym === latest) { a.latestPrice = r[iPrice]; a.latestRow = r; }
    areas.set(code, a);
  }
  const byPrefix = new Map();
  for (const code of areas.keys()) { const p = code.slice(0, 3); byPrefix.set(p, (byPrefix.get(p) || 0) + 1); }
  console.log(`\nDISTINCT AREA CODES: ${areas.size}`);
  console.log(`  by prefix: ${[...byPrefix.entries()].sort().map(([p, n]) => `${p}=${n}`).join(', ')}`);

  // Compare with councils table
  const { data: councils, error } = await db.from('councils').select('gss_code, name, type, slug, parent_slug');
  if (error) throw new Error(`councils read: ${error.message}`);
  console.log(`\nCOUNCILS TABLE: ${councils.length} rows; types: ${[...new Set(councils.map((c) => c.type))].join(', ')}`);
  const aliases = { E08000016: 'E08000038', E08000019: 'E08000039' };
  const matched = [];
  const missing = [];
  for (const c of councils) {
    const direct = areas.get(c.gss_code);
    const alias = aliases[c.gss_code] ? areas.get(aliases[c.gss_code]) : null;
    if (direct) matched.push({ c, via: 'direct', a: direct });
    else if (alias) matched.push({ c, via: `alias ${aliases[c.gss_code]}`, a: alias });
    else missing.push(c);
  }
  console.log(`  matched: ${matched.length} (direct ${matched.filter((m) => m.via === 'direct').length}, alias ${matched.filter((m) => m.via !== 'direct').length})`);
  console.log(`  matched by type: ${[...new Set(councils.map((c) => c.type))].map((t) => `${t}=${matched.filter((m) => m.c.type === t).length}/${councils.filter((c) => c.type === t).length}`).join(', ')}`);
  for (const m of matched.filter((m) => m.via !== 'direct')) console.log(`    ${m.c.gss_code} ${m.c.name} -> ${m.via} (${m.a.name})`);
  console.log(`  councils with NO HPI series (${missing.length}):`);
  for (const c of missing) console.log(`    ${c.gss_code} ${c.name} [${c.type}${c.parent_slug ? `, parent ${c.parent_slug}` : ''}]`);

  // Name match for the missing ones (in case codes differ)
  const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '').replace(/(city|council|borough|district|county|of)/g, '');
  const byName = new Map([...areas.entries()].map(([code, a]) => [norm(a.name), code]));
  const nameHits = missing.map((c) => [c, byName.get(norm(c.name))]).filter(([, code]) => code);
  console.log(`  of those, name matches in HPI under another code (${nameHits.length}):`);
  for (const [c, code] of nameHits) console.log(`    ${c.gss_code} ${c.name} ~ ${code} ${areas.get(code).name}`);

  // Matched councils: blank latest price, start year
  const blankLatest = matched.filter((m) => !m.a.latestPrice);
  console.log(`\nMATCHED COUNCILS WITH NO ${latest} PRICE (${blankLatest.length}):`);
  for (const m of blankLatest) console.log(`    ${m.c.gss_code} ${m.c.name}`);
  const starts = new Map();
  for (const m of matched) starts.set(m.a.first, (starts.get(m.a.first) || 0) + 1);
  console.log(`SERIES START MONTHS (matched councils): ${[...starts.entries()].sort().map(([s, n]) => `${s}=${n}`).join(', ')}`);

  // HPI codes not in councils (regions, nations, old codes, etc.)
  const councilCodes = new Set(councils.map((c) => c.gss_code).concat(Object.values(aliases)));
  const extra = [...areas.entries()].filter(([code]) => !councilCodes.has(code));
  console.log(`\nHPI AREA CODES NOT IN COUNCILS TABLE (${extra.length}):`);
  for (const [code, a] of extra.sort()) console.log(`    ${code} ${a.name} (rows ${a.rows}, from ${a.first}, latest price ${a.latestPrice || 'blank'})`);

  // Column completeness on the latest month for matched councils
  console.log(`\nCOLUMN COMPLETENESS, ${latest}, matched councils (non-blank count / ${matched.length}):`);
  for (let i = 0; i < header.length; i++) {
    const n = matched.filter((m) => m.a.latestRow && String(m.a.latestRow[i] ?? '').trim() !== '').length;
    console.log(`    ${header[i]}: ${n}`);
  }
  // Same for 3 months earlier (sales volume lag check)
  const back3 = months[months.length - 4];
  const rows3 = new Map();
  for (const r of data) if (toIso(r[iDate]) === back3) rows3.set(r[iCode].trim(), r);
  const iVol = col('SalesVolume');
  if (iVol >= 0) {
    const nLatest = matched.filter((m) => m.a.latestRow && String(m.a.latestRow[iVol]).trim() !== '').length;
    const n3 = matched.filter((m) => { const r = rows3.get(m.c.gss_code) || rows3.get(aliases[m.c.gss_code]); return r && String(r[iVol]).trim() !== ''; }).length;
    console.log(`  SalesVolume non-blank: ${latest}=${nLatest}, ${back3}=${n3}`);
  }

  // Spot checks
  for (const code of ['E06000001', 'E09000033', 'W06000015', 'S12000036', 'N09000003', 'K02000001', 'E92000001']) {
    const a = areas.get(code);
    console.log(`\nSPOT ${code}: ${a ? `${a.name}, rows ${a.rows}, from ${a.first}` : 'NOT IN FILE'}`);
    if (a && a.latestRow) console.log('  ' + JSON.stringify(Object.fromEntries(header.map((h, i) => [h, a.latestRow[i]]))));
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
