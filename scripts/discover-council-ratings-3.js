// READ-ONLY discovery, part 3, for the council league table. Writes NOTHING anywhere.
//
//   1. Defra per-council recycling file (local authority data annual results 2024/25)
//   2. Ombudsman per-council data files (countycouncils.json, noncountycouncils.json)
//      and the Ombudsman's reuse terms
//   3. CQC: read the large latest-ratings file in pieces to see whether council adult
//      social care assessments are in it; then CQC's council assessment report pages
//   4. MHCLG planning tables P151a / P153: columns and which councils they cover
//
// Usage:
//   node scripts/discover-council-ratings-3.js > council-ratings-discovery-3.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const zlib = require('zlib');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const UA = { 'User-Agent': 'opengovt-discovery/1.0 (read-only)' };
async function get(url, kind = 'text') {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  if (kind === 'buf') return Buffer.from(await res.arrayBuffer());
  if (kind === 'json') return res.json();
  if (kind === 'res') return res;
  return res.text();
}
async function attachments(path) {
  const r = await get(`https://www.gov.uk/api/content${path}`, 'json');
  return ((r.details && r.details.attachments) || []).map((a) => ({ title: a.title, url: a.url }));
}
const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();
async function section(name, fn) {
  console.log(`\n=== ${name} ===`);
  try { await fn(); } catch (e) { console.log(`  FAILED: ${e.message}`); }
}
let councilsByCode = null;
async function councils() {
  if (councilsByCode) return councilsByCode;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  councilsByCode = new Map();
  if (!url || !key) return councilsByCode;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await db.from('councils').select('gss_code, name, type, country').limit(1000);
  for (const c of data || []) councilsByCode.set(c.gss_code, c);
  return councilsByCode;
}
function tallyTypes(codes, byCode) {
  const t = {};
  for (const c of codes) { const m = byCode.get(c); const k = m ? `${m.country}/${m.type}` : `not in councils (${String(c).slice(0, 3)})`; t[k] = (t[k] || 0) + 1; }
  return Object.entries(t).sort().map(([k, v]) => `${k} ${v}`).join(', ');
}

