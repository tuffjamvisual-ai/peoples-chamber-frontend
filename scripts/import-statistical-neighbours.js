#!/usr/bin/env node
// Import MHCLG's Statistical Neighbours model (1 July 2026) into
// public.council_statistical_neighbours (migration 2026-10-13d-area-ratings.sql).
// Each English council's 15 most similar councils, used for fair peer comparison.
// Source: MHCLG, Open Government Licence.
//
// DRY RUN BY DEFAULT: reads the spreadsheet, prints what it would store and anything
// unmatched, writes NOTHING. Pass --write to save, only after the dry-run report has
// been approved.
//
// Usage:
//   node scripts/import-statistical-neighbours.js > statistical-neighbours-dryrun.txt 2>&1
//   node scripts/import-statistical-neighbours.js --write > statistical-neighbours-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const FILE_URL = 'https://assets.publishing.service.gov.uk/media/6a452aee1c8bd7ce25a5e8fa/010726_MHCLG_Statistical_Neighbours.xlsx';
const MODEL_DATE = '2026-07-01';
const SOURCE = 'MHCLG, Statistical Neighbours model (1 July 2026)';
const NEIGHBOURS = 15;
// Old codes still used in some government files, mapped to the codes in our councils table.
const CODE_ALIASES = { E08000038: 'E08000016', E08000039: 'E08000019', E10000002: 'E06000060' };
const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();
const isCode = (x) => /^E\d{8}$/.test(x);

(async () => {
  const res = await fetch(FILE_URL, { headers: { 'User-Agent': 'opengovt-import/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${FILE_URL}`);
  const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
  const sheet = wb.SheetNames.find((n) => /^Statistical Neighbours$/i.test(n.trim()));
  if (!sheet) throw new Error(`sheet "Statistical Neighbours" not found (sheets: ${wb.SheetNames.join(', ')})`);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: false, defval: '' });

  const hi = rows.findIndex((r) => r.some((c) => /^Local Authority:?\s*Code$/i.test(cell(c))));
  if (hi < 0) throw new Error('header row with "Local Authority: Code" not found');
  const h = rows[hi].map(cell);
  const codeCol = h.findIndex((x) => /^Local Authority:?\s*Code$/i.test(x));
  const nameCol = h.findIndex((x) => /^Local Authority:?\s*Name$/i.test(x));
  const nCode = {}, nName = {};
  h.forEach((x, i) => {
    const m = x.match(/^Neighbour\s*(\d+)\b.*\bCode$/i); if (m) nCode[+m[1]] = i;
    const k = x.match(/^Neighbour\s*(\d+)\b.*\bName$/i); if (k) nName[+k[1]] = i;
  });
  console.log(`sheet "${sheet}", header row ${hi + 1}; council code column ${codeCol}, name column ${nameCol}`);
  console.log(`neighbour code columns found: ${Object.keys(nCode).length}; name columns found: ${Object.keys(nName).length}`);
  for (let n = 1; n <= NEIGHBOURS; n++) if (nCode[n] == null) throw new Error(`column "Neighbour ${n} Code" not found. Header: ${h.join(' | ')}`);

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: councils, error } = await db.from('councils').select('gss_code, name, country').limit(1000);
  if (error) throw new Error(`councils: ${error.message}`);
  const codes = new Set(councils.map((c) => c.gss_code));
  const eng = councils.filter((c) => c.country === 'England');

  const out = [], unmatched = new Set(), short = [], aliased = new Set();
  const fix = (raw) => { const c = CODE_ALIASES[raw] || raw; if (c !== raw) aliased.add(`${raw} -> ${c}`); return c; };
  for (const r of rows.slice(hi + 1)) {
    const raw = cell(r[codeCol]);
    if (!isCode(raw)) continue;
    const code = fix(raw);
    if (!codes.has(code)) { unmatched.add(`${raw} ${nameCol >= 0 ? cell(r[nameCol]) : ''} (council)`); continue; }
    let found = 0;
    for (let n = 1; n <= NEIGHBOURS; n++) {
      const nraw = cell(r[nCode[n]]);
      if (!isCode(nraw)) continue;
      const ncode = fix(nraw);
      if (!codes.has(ncode)) unmatched.add(`${nraw} ${nName[n] != null ? cell(r[nName[n]]) : ''} (neighbour)`);
      out.push({ council_gss_code: code, neighbour_rank: n, neighbour_gss_code: ncode, neighbour_name: nName[n] != null ? cell(r[nName[n]]) || null : null, model_date: MODEL_DATE, source: SOURCE, source_url: FILE_URL });
      found++;
    }
    if (found !== NEIGHBOURS) short.push(`${code} (${found})`);
  }

  const councilsIn = new Set(out.map((x) => x.council_gss_code));
  const missingEng = eng.filter((c) => !councilsIn.has(c.gss_code));
  console.log(`\ncouncils with neighbours: ${councilsIn.size}; rows: ${out.length}`);
  console.log(`codes changed to the codes in our table: ${aliased.size ? [...aliased].join(', ') : 'none'}`);
  console.log(`councils with fewer than ${NEIGHBOURS} neighbours: ${short.length}${short.length ? ` - ${short.join(', ')}` : ''}`);
  console.log(`codes not in our councils table: ${unmatched.size}${unmatched.size ? ` - ${[...unmatched].join('; ')}` : ''}`);
  console.log(`English councils in our table with no neighbours in the model: ${missingEng.length}${missingEng.length ? ` - ${missingEng.map((c) => `${c.name} (${c.gss_code})`).join(', ')}` : ''}`);
  const nm = new Map(councils.map((c) => [c.gss_code, c.name]));
  for (const s of ['Leeds', 'Guildford', 'Cornwall']) {
    const c = eng.find((x) => x.name.startsWith(s));
    if (c) console.log(`  sample ${c.name}: ${out.filter((x) => x.council_gss_code === c.gss_code).map((x) => `${x.neighbour_rank}. ${nm.get(x.neighbour_gss_code) || x.neighbour_name}`).join('; ')}`);
  }
  const dupes = out.map((x) => `${x.council_gss_code}|${x.neighbour_rank}`).filter((k, i, a) => a.indexOf(k) !== i);
  if (dupes.length) console.log(`DUPLICATE keys (must be fixed before writing): ${dupes.slice(0, 20).join(', ')}`);

  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }
  if (dupes.length) throw new Error('duplicate keys');
  console.log('\n--- Writing ---');
  const runStart = new Date().toISOString();
  for (let i = 0; i < out.length; i += 500) {
    const { error: e } = await db.from('council_statistical_neighbours').upsert(out.slice(i, i + 500).map((x) => ({ ...x, synced_at: new Date().toISOString() })), { onConflict: 'council_gss_code,neighbour_rank' });
    if (e) throw new Error(`upsert: ${e.message}`);
  }
  const { error: d, count } = await db.from('council_statistical_neighbours').delete({ count: 'exact' }).lt('synced_at', runStart);
  if (d) throw new Error(`stale delete: ${d.message}`);
  console.log(`  council_statistical_neighbours: ${out.length} saved; ${count || 0} no longer in the model removed`);
  // Rebuild the site's cached council league data now rather than within 6 hours.
  await require('./lib/refresh-site').refreshCouncilPages();
  console.log('\nWRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
