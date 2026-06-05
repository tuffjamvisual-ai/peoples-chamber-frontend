#!/usr/bin/env node
// Step 3: MHCLG annual revenue budget for English councils. Pulls
// RA_2024-25_data_Part_1.ods (the LA-level data file), matches by
// ONS code (GSS) → council, writes 'NET CURRENT EXPENDITURE' (col 170)
// as revenue_budget_mn. Values in the source are in £ thousand —
// divide by 1000 for £ million.
//
// Coverage expectation: ~330 English LAs in RA_LA_Data_2024-25.
// Wales / Scotland / NI have separate publications.

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');
const xlsx = require('xlsx');

const DATABASE_URL = process.env.DATABASE_URL;
const URL = 'https://assets.publishing.service.gov.uk/media/6762a0a83229e84d9bbde757/RA_2024-25_data_Part_1.ods';
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
  const raw = await psqlRead(
    "SELECT slug, gss_code FROM councils WHERE revenue_budget_mn IS NULL ORDER BY slug",
  );
  const ours = raw.split('\n').filter(Boolean).map(line => {
    const [slug, gss] = line.split('|');
    return { slug, gss };
  });
  const ourByGss = new Map(ours.map(c => [c.gss, c]));
  console.log(`${ours.length} councils need a budget.`);

  console.log(`Fetching MHCLG RA_2024-25_data_Part_1…`);
  const res = await fetch(URL, { headers: { 'User-Agent': UA } });
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = xlsx.read(buf);
  const sheet = wb.Sheets['RA_LA_Data_2024-25'];
  if (!sheet) throw new Error('RA_LA_Data_2024-25 sheet not found');

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // Header row 9 carries column labels; ONS code at col 1, NET CURRENT EXPENDITURE at col 170
  const headers = rows[9] || [];
  const onsCol = headers.findIndex(h => h && /^ons\s+code/i.test(String(h)));
  const netCol = headers.findIndex(h => h && /^NET CURRENT EXPENDITURE$/i.test(String(h)));
  if (onsCol < 0 || netCol < 0) throw new Error(`Could not find ONS code (col ${onsCol}) or NET CURRENT EXPENDITURE (col ${netCol})`);
  console.log(`  ONS code col: ${onsCol}  NET CURRENT EXPENDITURE col: ${netCol}`);

  let matched = 0;
  let updated = 0;
  for (let i = 10; i < rows.length; i++) {
    const r = rows[i] || [];
    const gss = (r[onsCol] || '').toString().trim();
    const v = r[netCol];
    if (!gss || v == null || v === '') continue;
    if (!ourByGss.has(gss)) continue;
    matched++;
    // Source values are £ thousand. Convert to £ million (round to int).
    const thousand = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,£\s]/g, ''));
    if (!Number.isFinite(thousand)) continue;
    const mn = Math.round(thousand / 1000);
    if (mn <= 0) continue;
    await psqlWrite(`UPDATE councils SET revenue_budget_mn = ${mn} WHERE gss_code = '${gss}';`);
    updated++;
    if (updated % 50 === 0) console.log(`  ${updated} written`);
  }

  console.log(`\nDone. matched=${matched} written=${updated}`);
})();
