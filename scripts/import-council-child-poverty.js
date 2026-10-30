// Import DWP "Children in Low Income Families: local area statistics" into
// council_child_poverty. See scripts/migrations/2026-10-11f-council-child-poverty.sql
// for the source, measures and definitions. Layout live-verified 2026-10-11
// (scripts/discover-child-poverty.js): every LA sheet has a header row
// "Local Authority | Area Code | Number of children FYE yyyy ... |
// Percentage of children FYE yyyy (%) ...", percentages as fractions.
//
// Published once a year (next: March 2027). To load a new release, find the
// new ODS on GOV.UK ("Children in low income families: local area
// statistics") and run:
//   node scripts/import-council-child-poverty.js --url=<new ods> --release="FYE 2023 to 2026, published <date>" --dry-run
//   ...then the same without --dry-run.
//
// Usage:
//   node scripts/import-council-child-poverty.js [--dry-run]
//
// Refuses to write unless every council code in the file is in the councils
// table. Every write is an upsert, so re-running is safe.

require('dotenv').config({ path: '.env.local', quiet: true });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const DRY_RUN = !!args['dry-run'];
const URL_DEFAULT = 'https://assets.publishing.service.gov.uk/media/69b809619d8b52961a62b49a/children-in-low-income-families-local-area-statistics-2022-2025.ods';
const RELEASE_DEFAULT = 'FYE 2022 to 2025, published 26 March 2026';
const URL = args.url || URL_DEFAULT;
const RELEASE = args.release || (args.url ? null : RELEASE_DEFAULT);
if (!RELEASE) {
  console.error('--release="FYE xxxx to yyyy, published <date>" is required with --url');
  process.exit(1);
}

const SHEETS = [
  { re: /AHC_Relative_LA/i, measure: 'relative_ahc' },
  { re: /BHC_Relative_LA/i, measure: 'relative_bhc' },
  { re: /BHC_Absolute_LA/i, measure: 'absolute_bhc' },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function parseSheet(wb, sheetName, measure, councilsByCode) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false, defval: '' });
  const hdr = rows.findIndex((r) => /^Local Authority/i.test(String(r[0]).trim()) && String(r[1]).trim() === 'Area Code');
  if (hdr < 0) throw new Error(`${sheetName}: header row not found`);
  const numCols = [], pctCols = [];
  rows[hdr].forEach((v, i) => {
    const h = String(v);
    const y = h.match(/FYE (\d{4})/);
    if (!y) return;
    if (/^Number of children/i.test(h)) numCols.push({ i, fye: Number(y[1]) });
    else if (/^Percentage of children/i.test(h)) pctCols.push({ i, fye: Number(y[1]) });
  });
  if (!numCols.length || numCols.length !== pctCols.length) throw new Error(`${sheetName}: unexpected year columns`);

  const out = [];
  const unknown = [];
  for (const r of rows.slice(hdr + 1)) {
    const code = String(r[1] ?? '').trim();
    if (!/^[EWSN]\d{8}$/.test(code)) continue; // skips the UK (K02...) row and notes
    const council = councilsByCode.get(code);
    if (!council) { unknown.push(`${code} ${r[0]}`); continue; }
    for (const { i, fye } of numCols) {
      const count = r[i];
      const pctCol = pctCols.find((p) => p.fye === fye);
      const pct = pctCol ? r[pctCol.i] : null;
      if (typeof count !== 'number' || !Number.isFinite(count)) continue;
      out.push({
        council_gss_code: code,
        council_name: council.name,
        measure,
        fye,
        children_count: Math.round(count),
        percentage: typeof pct === 'number' && Number.isFinite(pct) ? Math.round(pct * 100 * 1000) / 1000 : null,
        release_label: RELEASE,
      });
    }
  }
  return { out, unknown, years: numCols.map((c) => c.fye) };
}

async function main() {
  console.log(`Child poverty import${DRY_RUN ? ' (DRY RUN, no writes)' : ''}\n  ${URL}\n  release: ${RELEASE}`);
  const { data: councils, error } = await db.from('councils').select('gss_code, name, type');
  if (error) throw new Error(`councils read: ${error.message}`);
  const byCode = new Map(councils.map((c) => [c.gss_code, c]));

  const res = await fetch(URL, { headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' } });
  if (!res.ok) throw new Error(`ODS HTTP ${res.status}`);
  const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });

  const all = [];
  let unknownAll = [];
  for (const { re, measure } of SHEETS) {
    const sheetName = wb.SheetNames.find((n) => re.test(n));
    if (!sheetName) throw new Error(`No sheet matching ${re} (sheets: ${wb.SheetNames.join(' | ')})`);
    const { out, unknown, years } = parseSheet(wb, sheetName, measure, byCode);
    const codes = new Set(out.map((r) => r.council_gss_code));
    console.log(`  ${sheetName} -> ${measure}: years ${years.join(', ')}; ${codes.size} councils; ${out.length} rows`);
    unknownAll = unknownAll.concat(unknown);
    all.push(...out);
  }
  const missing = councils.filter((c) => c.type !== 'county' && !all.some((r) => r.council_gss_code === c.gss_code));
  console.log(`  non-county councils with no rows: ${missing.length}${missing.length ? ': ' + missing.map((c) => `${c.gss_code} ${c.name}`).join('; ') : ''}`);
  if (unknownAll.length) {
    console.log(`  CODES NOT IN COUNCILS TABLE (${unknownAll.length}): ${[...new Set(unknownAll)].join('; ')}`);
    throw new Error('Unmatched council codes — not writing');
  }

  if (!DRY_RUN) {
    const now = new Date().toISOString();
    for (let i = 0; i < all.length; i += 1000) {
      const { error: uErr } = await db
        .from('council_child_poverty')
        .upsert(all.slice(i, i + 1000).map((r) => ({ ...r, updated_at: now })), { onConflict: 'council_gss_code,measure,fye' });
      if (uErr) throw new Error(`upsert: ${uErr.message}`);
    }
  }
  // The council pages keep for a week: refresh them now (owner, 30 Oct 2026; scripts/lib/refresh-site.js).
  if (!DRY_RUN && (all.length) > 0) { const site = require('./lib/refresh-site'); await site.recordRefresh('import-council-child-poverty', { changed: all.length, ...(await site.refreshCouncilPages()) }); }
  console.log(`\n${all.length.toLocaleString()} rows ${DRY_RUN ? 'computed' : 'written'}`);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
