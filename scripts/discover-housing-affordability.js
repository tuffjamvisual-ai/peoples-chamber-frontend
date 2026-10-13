// READ-ONLY discovery for a second Housing measure in the area league table. Writes NOTHING.
//
// Source: ONS, "House price to residence-based earnings ratio" (released 26 March 2026,
// Open Government Licence): aff2ratioofhousepricetoresidencebasedearnings.xlsx.
//
// Reports:
//   1. Every sheet with its title and header row, so the local authority table is clear.
//   2. The median house price to median earnings ratio for the latest year, matched to
//      the 296 areas in public.area_ratings (same old-code fixes as the other scripts).
//   3. How many areas have a figure, and which do not.
//   4. The 10 most and 10 least affordable areas.
//   5. How closely it tracks the current Housing measure (temporary accommodation) and
//      the overall area score (correlation, -1 to 1).
//
// Usage:
//   node scripts/discover-housing-affordability.js > housing-affordability-discovery.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const FILE_URL = 'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/housing/datasets/ratioofhousepricetoresidencebasedearningslowerquartileandmedian/current/aff2ratioofhousepricetoresidencebasedearnings.xlsx';
const CODE_ALIASES = { E08000038: 'E08000016', E08000039: 'E08000019', E10000002: 'E06000060' };
const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();
const num = (v) => { if (typeof v === 'number') return v; const s = cell(v).replace(/,/g, ''); return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
const r2 = (x) => (x == null ? '-' : Math.round(x * 100) / 100);

function pearson(pairs) {
  const n = pairs.length; if (n < 3) return null;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n;
  const cov = pairs.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
  const sx = Math.sqrt(pairs.reduce((s, p) => s + (p[0] - mx) ** 2, 0)), sy = Math.sqrt(pairs.reduce((s, p) => s + (p[1] - my) ** 2, 0));
  return cov / (sx * sy);
}
function ranks(xs) {
  const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(xs.length);
  let i = 0;
  while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) out[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; }
  return out;
}
const spearman = (pairs) => { const a = ranks(pairs.map((p) => p[0])), b = ranks(pairs.map((p) => p[1])); return pearson(a.map((x, i) => [x, b[i]])); };

(async () => {
  const res = await fetch(FILE_URL, { headers: { 'User-Agent': 'opengovt-discovery/1.0 (read-only)' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${FILE_URL}`);
  const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });

  console.log(`=== 1. Sheets (${wb.SheetNames.length}) ===`);
  const sheets = [];
  for (const s of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
    const title = rows.slice(0, 5).map((r) => r.map(cell).filter(Boolean).join(' ')).find((t) => t.length > 10) || '';
    // header row: the first row followed by a row holding an English or Welsh local authority code
    let hi = -1, codeCol = -1;
    for (let i = 0; i < Math.min(rows.length - 1, 40); i++) {
      const j = rows[i + 1].findIndex((x) => /^[EW](06|07|08|09)\d{6}$/.test(cell(x)));
      if (j >= 0) { hi = i; codeCol = j; break; }
    }
    const h = hi >= 0 ? rows[hi].map(cell) : [];
    console.log(`  "${s}": ${rows.length} rows | ${title.slice(0, 200)}`);
    if (hi >= 0) console.log(`      header row ${hi + 1}, code column ${codeCol}: ${h.join(' | ').slice(0, 400)}`);
    sheets.push({ s, rows, title, hi, codeCol, h });
  }

  // The local authority table of median house price to median residence-based earnings.
  const pick = sheets.find((x) => x.hi >= 0 && /median house price/i.test(x.title) && /median (gross )?annual/i.test(x.title) && /local authority/i.test(x.title))
    || sheets.find((x) => x.hi >= 0 && /median/i.test(x.title) && /local authority/i.test(x.title));
  if (!pick) throw new Error('no local authority table of median ratios found; see the sheet list above');
  const yearCols = pick.h.map((x, i) => [x, i]).filter(([x]) => /^(19|20)\d{2}$/.test(x) || /\b(19|20)\d{2}\b/.test(x)).map(([x, i]) => ({ i, year: Number(x.match(/(19|20)\d{2}/)[0]), label: x }));
  if (!yearCols.length) throw new Error(`no year columns in "${pick.s}"`);
  const latest = yearCols.reduce((a, b) => (b.year > a.year ? b : a));
  const nameCol = pick.h.findIndex((x) => /name/i.test(x));
  console.log(`\n=== 2. Using "${pick.s}" (${pick.title.slice(0, 160)}) ===`);
  console.log(`  latest year column: ${latest.i} "${latest.label}"; years held ${yearCols[0].year} to ${latest.year}; name column ${nameCol}`);

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: areas, error } = await db.from('area_ratings').select('area_gss_code, area_name, area_score, measures').order('area_gss_code');
  if (error) throw new Error(`area_ratings: ${error.message}`);
  const codes = new Set(areas.map((a) => a.area_gss_code));

  const ratio = new Map(), suppressed = [];
  for (const r of pick.rows.slice(pick.hi + 1)) {
    const raw = cell(r[pick.codeCol]);
    if (!/^E\d{8}$/.test(raw)) continue;
    const code = CODE_ALIASES[raw] || raw;
    if (!codes.has(code)) continue;
    const v = num(r[latest.i]);
    if (v == null) suppressed.push(`${raw} ${nameCol >= 0 ? cell(r[nameCol]) : ''} ("${cell(r[latest.i])}")`);
    else ratio.set(code, v);
  }
  const missing = areas.filter((a) => !ratio.has(a.area_gss_code));
  console.log(`\n=== 3. Coverage: ${ratio.size} of ${areas.length} areas have a ${latest.year} figure ===`);
  if (suppressed.length) console.log(`  in the file but no figure: ${suppressed.join('; ')}`);
  if (missing.length) console.log(`  no figure: ${missing.map((a) => `${a.area_name} (${a.area_gss_code})`).join(', ')}`);

  const sorted = [...ratio.entries()].sort((a, b) => a[1] - b[1]);
  const nm = new Map(areas.map((a) => [a.area_gss_code, a.area_name]));
  console.log(`\n=== 4. Extremes (median house price as a multiple of median earnings, ${latest.year}) ===`);
  console.log(`  most affordable: ${sorted.slice(0, 10).map(([c, v]) => `${nm.get(c)} ${v}`).join('; ')}`);
  console.log(`  least affordable: ${sorted.slice(-10).reverse().map(([c, v]) => `${nm.get(c)} ${v}`).join('; ')}`);
  const vals = sorted.map(([, v]) => v);
  console.log(`  median ${vals[Math.floor(vals.length / 2)]}; min ${vals[0]}; max ${vals[vals.length - 1]}`);

  console.log('\n=== 5. How closely it tracks other figures (1 = moves together, -1 = opposite, 0 = unrelated) ===');
  const ta = areas.filter((a) => ratio.has(a.area_gss_code) && a.measures && a.measures.temp_accommodation && a.measures.temp_accommodation.value != null).map((a) => [ratio.get(a.area_gss_code), a.measures.temp_accommodation.value]);
  const sc = areas.filter((a) => ratio.has(a.area_gss_code) && a.area_score != null).map((a) => [ratio.get(a.area_gss_code), Number(a.area_score)]);
  console.log(`  with temporary accommodation per 1,000 households (${ta.length} areas): Pearson ${r2(pearson(ta))}, rank ${r2(spearman(ta))}`);
  console.log(`  with the overall area score (${sc.length} areas): Pearson ${r2(pearson(sc))}, rank ${r2(spearman(sc))}`);
  console.log('\nDone. Nothing was written.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
