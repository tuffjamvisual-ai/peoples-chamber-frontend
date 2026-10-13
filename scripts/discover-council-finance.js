// READ-ONLY discovery for the council performance work: the Statistical Neighbours
// model and the council financial health sources. Writes NOTHING anywhere.
//
//   1. MHCLG Statistical Neighbours model (1 July 2026): each English council's 15
//      most similar councils. Sheets, columns, how many councils, codes matched.
//   2. Financial health sources, found through GOV.UK's search and content APIs:
//        a. Exceptional financial support (emergency government help to balance the budget)
//        b. Government interventions (best value inspections, directions, commissioners)
//        c. Usable reserves (MHCLG revenue outturn / reserves tables)
//        d. Audit opinions and delayed audits (local audit backlog)
//      For each: publication, date, attachments and file types; spreadsheets are opened
//      and their sheets and headers listed.
//   3. Section 114 notices held in our councils table (section_114_year).
//
// Usage:
//   node scripts/discover-council-finance.js > council-finance-discovery.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const UA = { 'User-Agent': 'opengovt-discovery/1.0 (read-only)' };
const NEIGHBOURS = 'https://assets.publishing.service.gov.uk/media/6a452aee1c8bd7ce25a5e8fa/010726_MHCLG_Statistical_Neighbours.xlsx';
const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();
async function get(url, kind = 'text') {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  if (kind === 'buf') return Buffer.from(await res.arrayBuffer());
  if (kind === 'json') return res.json();
  return res.text();
}
async function search(q, extra = '') {
  const r = await get(`https://www.gov.uk/api/search.json?q=${encodeURIComponent(q)}&count=8&order=-public_timestamp&fields=title,link,public_timestamp,format${extra}`, 'json');
  return r.results || [];
}
async function content(path) {
  const r = await get(`https://www.gov.uk/api/content${path}`, 'json');
  return { title: r.title, updated: r.public_updated_at, atts: ((r.details && r.details.attachments) || []).map((a) => ({ title: a.title, url: a.url, type: a.content_type || '' })), body: JSON.stringify(r.details || {}).slice(0, 200000) };
}
function describe(label, buf, maxSheets = 8) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  console.log(`    ${label}: ${wb.SheetNames.length} sheets: ${wb.SheetNames.join(' | ').slice(0, 800)}`);
  for (const s of wb.SheetNames.slice(0, maxSheets)) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
    const hi = rows.findIndex((r) => r.filter((c) => cell(c)).length >= 4);
    console.log(`      - "${s}": ${rows.length} rows; header row ${hi + 1}`);
    if (hi >= 0) {
      console.log(`        header: ${rows[hi].map(cell).join(' | ').slice(0, 1200)}`);
      for (const r of rows.slice(hi + 1, hi + 3)) console.log(`        row: ${r.map(cell).join(' | ').slice(0, 600)}`);
    }
  }
  return wb;
}
async function section(name, fn) {
  console.log(`\n=== ${name} ===`);
  try { await fn(); } catch (e) { console.log(`  FAILED: ${e.message}`); }
}
async function findAndOpen(queries, titleRe, opts = {}) {
  const seen = new Set();
  for (const q of queries) {
    for (const r of await search(q, opts.extra || '')) {
      if (seen.has(r.link)) continue; seen.add(r.link);
      console.log(`  search "${q}": ${r.public_timestamp ? r.public_timestamp.slice(0, 10) : ''} | ${r.title} | ${r.link}`);
    }
  }
  const pick = [...seen].find((l) => titleRe.test(l)) || [...seen][0];
  if (!pick) return;
  const c = await content(pick);
  console.log(`  opened: ${c.title} (updated ${c.updated})`);
  for (const a of c.atts.slice(0, 20)) console.log(`    attachment: ${a.title} | ${a.type} | ${a.url}`);
  const sheet = c.atts.find((a) => /\.(xlsx|ods|csv)$/i.test(a.url) && (!opts.attRe || opts.attRe.test(a.title + a.url)));
  if (sheet && !/\.csv$/i.test(sheet.url)) describe(sheet.title, await get(sheet.url, 'buf'), opts.maxSheets || 8);
  else if (sheet) console.log(`    csv first lines: ${(await get(sheet.url)).split(/\r?\n/).slice(0, 3).join(' || ').slice(0, 800)}`);
  if (opts.bodyRe) {
    const m = c.body.match(opts.bodyRe);
    if (m) console.log(`    page text mentions: ${m[0].slice(0, 400)}`);
  }
}

(async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: councils } = await db.from('councils').select('gss_code, name, type, country, section_114_year').limit(1000);
  const codes = new Set((councils || []).map((c) => c.gss_code));

  await section('1. Statistical Neighbours model', async () => {
    const wb = describe('010726_MHCLG_Statistical_Neighbours.xlsx', await get(NEIGHBOURS, 'buf'), 10);
    for (const s of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
      const found = new Set();
      for (const r of rows) for (const c of r) { const v = cell(c); if (/^E(06|07|08|09|10)\d{6}$/.test(v)) found.add(v); }
      if (!found.size) continue;
      const matched = [...found].filter((c) => codes.has(c) || codes.has({ E08000038: 'E08000016', E08000039: 'E08000019' }[c]));
      const t = {}; for (const c of found) { const m = (councils || []).find((x) => x.gss_code === c); const k = m ? m.type : `not in councils (${c.slice(0, 3)})`; t[k] = (t[k] || 0) + 1; }
      console.log(`    "${s}": ${found.size} distinct council codes; matched to our councils ${matched.length}; by type ${JSON.stringify(t)}`);
    }
  });

  await section('2a. Exceptional financial support', () => findAndOpen(['exceptional financial support local authorities 2026-27', 'exceptional financial support councils'], /exceptional-financial-support/i, { extra: '&filter_organisations=ministry-of-housing-communities-local-government', bodyRe: /exceptional financial support[^"]{0,400}/i }));
  await section('2b. Government interventions in councils', () => findAndOpen(['best value intervention local authority commissioners', 'local authority interventions best value inspection directions'], /intervention|best-value/i, { extra: '&filter_organisations=ministry-of-housing-communities-local-government', bodyRe: /intervention[^"]{0,400}/i }));
  await section('2c. Usable reserves (revenue outturn)', () => findAndOpen(['local authority revenue expenditure and financing outturn 2024 to 2025 individual local authority data', 'local authority reserves outturn individual local authority'], /individual-local-authority-data|outturn/i, { attRe: /RS|reserve|individual/i, maxSheets: 6 }));
  await section('2d. Audit opinions and delayed audits', () => findAndOpen(['local audit backlog backstop audit opinions local authorities', 'local authority audit opinions disclaimed backstop'], /audit/i, { bodyRe: /disclaim[^"]{0,400}/i }));

  await section('3. Section 114 notices in our councils table', async () => {
    const s114 = (councils || []).filter((c) => c.section_114_year);
    console.log(`  councils with a section 114 year: ${s114.length}`);
    for (const c of s114) console.log(`    ${c.name} (${c.type}, ${c.country}): ${c.section_114_year}`);
  });

  console.log('\nDone. Nothing was written to the database.');
})();
