// READ-ONLY discovery for DfT road safety table RAS0403 (reported road
// casualties by local authority). Lists the current attachments from the
// GOV.UK Content API, then for each file prints sheets, opening rows, the
// years present and how area codes match the councils table. Writes NOTHING
// to the database.
//
// Usage:
//   node scripts/discover-road-casualties.js > road-casualties-discovery.txt 2>&1

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const CONTENT_API = 'https://www.gov.uk/api/content/government/statistical-data-sets/road-safety-statistics-data-tables';
const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const CODE_RE = /^[EWS]\d{8}$/;
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const short = (v) => { const s = clean(v); return s.length > 40 ? s.slice(0, 37) + '...' : s; };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data: councils, error } = await db.from('councils').select('gss_code, name, type, country');
  if (error) throw new Error(`councils read: ${error.message}`);
  const gb = councils.filter((c) => /^[EWS]/.test(c.gss_code || ''));
  const byCode = new Map(gb.map((c) => [c.gss_code, c]));
  console.log(`GB councils: ${gb.length} (${[...new Set(gb.map((c) => c.type))].join(', ')})`);

  const json = await (await fetch(CONTENT_API, { headers: UA })).json();
  console.log(`page public_updated_at: ${json.public_updated_at}`);
  const atts = (json.details?.attachments ?? []).filter((a) => /ras0403/i.test(a.url || ''));
  console.log(`RAS0403 attachments (${atts.length}):`);
  for (const a of atts) console.log(`  ${a.title} | ${a.url} | updated ${a.updated_at || a.created_at || '?'}`);

  for (const a of atts) {
    console.log(`\n==================== ${a.url}`);
    const res = await fetch(a.url, { headers: UA });
    console.log(`HTTP ${res.status}`);
    if (!res.ok) continue;
    const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
    console.log(`sheets (${wb.SheetNames.length}): ${wb.SheetNames.join(' | ')}`);
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true });
      const codes = new Set();
      rows.forEach((r) => r.forEach((v) => { if (typeof v === 'string' && CODE_RE.test(v.trim())) codes.add(v.trim()); }));
      console.log(`\n--- SHEET ${name}: ${rows.length} rows; distinct codes ${codes.size}`);
      rows.slice(0, 14).forEach((r, i) => console.log(`  r${i}: ${r.slice(0, 16).map(short).join(' | ')}`));
      const sample = rows.find((r) => r.some((v) => clean(v) === 'E06000001'));
      if (sample) console.log(`  HARTLEPOOL ROW: ${sample.slice(0, 30).map(short).join(' | ')}`);
      const hartRows = rows.filter((r) => r.some((v) => clean(v) === 'E06000001'));
      if (hartRows.length > 1) console.log(`  Hartlepool appears in ${hartRows.length} rows (long format?); first 4:\n    ${hartRows.slice(0, 4).map((r) => r.slice(0, 16).map(short).join(' | ')).join('\n    ')}`);
      // Years appearing anywhere as 4-digit numbers 1979-2030 in the first 10 rows or a year column.
      const years = new Set();
      rows.slice(0, 12).forEach((r) => r.forEach((v) => { const m = clean(v).match(/^(19[7-9]\d|20[0-3]\d)$/); if (m) years.add(m[1]); }));
      const yearColVals = new Map();
      rows.forEach((r) => r.forEach((v, i) => { if (typeof v === 'number' && v >= 1979 && v <= 2030 && Number.isInteger(v)) yearColVals.set(i, (yearColVals.get(i) || new Set()).add(v)); }));
      const yc = [...yearColVals.entries()].filter(([, s]) => s.size > 3).map(([i, s]) => `col${i}: ${Math.min(...s)}-${Math.max(...s)} (${s.size})`);
      console.log(`  years in heading rows: ${[...years].sort().join(', ') || 'none'}; year-like columns: ${yc.join('; ') || 'none'}`);
      if (codes.size > 20) {
        const matched = [...codes].filter((c) => byCode.has(c));
        const prefixes = new Map();
        for (const c of codes) prefixes.set(c.slice(0, 3), (prefixes.get(c.slice(0, 3)) || 0) + 1);
        const missing = gb.filter((c) => !codes.has(c.gss_code));
        console.log(`  code prefixes: ${[...prefixes.entries()].sort().map(([p, n]) => `${p}=${n}`).join(', ')}`);
        console.log(`  matched councils ${matched.length}; by type: ${[...new Set(gb.map((c) => c.type))].map((t) => `${t}=${gb.filter((c) => c.type === t && codes.has(c.gss_code)).length}/${gb.filter((c) => c.type === t).length}`).join(', ')}`);
        const extra = [...codes].filter((c) => !byCode.has(c)).sort();
        console.log(`  codes not in councils table (${extra.length}): ${extra.slice(0, 80).join(' ')}`);
        console.log(`  GB councils missing (${missing.length}): ${missing.slice(0, 50).map((c) => `${c.gss_code} ${c.name} [${c.type}]`).join('; ')}`);
      }
      // Distinct text values in short text columns (severity / road user labels).
      const textCols = new Map();
      rows.slice(0, 3000).forEach((r) => r.forEach((v, i) => { const s = clean(v); if (s && s.length < 40 && !/^\d/.test(s) && !CODE_RE.test(s)) { const m = textCols.get(i) || new Map(); m.set(s, (m.get(s) || 0) + 1); textCols.set(i, m); } }));
      for (const [i, m] of textCols) if (m.size > 1 && m.size <= 15) console.log(`  col${i} values: ${[...m.entries()].map(([s, n]) => `${s}=${n}`).join(' | ')}`);
    }
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
