#!/usr/bin/env node
// MHCLG council tax for 2026-27 — the current financial year. Same
// structure as the 2025-26 publication: per-class authority data
// in Tables 8a (London boroughs) / 8b (Shire counties) / 8c
// (Shire districts).
//
// Overwrites council_tax_band_d_pounds. Earlier 2024-25 pass left
// 315 English councils populated; this pass refreshes to current.

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');
const xlsx = require('xlsx');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const URL = 'https://assets.publishing.service.gov.uk/media/69de1fa63e81003ae0422508/Tables_1-9_2026-27.ods';
const SHEETS = ['Table_8a', 'Table_8b', 'Table_8c'];

function psqlRead(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-t', '-A', '-F', '|', '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
  });
}
function psqlWrite(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-q'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve() : reject(new Error(err)));
    p.stdin.end(sql);
  });
}

(async () => {
  const raw = await psqlRead('SELECT slug, gss_code FROM councils ORDER BY slug');
  const ourByGss = new Map(
    raw.split('\n').filter(Boolean).map(line => {
      const [slug, gss] = line.split('|');
      return [gss, { slug, gss }];
    }),
  );
  console.log(`Have ${ourByGss.size} councils in DB.`);

  console.log('Fetching MHCLG Tables_1-9_2026-27.ods…');
  const res = await fetch(URL, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  const wb = xlsx.read(Buffer.from(await res.arrayBuffer()));

  const matches = new Map();
  for (const sheetName of SHEETS) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const cells = (rows[i] || []).map(c => (c || '').toString().toLowerCase());
      if (cells.some(c => c.includes('ons code')) && cells.some(c => c.includes('authority'))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) continue;
    const headers = (rows[headerIdx] || []).map(c => (c || '').toString().toLowerCase());
    const onsCol = headers.findIndex(h => h.includes('ons code'));
    const taxCol = headers.findIndex(h => h.includes('average council tax for the au'));
    if (onsCol < 0 || taxCol < 0) continue;
    let matched = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const gss = (r[onsCol] || '').toString().trim();
      const val = r[taxCol];
      if (!gss || val == null || val === '') continue;
      if (!ourByGss.has(gss)) continue;
      const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,£\s]/g, ''));
      if (!Number.isFinite(n) || n < 100 || n > 10000) continue;
      matches.set(gss, Math.round(n));
      matched++;
    }
    console.log(`  ${sheetName}: ${matched} matches`);
  }

  console.log(`\nTotal matches: ${matches.size}.`);

  let updated = 0;
  for (const [gss, value] of matches) {
    await psqlWrite(`UPDATE councils SET council_tax_band_d_pounds = ${value} WHERE gss_code = '${gss}';`);
    updated++;
    if (updated % 50 === 0) console.log(`  ${updated} written`);
  }

  console.log(`\nDone. ${updated} council tax values refreshed to 2026-27.`);
})();
