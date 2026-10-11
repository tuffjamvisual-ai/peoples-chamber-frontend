// READ-ONLY discovery for MHCLG statutory homelessness detailed local
// authority tables. Downloads the latest quarterly and annual ODS files,
// prints each sheet's opening rows and size, and compares the council
// codes found with the councils table. Writes NOTHING to the database.
//
// Usage:
//   node scripts/discover-homelessness.js > homelessness-discovery.txt 2>&1

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { streamOdsRows } = require('./lib/ods-stream');

const FILES = [
  { label: 'Quarterly, January to March 2026', url: 'https://assets.publishing.service.gov.uk/media/6a82eeb83bd75b81e2329a7a/Statutory_Homelessness_Detailed_Local_Authority_Data_202603.ods' },
  { label: 'Annual, financial year 2024-25', url: 'https://assets.publishing.service.gov.uk/media/6a2ff87cd95ffddb05d4b063/Statutory_Homelessness_Detailed_Local_Authority_Data_2024-2025_corrected.ods' },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CODE_RE = /^[EWSN]\d{8}$/;
const short = (v) => {
  const s = typeof v === 'number' ? String(v) : String(v ?? '').replace(/\s+/g, ' ').trim();
  return s.length > 60 ? s.slice(0, 57) + '...' : s;
};

async function main() {
  const { data: councils, error } = await db.from('councils').select('gss_code, name, type, country');
  if (error) throw new Error(`councils read: ${error.message}`);
  const english = councils.filter((c) => c.gss_code && c.gss_code.startsWith('E'));
  const englishNonCounty = english.filter((c) => c.type !== 'county');
  console.log(`COUNCILS TABLE: ${councils.length}; English ${english.length} (non-county ${englishNonCounty.length})`);
  const byCode = new Map(councils.map((c) => [c.gss_code, c]));

  for (const f of FILES) {
    console.log(`\n==================== ${f.label}\n${f.url}`);
    const res = await fetch(f.url, { headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' } });
    console.log(`HTTP ${res.status}`);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`${(buf.length / 1e6).toFixed(2)} MB`);

    const sheets = new Map(); // name -> { rows, head: [], codes: Set, codeCol: Map }
    await streamOdsRows(buf, (sheet, cells, rowIndex) => {
      const s = sheets.get(sheet) || { rows: 0, head: [], codes: new Set(), codeCols: new Map(), sampleRow: null };
      s.rows++;
      if (s.head.length < 14) s.head.push(`r${rowIndex}: ` + cells.slice(0, 30).map(short).join(' | '));
      cells.forEach((v, i) => {
        if (typeof v === 'string' && CODE_RE.test(v.trim())) {
          s.codes.add(v.trim());
          s.codeCols.set(i, (s.codeCols.get(i) || 0) + 1);
          if (!s.sampleRow && v.trim().startsWith('E06')) s.sampleRow = `r${rowIndex}: ` + cells.map(short).join(' | ');
        }
      });
      sheets.set(sheet, s);
    });

    console.log(`SHEETS (${sheets.size}): ${[...sheets.keys()].join(', ')}`);
    for (const [name, s] of sheets) {
      console.log(`\n--- SHEET ${name}: ${s.rows} non-empty rows; distinct area codes ${s.codes.size}; code columns ${[...s.codeCols.entries()].map(([i, n]) => `col${i}=${n}`).join(', ') || 'none'}`);
      for (const h of s.head) console.log('  ' + h);
      if (s.sampleRow) console.log('  SAMPLE UNITARY ROW ' + s.sampleRow);
      if (s.codes.size) {
        const matched = [...s.codes].filter((c) => byCode.has(c));
        const unmatched = [...s.codes].filter((c) => !byCode.has(c));
        const missing = englishNonCounty.filter((c) => !s.codes.has(c.gss_code));
        const counties = english.filter((c) => c.type === 'county' && s.codes.has(c.gss_code)).length;
        console.log(`  matched councils ${matched.length}; county codes present ${counties}; codes not in councils table ${unmatched.length}${unmatched.length ? ': ' + unmatched.sort().join(' ') : ''}`);
        console.log(`  English non-county councils missing (${missing.length})${missing.length && missing.length <= 40 ? ': ' + missing.map((c) => `${c.gss_code} ${c.name}`).join('; ') : ''}`);
      }
    }
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
