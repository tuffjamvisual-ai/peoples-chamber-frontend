#!/usr/bin/env node
// Step 2: MHCLG Band D council tax for England councils. Pulls Table 7
// (2024-25 council tax by individual authority) from gov.uk, parses
// the ODS, matches by ONS code (GSS), upserts.
//
// Coverage expectation: ~280 English billing authorities (London
// boroughs, metropolitan boroughs, unitary authorities, shire
// districts, shire counties). Police + fire + combined-authority
// precepting bodies are also in the spreadsheet but are not in our
// councils table.
//
// Wales / Scotland / NI need their own datasets (separate scripts).

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');
const xlsx = require('xlsx');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const URL = 'https://assets.publishing.service.gov.uk/media/662a4da155e1582b6ca7e608/Table_7_24-25__revised_.ods';
const UA = 'PeoplesChamber/1.0';

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
  // Load our 382 councils so we know which GSS codes to match against
  const raw = await psqlRead(
    "SELECT slug, gss_code, council_tax_band_d_pounds FROM councils WHERE council_tax_band_d_pounds IS NULL ORDER BY slug",
  );
  const ours = raw.split('\n').filter(Boolean).map(line => {
    const [slug, gss] = line.split('|');
    return { slug, gss };
  });
  const ourByGss = new Map(ours.map(c => [c.gss, c]));
  console.log(`${ours.length} councils need a Band D figure.`);

  // Download + parse Table 7
  console.log(`Fetching MHCLG Table 7 from gov.uk…`);
  const res = await fetch(URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = xlsx.read(buf);

  // Iterate the per-class sheets and collect any row whose ONS code
  // is one of ours. Different sheets have the Band D figure at slightly
  // different column indexes — search by header label rather than
  // position.
  const matches = new Map(); // gss -> band_d_value
  for (const sheetName of ['Table_7a', 'Table_7b', 'Table_7c']) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    // Find header row
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
    // 'Average council tax for the authority' — pick the first such column
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
      // Round to integer £ (the council_tax_band_d_pounds column is INTEGER)
      matches.set(gss, Math.round(n));
      matched++;
    }
    console.log(`  ${sheetName}: ${matched} matches`);
  }

  console.log(`\nTotal matches: ${matches.size} of ${ours.length} councils needing data.`);

  // Apply updates
  let updated = 0;
  for (const [gss, value] of matches) {
    const c = ourByGss.get(gss);
    await psqlWrite(`UPDATE councils SET council_tax_band_d_pounds = ${value} WHERE gss_code = '${gss}';`);
    updated++;
    if (updated % 50 === 0) console.log(`  ${updated}/${matches.size} written`);
  }

  console.log(`\nDone. ${updated} council tax values written.`);
})();
