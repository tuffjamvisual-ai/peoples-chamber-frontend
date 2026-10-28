// READ-ONLY discovery, part 2, for council financial health. Writes NOTHING.
//
//   1. Exceptional financial support (EFS): GOV.UK's 2026-27 page and the earlier
//      years in the collection; every council named, matched to our councils table.
//   2. Usable reserves: MHCLG revenue expenditure and financing 2024 to 2025,
//      individual local authority data (outturn). Finds the spreadsheet columns for
//      reserves and net revenue expenditure, and how many councils have them.
//
// Usage:
//   node scripts/discover-council-finance-2.js > council-finance-discovery-2.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const UA = { 'User-Agent': 'opengovt-discovery/1.0 (read-only)' };
const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();
const nameKey = (x) => String(x || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(the|of|council|borough|metropolitan|city|county|district|london|royal|corporation)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
async function get(url, kind = 'text') {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  if (kind === 'buf') return Buffer.from(await res.arrayBuffer());
  if (kind === 'json') return res.json();
  return res.text();
}
const content = (path) => get(`https://www.gov.uk/api/content${path}`, 'json');
const plain = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
async function section(name, fn) {
  console.log(`\n=== ${name} ===`);
  try { await fn(); } catch (e) { console.log(`  FAILED: ${e.message}`); }
}

(async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { data: councils } = await db.from('councils').select('gss_code, name, short_name, type, country').limit(1000);
  const eng = (councils || []).filter((c) => c.country === 'England');
  const byKey = new Map();
  for (const c of eng) for (const k of new Set([nameKey(c.name), nameKey(c.short_name)])) if (k) byKey.set(k, [...(byKey.get(k) || []), c]);

  await section('1. Exceptional financial support', async () => {
    const coll = await content('/government/collections/exceptional-financial-support-for-local-authorities');
    console.log(`  collection: ${coll.title} (updated ${coll.public_updated_at})`);
    const docs = ((coll.links && coll.links.documents) || []).map((d) => ({ title: d.title, path: d.base_path, updated: d.public_updated_at }));
    for (const d of docs) console.log(`    document: ${d.updated ? d.updated.slice(0, 10) : ''} | ${d.title} | ${d.path}`);
    const pages = ['/guidance/exceptional-financial-support-for-local-authorities-for-2026-27', ...docs.map((d) => d.path)].filter((p, i, a) => p && a.indexOf(p) === i).slice(0, 6);
    for (const p of pages) {
      try {
        const c = await content(p);
        const body = plain(c.details && (c.details.body || (c.details.parts || []).map((x) => x.body).join(' ')));
        const atts = ((c.details && c.details.attachments) || []).map((a) => `${a.title} (${a.url})`);
        console.log(`\n  ${c.title} | updated ${c.public_updated_at} | ${p}`);
        if (atts.length) console.log(`    attachments: ${atts.join(' | ').slice(0, 800)}`);
        const found = [];
        for (const [k, list] of byKey) {
          if (k.length < 4) continue;
          const re = new RegExp(`\\b${k.replace(/ /g, '\\s+')}\\b`, 'i');
          if (re.test(body.toLowerCase().replace(/&/g, ' and '))) found.push(...list.map((c2) => c2.name));
        }
        console.log(`    councils named on the page (matched to our table): ${[...new Set(found)].length}: ${[...new Set(found)].sort().join(', ')}`);
        const i = body.search(/received|agreed|minded to|in principle|following councils/i);
        console.log(`    text: ${i >= 0 ? body.slice(Math.max(0, i - 200), i + 1200) : body.slice(0, 800)}`);
      } catch (e) { console.log(`  ${p}: FAILED ${e.message}`); }
    }
  });

  await section('2. Usable reserves - revenue outturn 2024 to 2025', async () => {
    const c = await content('/government/statistics/local-authority-revenue-expenditure-and-financing-england-2024-to-2025-individual-local-authority-data-outturn');
    const atts = ((c.details && c.details.attachments) || []).map((a) => ({ title: a.title, url: a.url }));
    console.log(`  ${c.title} (updated ${c.public_updated_at})`);
    for (const a of atts) console.log(`    attachment: ${a.title} | ${a.url}`);
    const files = atts.filter((a) => /\.(xlsx|ods|csv)$/i.test(a.url) && /RS|revenue summary|reserve|summary/i.test(a.title + a.url)).slice(0, 2);
    const codes = new Set(eng.map((x) => x.gss_code));
    for (const f of files) {
      console.log(`\n  opening ${f.title}`);
      if (/\.csv$/i.test(f.url)) { console.log(`    first lines: ${(await get(f.url)).split(/\r?\n/).slice(0, 4).join(' || ').slice(0, 1500)}`); continue; }
      const wb = XLSX.read(await get(f.url, 'buf'), { type: 'buffer' });
      console.log(`    sheets: ${wb.SheetNames.join(' | ').slice(0, 600)}`);
      for (const s of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
        // header row: the one whose row below has an E-code (ONS) in some column
        let hi = -1, codeCol = -1;
        for (let i = 0; i < Math.min(rows.length - 1, 30); i++) {
          const j = rows[i + 1].findIndex((x) => /^E(06|07|08|09|10)\d{6}$/.test(cell(x)));
          if (j >= 0) { hi = i; codeCol = j; break; }
        }
        if (hi < 0) continue;
        const h = rows[hi].map(cell);
        const resCols = h.map((x, k) => [x, k]).filter(([x]) => /reserve/i.test(x));
        const nreCols = h.map((x, k) => [x, k]).filter(([x]) => /net revenue expenditure|net current expenditure|revenue expenditure/i.test(x)).slice(0, 4);
        if (!resCols.length && !nreCols.length) continue;
        const data = rows.slice(hi + 1).filter((r) => /^E\d{8}$/.test(cell(r[codeCol])));
        console.log(`    - "${s}": header row ${hi + 1}; code column ${codeCol}; ${data.length} rows; councils matched ${data.filter((r) => codes.has(cell(r[codeCol]))).length}`);
        for (const [x, k] of [...resCols, ...nreCols].slice(0, 25)) {
          const filled = data.filter((r) => cell(r[k]) !== '' && cell(r[k]) !== '-').length;
          console.log(`        column ${k}: "${x.slice(0, 160)}" filled ${filled}; e.g. ${data.slice(0, 3).map((r) => cell(r[k])).join(', ')}`);
        }
        for (const r of data.slice(0, 2)) console.log(`        row: ${r.map(cell).join(' | ').slice(0, 500)}`);
      }
    }
  });

  console.log('\nDone. Nothing was written to the database.');
})();
