// READ-ONLY discovery for DESNZ "Sub-regional fuel poverty data 2026 (2024
// data)". Lists the workbook's sheets and opening rows and compares council
// codes with the councils table. Writes NOTHING to the database.
//
// Usage:
//   node scripts/discover-fuel-poverty.js > fuel-poverty-discovery.txt 2>&1

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const URL = 'https://assets.publishing.service.gov.uk/media/6a02febf81a251700a20b42a/fuel-poverty-sub-regional-2026-2024-data-tables.xlsx';
const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const CODE_RE = /^E\d{8}$/;
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const short = (v) => { const s = clean(v); return s.length > 45 ? s.slice(0, 42) + '...' : s; };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY'); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data: councils, error } = await db.from('councils').select('gss_code, name, type');
  if (error) throw new Error(`councils read: ${error.message}`);
  const english = councils.filter((c) => c.gss_code?.startsWith('E'));
  const byCode = new Map(english.map((c) => [c.gss_code, c]));
  console.log(`English councils: ${english.length}`);

  const res = await fetch(URL, { headers: UA });
  console.log(`HTTP ${res.status}`);
  const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
  console.log(`sheets (${wb.SheetNames.length}): ${wb.SheetNames.join(' | ')}`);

  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true });
    const codes = new Set();
    rows.forEach((r) => r.forEach((v) => { if (typeof v === 'string' && CODE_RE.test(v.trim())) codes.add(v.trim()); }));
    console.log(`\n--- SHEET ${name}: ${rows.length} rows; distinct E-codes ${codes.size}`);
    rows.slice(0, 16).forEach((r, i) => console.log(`  r${i}: ${r.slice(0, 14).map(short).join(' | ')}`));
    const sample = rows.find((r) => r.some((v) => clean(v) === 'E06000001'));
    if (sample) console.log(`  HARTLEPOOL ROW: ${sample.map(short).join(' | ')}`);
    if (codes.size > 20) {
      const matched = [...codes].filter((c) => byCode.has(c));
      const prefixes = new Map();
      for (const c of codes) prefixes.set(c.slice(0, 3), (prefixes.get(c.slice(0, 3)) || 0) + 1);
      const missing = english.filter((c) => !codes.has(c.gss_code));
      console.log(`  code prefixes: ${[...prefixes.entries()].sort().map(([p, n]) => `${p}=${n}`).join(', ')}`);
      console.log(`  matched councils ${matched.length}; by type: ${[...new Set(english.map((c) => c.type))].map((t) => `${t}=${english.filter((c) => c.type === t && codes.has(c.gss_code)).length}/${english.filter((c) => c.type === t).length}`).join(', ')}`);
      console.log(`  codes not in councils table (${[...codes].filter((c) => !byCode.has(c)).length}): ${[...codes].filter((c) => !byCode.has(c)).sort().slice(0, 60).join(' ')}`);
      console.log(`  English councils missing (${missing.length}): ${missing.slice(0, 40).map((c) => `${c.gss_code} ${c.name} [${c.type}]`).join('; ')}`);
    }
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
