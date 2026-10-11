// READ-ONLY discovery for Ofcom Connected Nations (spring 2026 update,
// January 2026 data): fixed broadband coverage + full fibre take-up, and
// mobile coverage. Lists every file in each ZIP; for council-level and
// UK/nation files prints the columns, two sample rows and how codes match
// the councils table. Writes NOTHING to the database.
//
// Usage:
//   node scripts/discover-broadband.js > broadband-discovery.txt 2>&1

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const zlib = require('zlib');

const ZIPS = [
  { label: 'Fixed broadband', url: 'https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/multi-sector/infrastructure-research/connected-nations-spring-2026/202601_fixed_broadband_coverage_and_full_fibre_take-up-r1.zip' },
  { label: 'Mobile', url: 'https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/multi-sector/infrastructure-research/connected-nations-spring-2026/202601_mobile_coverage_r1.zip' },
];
const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function listZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip');
  let entries = buf.readUInt16LE(eocd + 10);
  let cdOffset = buf.readUInt32LE(eocd + 16);
  // ZIP64 end of central directory locator
  if (entries === 0xffff || cdOffset === 0xffffffff) {
    const loc = eocd - 20;
    if (buf.readUInt32LE(loc) === 0x07064b50) {
      const z64 = Number(buf.readBigUInt64LE(loc + 8));
      entries = Number(buf.readBigUInt64LE(z64 + 32));
      cdOffset = Number(buf.readBigUInt64LE(z64 + 48));
    }
  }
  const out = [];
  let p = cdOffset;
  for (let n = 0; n < entries; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(p + 10);
    let comp = buf.readUInt32LE(p + 20);
    let size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    let local = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    // ZIP64 extra field
    let e = p + 46 + nameLen;
    const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = buf.readUInt16LE(e); const len = buf.readUInt16LE(e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === 0xffffffff) { size = Number(buf.readBigUInt64LE(q)); q += 8; }
        if (comp === 0xffffffff) { comp = Number(buf.readBigUInt64LE(q)); q += 8; }
        if (local === 0xffffffff) { local = Number(buf.readBigUInt64LE(q)); }
      }
      e += 4 + len;
    }
    out.push({ name, method, comp, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function readEntry(buf, en) {
  const nl = buf.readUInt16LE(en.local + 26);
  const xl = buf.readUInt16LE(en.local + 28);
  const start = en.local + 30 + nl + xl;
  const data = buf.slice(start, start + en.comp);
  return en.method === 8 ? zlib.inflateRawSync(data) : data;
}

function parseCsv(text) {
  const rows = []; let row = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}

async function main() {
  const { data: councils, error } = await db.from('councils').select('gss_code, name, type');
  if (error) throw new Error(`councils read: ${error.message}`);
  const byCode = new Map(councils.map((c) => [c.gss_code, c]));
  console.log(`councils: ${councils.length}`);

  for (const z of ZIPS) {
    console.log(`\n==================== ${z.label}\n${z.url}`);
    const res = await fetch(z.url, { headers: UA });
    console.log(`HTTP ${res.status}`);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const entries = listZip(buf);
    console.log(`${(buf.length / 1e6).toFixed(1)} MB; ${entries.length} files`);
    const nonPostcode = entries.filter((e) => !/postcode/i.test(e.name) || entries.length < 20);
    const postcodeCount = entries.length - nonPostcode.length;
    for (const e of nonPostcode) console.log(`  ${e.name} (${(e.size / 1e6).toFixed(2)} MB)`);
    if (postcodeCount) console.log(`  ...plus ${postcodeCount} postcode-level files (not listed)`);

    for (const e of nonPostcode) {
      if (!/\.csv$/i.test(e.name)) continue;
      if (/output_area|_oa_|_oa\.|\boa\b/i.test(e.name) && e.size > 5e6) { console.log(`\n--- ${e.name}: skipped (output-area level)`); continue; }
      const text = readEntry(buf, e).toString('utf8').replace(/^﻿/, '');
      const rows = parseCsv(text);
      console.log(`\n--- ${e.name}: ${rows.length - 1} data rows`);
      console.log(`  COLUMNS (${rows[0].length}): ${rows[0].map((h, i) => `${i}:${h}`).join(' | ')}`);
      for (const r of rows.slice(1, 3)) console.log(`  ROW: ${r.join(' | ')}`);
      const codeCol = rows[0].findIndex((_, i) => rows.slice(1, 50).filter((r) => /^[EWSN]\d{8}$/.test((r[i] || '').trim())).length > 20);
      if (codeCol >= 0) {
        const codes = new Set(rows.slice(1).map((r) => (r[codeCol] || '').trim()));
        const matched = [...codes].filter((c) => byCode.has(c));
        const extra = [...codes].filter((c) => !byCode.has(c)).sort();
        const missing = councils.filter((c) => !codes.has(c.gss_code));
        console.log(`  code column ${codeCol}: ${codes.size} codes; matched ${matched.length}; by type: ${[...new Set(councils.map((c) => c.type))].map((t) => `${t}=${councils.filter((c) => c.type === t && codes.has(c.gss_code)).length}/${councils.filter((c) => c.type === t).length}`).join(', ')}`);
        console.log(`  codes not in councils table (${extra.length}): ${extra.slice(0, 40).join(' ')}`);
        console.log(`  councils missing (${missing.length}): ${missing.slice(0, 30).map((c) => `${c.gss_code} ${c.name} [${c.type}]`).join('; ')}`);
        const hart = rows.find((r) => (r[codeCol] || '').trim() === 'E06000001');
        if (hart) console.log(`  HARTLEPOOL: ${rows[0].map((h, i) => `${h}=${hart[i]}`).join(' | ')}`);
      }
    }
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
