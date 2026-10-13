#!/usr/bin/env node
// Import ONS housing affordability into public.council_housing_affordability
// (migration scripts/migrations/2026-10-13g-housing-affordability.sql).
//
// Source: ONS, "House price to residence-based earnings ratio" (released 26 March 2026,
// Open Government Licence), table 5c: ratio of median house price to median gross annual
// residence-based earnings by local authority district, England and Wales, every year
// from 2002. Stored for every council in our councils table that the table covers.
//
// DRY RUN BY DEFAULT: reads the file, prints what it would store and anything unmatched
// or withheld, writes NOTHING. Pass --write to save, only after the dry-run report has
// been approved.
//
// Usage:
//   node scripts/import-housing-affordability.js > housing-affordability-dryrun.txt 2>&1
//   node scripts/import-housing-affordability.js --write > housing-affordability-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const FILE_URL = 'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/housing/datasets/ratioofhousepricetoresidencebasedearningslowerquartileandmedian/current/aff2ratioofhousepricetoresidencebasedearnings.xlsx';
const PAGE_URL = 'https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/ratioofhousepricetoresidencebasedearningslowerquartileandmedian';
const SOURCE = 'ONS, House price to residence-based earnings ratio (table 5c, median)';
const PUBLISHED = '2026-03-26';
const SHEET = '5c';
// Old codes still used in some government files, mapped to the codes in our councils table.
const CODE_ALIASES = { E08000038: 'E08000016', E08000039: 'E08000019', E10000002: 'E06000060' };
const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();
const num = (v) => { if (typeof v === 'number') return v; const s = cell(v).replace(/,/g, ''); return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null; };

(async () => {
  const res = await fetch(FILE_URL, { headers: { 'User-Agent': 'opengovt-import/1.0' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${FILE_URL}`);
  const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
  if (!wb.Sheets[SHEET]) throw new Error(`sheet "${SHEET}" not found (sheets: ${wb.SheetNames.join(', ')})`);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[SHEET], { header: 1, blankrows: false, defval: '' });
  const title = rows.slice(0, 5).map((r) => r.map(cell).filter(Boolean).join(' ')).find((t) => t.length > 10) || '';
  if (!/median house price/i.test(title) || !/local authority/i.test(title)) throw new Error(`sheet ${SHEET} is not the expected table: "${title}"`);

  let hi = -1, codeCol = -1;
  for (let i = 0; i < Math.min(rows.length - 1, 40); i++) {
    const j = rows[i + 1].findIndex((x) => /^[EW](06|07|08|09)\d{6}$/.test(cell(x)));
    if (j >= 0) { hi = i; codeCol = j; break; }
  }
  if (hi < 0) throw new Error('header row not found');
  const h = rows[hi].map(cell);
  const nameCol = h.findIndex((x) => /local authority name/i.test(x));
  const years = h.map((x, i) => [x, i]).filter(([x]) => /^(19|20)\d{2}$/.test(x)).map(([x, i]) => ({ year: Number(x), i }));
  if (!years.length) throw new Error('no year columns found');
  console.log(`"${title.slice(0, 180)}"`);
  console.log(`header row ${hi + 1}; code column ${codeCol}; name column ${nameCol}; years ${years[0].year} to ${years[years.length - 1].year} (${years.length})`);

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: councils, error } = await db.from('councils').select('gss_code, name, type, country').order('gss_code');
  if (error) throw new Error(`councils: ${error.message}`);
  const byCode = new Map(councils.filter((c) => c.gss_code).map((c) => [c.gss_code, c]));

  const out = [], unmatched = [], withheld = [], aliased = new Set();
  for (const r of rows.slice(hi + 1)) {
    const raw = cell(r[codeCol]);
    if (!/^[EW]\d{8}$/.test(raw)) continue;
    const code = CODE_ALIASES[raw] || raw;
    if (code !== raw) aliased.add(`${raw} -> ${code}`);
    const label = nameCol >= 0 ? cell(r[nameCol]) : '';
    if (!byCode.has(code)) { unmatched.push(`${raw} ${label}`); continue; }
    const missingYears = [];
    for (const { year, i } of years) {
      const v = num(r[i]);
      if (v == null) { missingYears.push(year); continue; }
      out.push({ council_gss_code: code, measure: 'median', year, ratio: v, source: SOURCE, source_url: PAGE_URL, published_date: PUBLISHED });
    }
    if (missingYears.length) withheld.push(`${label || code} (${missingYears.length === years.length ? 'all years' : missingYears.join(', ')})`);
  }

  const latest = years[years.length - 1].year;
  const covered = new Set(out.map((x) => x.council_gss_code));
  const eng = councils.filter((c) => c.country === 'England' && c.type !== 'county' && c.gss_code);
  const wal = councils.filter((c) => c.country === 'Wales' && c.gss_code);
  console.log(`\nrows to store: ${out.length}; councils with at least one figure: ${covered.size}`);
  console.log(`  England (not counties): ${eng.filter((c) => covered.has(c.gss_code)).length} of ${eng.length}; Wales: ${wal.filter((c) => covered.has(c.gss_code)).length} of ${wal.length}`);
  console.log(`codes changed to the codes in our table: ${aliased.size ? [...aliased].join(', ') : 'none'}`);
  console.log(`codes in the file not in our councils table: ${unmatched.length}${unmatched.length ? ` - ${unmatched.join('; ')}` : ''}`);
  console.log(`figures withheld by ONS ([x] or blank): ${withheld.length}${withheld.length ? ` - ${withheld.join('; ')}` : ''}`);
  const noFig = [...eng, ...wal].filter((c) => !out.some((x) => x.council_gss_code === c.gss_code && x.year === latest));
  console.log(`councils (England not counties, and Wales) with no ${latest} figure: ${noFig.length}${noFig.length ? ` - ${noFig.map((c) => `${c.name} (${c.gss_code})`).join(', ')}` : ''}`);
  const last = out.filter((x) => x.year === latest).sort((a, b) => a.ratio - b.ratio);
  const nm = (c) => (byCode.get(c) || {}).name;
  console.log(`${latest} most affordable: ${last.slice(0, 5).map((x) => `${nm(x.council_gss_code)} ${x.ratio}`).join('; ')}`);
  console.log(`${latest} least affordable: ${last.slice(-5).reverse().map((x) => `${nm(x.council_gss_code)} ${x.ratio}`).join('; ')}`);
  const dupes = out.map((x) => `${x.council_gss_code}|${x.year}`).filter((k, i, a) => a.indexOf(k) !== i);
  if (dupes.length) console.log(`DUPLICATE keys (must be fixed before writing): ${dupes.slice(0, 20).join(', ')}`);

  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }
  if (dupes.length) throw new Error('duplicate keys');
  console.log('\n--- Writing ---');
  const runStart = new Date().toISOString();
  for (let i = 0; i < out.length; i += 500) {
    const { error: e } = await db.from('council_housing_affordability').upsert(out.slice(i, i + 500).map((x) => ({ ...x, synced_at: new Date().toISOString() })), { onConflict: 'council_gss_code,measure,year' });
    if (e) throw new Error(`upsert: ${e.message}`);
  }
  const { error: d, count } = await db.from('council_housing_affordability').delete({ count: 'exact' }).lt('synced_at', runStart);
  if (d) throw new Error(`stale delete: ${d.message}`);
  console.log(`  council_housing_affordability: ${out.length} saved; ${count || 0} no longer in the source removed`);
  console.log('\nWRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