(async () => {
  await section('1. Defra per-council recycling (2024/25)', async () => {
    const atts = await attachments('/government/statistics/local-authority-collected-waste-management-annual-results');
    const la = atts.find((a) => /local authority data/i.test(a.title));
    if (!la) { console.log('  attachment "local authority data" not found'); for (const a of atts) console.log(`    ${a.title} | ${a.url}`); return; }
    console.log(`  ${la.title}\n  ${la.url}`);
    const wb = XLSX.read(await get(la.url, 'buf'), { type: 'buffer' });
    console.log(`  sheets: ${wb.SheetNames.join(' | ')}`);
    const byCode = await councils();
    for (const s of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
      const hi = rows.findIndex((r) => r.filter((c) => cell(c)).length >= 5);
      if (hi < 0) { console.log(`  - "${s}": ${rows.length} rows (no table)`); continue; }
      const h = rows[hi].map(cell);
      const iRec = h.findIndex((x) => /reuse, recycling|recycling or composting|NI ?192/i.test(x));
      const iCode = h.findIndex((x) => /ONS code|GSS|^code$|authority code/i.test(x));
      console.log(`  - "${s}": ${rows.length} rows; header row ${hi + 1}${iRec >= 0 ? `; recycling column "${h[iRec]}"` : ''}${iCode >= 0 ? `; code column "${h[iCode]}"` : ''}`);
      if (iRec >= 0 || /LA|authority/i.test(s)) {
        console.log(`      header: ${h.join(' | ').slice(0, 1200)}`);
        for (const r of rows.slice(hi + 1, hi + 4)) console.log(`      row: ${r.map(cell).join(' | ').slice(0, 600)}`);
      }
      if (iRec >= 0 && iCode >= 0) {
        const data = rows.slice(hi + 1).filter((r) => cell(r[iCode]));
        const iYear = h.findIndex((x) => /year|period/i.test(x));
        const years = iYear >= 0 ? [...new Set(data.map((r) => cell(r[iYear])))].sort() : [];
        const latest = years.length ? years[years.length - 1] : null;
        const latestRows = latest ? data.filter((r) => cell(r[iYear]) === latest) : data;
        console.log(`      years: ${years.join(', ') || '(no year column)'}; latest ${latest}: ${latestRows.length} rows; recycling values filled ${latestRows.filter((r) => cell(r[iRec])).length}`);
        console.log(`      councils at latest: ${tallyTypes(new Set(latestRows.map((r) => cell(r[iCode]))), byCode)}`);
      }
    }
  });

  await section('2. Ombudsman per-council data files', async () => {
    for (const f of ['countycouncils.json', 'noncountycouncils.json']) {
      const url = `https://www.lgo.org.uk/jsonFiles/${f}`;
      try {
        const j = await get(url, 'json');
        const arr = Array.isArray(j) ? j : (Object.values(j).find((v) => Array.isArray(v)) || []);
        console.log(`  ${f}: top-level ${Array.isArray(j) ? 'array' : `object with keys ${Object.keys(j).slice(0, 10).join(', ')}`}; ${arr.length} entries`);
        if (arr[0]) {
          console.log(`    keys: ${Object.keys(arr[0]).join(', ')}`);
          console.log(`    first: ${JSON.stringify(arr[0]).slice(0, 1200)}`);
          console.log(`    last: ${JSON.stringify(arr[arr.length - 1]).slice(0, 600)}`);
        }
      } catch (e) { console.log(`  ${f}: FAILED ${e.message}`); }
    }
    try {
      const home = await get('https://www.lgo.org.uk/');
      const terms = [...home.matchAll(/href="([^"]*(?:terms|copyright|legal|reuse|privacy|accessib)[^"]*)"/gi)].map((m) => m[1]);
      console.log(`  footer links: ${[...new Set(terms)].join(' | ')}`);
      for (const t of [...new Set(terms)].filter((u) => /terms|copyright|legal|reuse/i.test(u)).slice(0, 3)) {
        const u = t.startsWith('http') ? t : `https://www.lgo.org.uk${t}`;
        const p = (await get(u)).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const i = p.search(/open government licence|reproduc|re-use|reuse|copyright/i);
        console.log(`  ${u}: ${i >= 0 ? p.slice(Math.max(0, i - 200), i + 600) : '(no licence or copyright wording found)'}`);
      }
    } catch (e) { console.log(`  terms check FAILED: ${e.message}`); }
  });

  await section('3. CQC: council adult social care assessments', async () => {
    const page = await get('https://www.cqc.org.uk/about-us/transparency/using-cqc-data');
    const url = (page.match(/https:\/\/www\.cqc\.org\.uk\/system\/files\/[^"]*Latest_ratings\.ods/) || [])[0];
    if (url) {
      const buf = await get(url, 'buf');
      console.log(`  ${url} (${(buf.length / 1e6).toFixed(1)} MB)`);
      // ODS is a zip: find content.xml and stream-inflate it, scanning text in chunks.
      let eocd = -1;
      for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
      const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); let entry = null;
      for (let k = 0; k < n; k++) {
        const method = buf.readUInt16LE(p + 10), comp = buf.readUInt32LE(p + 20);
        const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
        const local = buf.readUInt32LE(p + 42); const name = buf.slice(p + 46, p + 46 + nl).toString('utf8');
        if (name === 'content.xml') entry = { method, comp, local };
        p += 46 + nl + xl + cl;
      }
      if (!entry) { console.log('  content.xml not found'); }
      else {
        const lnl = buf.readUInt16LE(entry.local + 26), lxl = buf.readUInt16LE(entry.local + 28);
        const data = buf.slice(entry.local + 30 + lnl + lxl, entry.local + 30 + lnl + lxl + entry.comp);
        const sheets = [], snippets = [], counts = { 'Care Act': 0, 'Local authority assessment': 0, 'Local Authority': 0 };
        let tail = '';
        await new Promise((resolve, reject) => {
          const z = zlib.createInflateRaw();
          z.on('data', (chunk) => {
            const text = tail + chunk.toString('utf8');
            for (const m of text.matchAll(/<table:table table:name="([^"]+)"/g)) if (!sheets.includes(m[1])) sheets.push(m[1]);
            for (const k of Object.keys(counts)) { const re = new RegExp(k, 'gi'); counts[k] += (text.match(re) || []).length; }
            if (snippets.length < 3) { const i = text.search(/Care Act|Local authority assessment/i); if (i >= 0) snippets.push(text.slice(Math.max(0, i - 300), i + 300).replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ')); }
            tail = text.slice(-400);
          });
          z.on('end', resolve); z.on('error', reject);
          z.end(data);
        });
        console.log(`  sheets: ${sheets.join(' | ')}`);
        console.log(`  word counts (approximate, chunk overlaps): ${JSON.stringify(counts)}`);
        for (const s of snippets) console.log(`    snippet: ${s.slice(0, 500)}`);
      }
    }
    const idx = await get('https://www.cqc.org.uk/node/9720', 'res');
    const html = await idx.text();
    console.log(`  assessment reports index: ${idx.url}`);
    const reportLinks = [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((u) => /local-authorit|\/la\/|care-services\/local/i.test(u) && !/guidance|introducing|about-us/i.test(u)))];
    console.log(`  report links on index: ${reportLinks.length}; e.g. ${reportLinks.slice(0, 10).join(' | ')}`);
    for (const l of reportLinks.slice(0, 3)) {
      const u = l.startsWith('http') ? l : `https://www.cqc.org.uk${l}`;
      try {
        const t = (await get(u)).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const i = t.search(/Overall rating|Outstanding|Requires improvement|Inadequate|\bGood\b/);
        console.log(`  ${u}: ${i >= 0 ? t.slice(Math.max(0, i - 150), i + 250) : '(no rating words)'}`);
      } catch (e) { console.log(`  ${u}: FAILED ${e.message}`); }
    }
  });

  await section('4. MHCLG planning tables P151a and P153', async () => {
    const atts = await attachments('/government/statistical-data-sets/live-tables-on-planning-application-statistics');
    const byCode = await councils();
    for (const [file, sheet] of [['Table_P151.ods', 'Table_P151a'], ['Table_P153.ods', 'Table_P153']]) {
      const a = atts.find((x) => x.url.endsWith(file));
      if (!a) { console.log(`  ${file}: not found`); continue; }
      const wb = XLSX.read(await get(a.url, 'buf'), { type: 'buffer' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: false, defval: '' });
      console.log(`  ${sheet}: ${rows.length} rows`);
      for (const r of rows.slice(0, 8)) console.log(`    top: ${r.map(cell).join(' | ').slice(0, 900)}`);
      const codeIdx = rows.slice(5, 40).map((r) => r.findIndex((c) => /^E0[6-9]\d{6}$|^E07\d{6}$|^E10\d{6}$|^E26\d{6}$|^E6\d{7}$/.test(cell(c)))).find((i) => i >= 0);
      if (codeIdx === undefined) { console.log('    no ONS code column found'); continue; }
      const codes = rows.map((r) => cell(r[codeIdx])).filter((c) => /^E\d{8}$/.test(c));
      console.log(`    ONS code column ${codeIdx}; ${codes.length} codes -> ${tallyTypes(new Set(codes), byCode)}`);
      const sample = rows.find((r) => cell(r[codeIdx]) === codes[0]);
      console.log(`    sample row: ${sample.map(cell).join(' | ').slice(0, 900)}`);
    }
  });

  console.log('\nDone. Nothing was written to the database.');
})();
