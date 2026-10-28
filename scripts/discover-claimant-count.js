// READ-ONLY discovery for the ONS Claimant Count by council.
//   1. ONS CC01 (Claimant Count by unitary and local authority): finds the
//      current .xls on the dataset page, prints sheets and opening rows, and
//      compares area codes with the councils table.
//   2. Nomis (free ONS service, Open Government Licence, no account needed;
//      guest requests are capped at 25,000 cells): lists the claimant count
//      dataset's geography types and date range, and fetches the latest
//      month for the council-level geography to compare codes.
// Writes NOTHING to the database.
//
// Usage:
//   node scripts/discover-claimant-count.js > claimant-discovery.txt 2>&1

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const ONS_PAGE = 'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment/datasets/claimantcountbyunitaryandlocalauthorityexperimental';
const NOMIS = 'https://www.nomisweb.co.uk/api/v01';
const DATASET = 'NM_162_1'; // Claimant count by sex and age

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY'); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const short = (v) => { const s = clean(v); return s.length > 50 ? s.slice(0, 47) + '...' : s; };
const CODE_RE = /^[EWSNK]\d{8}$/;

function compare(label, codes, councils) {
  const byCode = new Map(councils.map((c) => [c.gss_code, c]));
  const aliases = { E08000038: 'E08000016', E08000039: 'E08000019' };
  const matched = new Set();
  const unmatched = [];
  for (const c of codes) {
    if (byCode.has(c)) matched.add(c);
    else if (aliases[c] && byCode.has(aliases[c])) matched.add(aliases[c]);
    else unmatched.push(c);
  }
  const missing = councils.filter((c) => !matched.has(c.gss_code));
  console.log(`  ${label}: ${codes.size} codes; matched councils ${matched.size}/${councils.length}`);
  console.log(`    matched by type: ${[...new Set(councils.map((c) => c.type))].map((t) => `${t}=${councils.filter((c) => c.type === t && matched.has(c.gss_code)).length}/${councils.filter((c) => c.type === t).length}`).join(', ')}`);
  console.log(`    codes not in councils table (${unmatched.length}): ${unmatched.sort().join(' ')}`);
  console.log(`    councils missing (${missing.length}): ${missing.map((c) => `${c.gss_code} ${c.name} [${c.type}]`).join('; ')}`);
}

async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; } catch { return { status: res.status, text: text.slice(0, 500) }; }
}

async function main() {
  const { data: councils, error } = await db.from('councils').select('gss_code, name, type, country');
  if (error) throw new Error(`councils read: ${error.message}`);
  console.log(`COUNCILS TABLE: ${councils.length}`);

  // ---------- 1. ONS CC01
  console.log('\n==================== ONS CC01');
  const page = await fetch(ONS_PAGE, { headers: UA });
  console.log(`dataset page HTTP ${page.status}`);
  const html = await page.text();
  const links = [...new Set([...html.matchAll(/href="([^"]+\.xlsx?)"/gi)].map((m) => m[1]))];
  console.log(`spreadsheet links on page (${links.length}):\n  ${links.slice(0, 12).join('\n  ')}`);
  const current = links.find((l) => /\/current\//.test(l)) || links[0];
  if (current) {
    const url = current.startsWith('http') ? current : `https://www.ons.gov.uk${current}`;
    console.log(`\nreading ${url}`);
    const res = await fetch(url, { headers: UA });
    console.log(`HTTP ${res.status}`);
    if (res.ok) {
      const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
      console.log(`sheets (${wb.SheetNames.length}): ${wb.SheetNames.join(', ')}`);
      const allCodes = new Set();
      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true });
        const codes = new Set();
        rows.forEach((r) => r.forEach((v) => { if (typeof v === 'string' && CODE_RE.test(v.trim())) codes.add(v.trim()); }));
        codes.forEach((c) => allCodes.add(c));
        console.log(`\n--- SHEET ${name}: ${rows.length} rows; distinct codes ${codes.size}`);
        rows.slice(0, 14).forEach((r, i) => console.log(`  r${i}: ${r.slice(0, 18).map(short).join(' | ')}`));
        const sample = rows.find((r) => r.some((v) => clean(v) === 'E06000001'));
        if (sample) console.log(`  HARTLEPOOL ROW: ${sample.map(short).join(' | ')}`);
      }
      compare('CC01 all sheets', allCodes, councils);
    }
  }

  // ---------- 2. Nomis
  console.log('\n==================== NOMIS');
  const ds = await getJson(`${NOMIS}/dataset/${DATASET}.def.sdmx.json`);
  console.log(`dataset def HTTP ${ds.status}`);
  const kf = ds.json?.structure?.keyfamilies?.keyfamily?.[0];
  if (kf) {
    console.log(`name: ${kf.name?.value}`);
    console.log(`dimensions: ${(kf.components?.dimension ?? []).map((d) => d.conceptref).join(', ')}`);
    const ann = (kf.annotations?.annotation ?? []).map((a) => `${a.annotationtitle}: ${short(a.annotationtext)}`);
    console.log(`annotations:\n  ${ann.join('\n  ')}`);
  } else console.log(JSON.stringify(ds).slice(0, 600));

  const geo = await getJson(`${NOMIS}/dataset/${DATASET}/geography/TYPE.def.sdmx.json`);
  const types = geo.json?.structure?.codelists?.codelist?.[0]?.code ?? [];
  console.log(`\ngeography types (${types.length}):`);
  for (const t of types) console.log(`  ${t.value}: ${t.description?.value}`);

  for (const dim of ['date', 'measures', 'measure', 'gender', 'age']) {
    const r = await getJson(`${NOMIS}/dataset/${DATASET}/${dim}.def.sdmx.json`);
    const codes = r.json?.structure?.codelists?.codelist?.[0]?.code ?? [];
    const show = dim === 'date' ? [...codes.slice(0, 3), { value: '...', description: { value: '' } }, ...codes.slice(-3)] : codes.slice(0, 15);
    console.log(`\n${dim} (${codes.length}): ${show.map((c) => `${c.value}=${c.description?.value}`).join('; ')}`);
  }

  // Latest month for each council-level geography type found.
  const laTypes = types.filter((t) => /local authorities: district \/ unitary|local authorities: county \/ unitary/i.test(t.description?.value || ''));
  console.log(`\ncouncil-level geography types to try: ${laTypes.map((t) => `${t.value} (${t.description?.value})`).join('; ') || 'none matched'}`);
  for (const t of laTypes.slice(0, 4)) {
    const url = `${NOMIS}/dataset/${DATASET}.data.csv?geography=${t.value}&date=latest&gender=0&age=0&measure=1,2&measures=20100&select=date_name,geography_name,geography_code,measure_name,obs_value`;
    const res = await fetch(url, { headers: UA });
    const text = await res.text();
    const lines = text.trim().split('\n');
    console.log(`\n--- ${t.value} ${t.description?.value}: HTTP ${res.status}, ${lines.length - 1} rows`);
    lines.slice(0, 6).forEach((l) => console.log(`  ${l}`));
    if (res.ok && lines.length > 1) {
      const codes = new Set(lines.slice(1).map((l) => (l.match(/"([EWSN]\d{8})"/) || [])[1]).filter(Boolean));
      compare(`Nomis ${t.value}`, codes, councils);
    }
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
