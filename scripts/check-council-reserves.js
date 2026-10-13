// READ-ONLY check of council usable reserves against net spending. Writes NOTHING.
//
// Opens MHCLG's 2024-25 revenue outturn files (RS and RSX, Open Government Licence) and
// prints the raw figures (GBP thousands) behind the "usable reserves as % of spending"
// ratio, so odd percentages can be explained before anything is saved:
//   - Woking and Plymouth
//   - the 15 highest percentages
//   - every council whose net revenue expenditure is missing, zero, negative or under 5,000
// Each line also shows the RSX total service expenditure (net current expenditure) as an
// alternative spending base for comparison.
//
// Usage:
//   node scripts/check-council-reserves.js > council-reserves-check.txt 2>&1

'use strict';
const XLSX = require('xlsx');

const UA = { 'User-Agent': 'opengovt-check/1.0 (read-only)' };
const OUTTURN_PAGE = '/government/statistics/local-authority-revenue-expenditure-and-financing-england-2024-to-2025-individual-local-authority-data-outturn';
const NAMED = ['Woking', 'Plymouth'];
const SMALL = 5000;
const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();
const num = (v) => { if (typeof v === 'number') return v; const s = cell(v).replace(/,/g, ''); return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
async function get(url, kind = 'text') {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  if (kind === 'buf') return Buffer.from(await res.arrayBuffer());
  if (kind === 'json') return res.json();
  return res.text();
}
async function readSheet(url, sheetRe) {
  const wb = XLSX.read(await get(url, 'buf'), { type: 'buffer' });
  const s = wb.SheetNames.find((n) => sheetRe.test(n));
  if (!s) throw new Error(`sheet ${sheetRe} not found`);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
  let hi = -1, codeCol = -1;
  for (let i = 0; i < Math.min(rows.length - 1, 30); i++) { const j = rows[i + 1].findIndex((x) => /^E(06|07|08|09|10)\d{6}$/.test(cell(x))); if (j >= 0) { hi = i; codeCol = j; break; } }
  if (hi < 0) throw new Error(`header row not found in ${s}`);
  const h = rows[hi].map(cell);
  return { sheet: s, h, codeCol, data: rows.slice(hi + 1).filter((r) => /^E\d{8}$/.test(cell(r[codeCol]))) };
}
function col(h, re, label) {
  const i = h.findIndex((x) => re.test(x));
  if (i < 0) throw new Error(`column not found: ${label}`);
  console.log(`  ${label}: column ${i} "${h[i].slice(0, 140)}"`);
  return i;
}

(async () => {
  const page = await get(`https://www.gov.uk/api/content${OUTTURN_PAGE}`, 'json');
  const atts = (page.details && page.details.attachments) || [];
  const rs = atts.find((a) => /\(RS\)/.test(a.title) && /\.(ods|xlsx)$/i.test(a.url));
  const rsx = atts.find((a) => /\(RSX\)/.test(a.title) && /\.(ods|xlsx)$/i.test(a.url));
  if (!rs) throw new Error('RS file not found');
  console.log(`RS: ${rs.url}\nRSX: ${rsx ? rsx.url : 'not found'}\n\nColumns used:`);

  const R = await readSheet(rs.url, /^RS_LA_Data/i);
  const nameCol = R.h.findIndex((x) => /name/i.test(x));
  const C = {
    unEnd: col(R.h, /unallocated financial reserves level at 31 March/i, 'unallocated, 31 March'),
    emEnd: col(R.h, /^Reserves at 31 March.*Estimated other earmarked financial reserves level/i, 'other earmarked, 31 March'),
    nre: col(R.h, /net revenue expenditure/i, 'net revenue expenditure'),
  };
  const tse = new Map();
  if (rsx) {
    const X = await readSheet(rsx.url, /^RSX_LA_Data/i);
    const i = col(X.h, /^Total Service Expenditure.*Net Current Expenditure/i, 'RSX total service expenditure');
    for (const r of X.data) tse.set(cell(r[X.codeCol]), num(r[i]));
  }

  const rows = R.data.map((r) => {
    const code = cell(r[R.codeCol]);
    const un = num(r[C.unEnd]), em = num(r[C.emEnd]), nre = num(r[C.nre]);
    const usable = un != null && em != null ? un + em : null;
    return { name: cell(r[nameCol]), code, un, em, usable, nre, pct: usable != null && nre ? Math.round((usable / nre) * 1000) / 10 : null, tse: tse.get(code) ?? null };
  });
  const line = (x) => `  ${x.name} (${x.code}) | unallocated ${x.un} | other earmarked ${x.em} | usable ${x.usable} | net revenue expenditure ${x.nre} | % ${x.pct} | RSX total service expenditure ${x.tse}`;

  console.log('\n=== Named councils ===');
  for (const n of NAMED) for (const x of rows.filter((y) => y.name.toLowerCase().includes(n.toLowerCase()))) console.log(line(x));

  console.log('\n=== 15 highest percentages ===');
  for (const x of rows.filter((y) => y.pct != null).sort((a, b) => b.pct - a.pct).slice(0, 15)) console.log(line(x));

  console.log(`\n=== Net revenue expenditure missing, zero, negative or under ${SMALL} ===`);
  const odd = rows.filter((y) => y.nre == null || y.nre < SMALL);
  for (const x of odd) console.log(line(x));
  console.log(`  count: ${odd.length}`);

  console.log(`\n=== Councils with negative usable reserves ===`);
  for (const x of rows.filter((y) => y.usable != null && y.usable < 0)) console.log(line(x));

  const p = rows.map((y) => y.pct).filter((v) => v != null).sort((a, b) => a - b);
  console.log(`\nAll ${rows.length} rows: % min ${p[0]}, 10th percentile ${p[Math.floor(p.length * 0.1)]}, median ${p[Math.floor(p.length / 2)]}, 90th percentile ${p[Math.floor(p.length * 0.9)]}, max ${p[p.length - 1]}`);
  console.log('\nDone. Nothing was written.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
