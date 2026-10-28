// Import the Cabinet Office "Government grants register" (scheme and award
// data) into government_grant_schemes, government_grants and
// government_grants_summary. See scripts/migrations/2026-10-11g-government-grants.sql.
//
// The ODS is too large for SheetJS (its expanded XML exceeds V8's maximum
// string length), so it's read with the streaming reader in
// scripts/lib/ods-stream.js.
//
// Published once a year (each March). To load a new year, find the new
// "Government grants register ... scheme and award data" ODS on GOV.UK
// ("Government grants statistics") and run:
//   node scripts/import-government-grants.js --url=<ods> --fy=2025-26 --dry-run
//   ...then the same without --dry-run.
//
// Usage:
//   node scripts/import-government-grants.js [--dry-run]
//
// Every write is an upsert, so re-running is safe.

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { streamOdsRows } = require('./lib/ods-stream');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const DRY_RUN = !!args['dry-run'];
const URL = args.url || 'https://assets.publishing.service.gov.uk/media/69beccae7e02b81c0d1c75cf/2026-03-23_Government_Grants_Register_2024_to_2025.ods';
const FY = args.fy || (args.url ? null : '2024-25');
if (!FY || !/^\d{4}-\d{2}$/.test(FY)) { console.error('--fy=YYYY-YY is required with --url'); process.exit(1); }

// The register's per-department tab codes -> this site's /departments/[slug].
// null = no department page on the site yet (rows stored, not displayed).
const DEPT_CODE_TO_SLUG = {
  CO: 'cabinet-office', DBT: 'business-trade', DCMS: 'culture', Defra: 'environment',
  DESNZ: 'energy', DfE: 'education', DfT: 'transport', DHSC: 'health', DSIT: null,
  DWP: 'work-pensions', FCDO: 'foreign-office', HMRC: null, HMT: 'treasury',
  HO: 'home-office', MHCLG: 'housing', MoD: 'defence', MoJ: 'justice', TNA: null,
};
// Safety net for Funding Org names that might appear in no department tab.
// In 2024-25 every Funding Org was one of the 20 departments with its own tab
// (agencies such as ESFA appear under "Managed by", not as Funding Org).
const FUNDER_OVERRIDES = {
  'Education and Skills Funding Agency': 'DfE',
  'Standards and Testing Agency': 'DfE',
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY'); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// A handful of rows carry a literal "&amp;" in the data itself.
const clean = (v) => (v == null ? '' : String(v)).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const orNull = (v) => { const c = clean(v); return c ? c : null; };
const dateOrNull = (v) => { const c = clean(v); return /^\d{4}-\d{2}-\d{2}/.test(c) ? c.slice(0, 10) : null; };
const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function upsert(table, rows, onConflict) {
  if (DRY_RUN || rows.length === 0) return;
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 1000).map((r) => ({ ...r, updated_at: now })), { onConflict });
    if (error) throw new Error(`${table} upsert at ${i}: ${error.message}`);
    if (table === 'government_grants' && (i / 1000) % 25 === 0) console.log(`    ${table}: ${Math.min(i + 1000, rows.length).toLocaleString()}/${rows.length.toLocaleString()}`);
  }
}

async function main() {
  console.log(`Government grants import, ${FY}${DRY_RUN ? ' (DRY RUN, no writes)' : ''}\n  ${URL}`);
  const res = await fetch(URL, { headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`  ${(buf.length / 1e6).toFixed(1)} MB downloaded; streaming...`);

  const headers = new Map();           // sheet -> header array
  const schemes = [];
  const awards = [];
  const funderToCode = new Map();      // funder name -> dept tab code
  const tabCodes = new Set(Object.keys(DEPT_CODE_TO_SLUG));

  await streamOdsRows(buf, (sheet, cells) => {
    if (!headers.has(sheet)) {
      // Header = first row with 5+ text cells (data sheets start with it).
      if (cells.filter((v) => typeof v === 'string' && v.trim()).length >= 5) headers.set(sheet, cells.map(clean));
      return;
    }
    const h = headers.get(sheet);
    const get = (name) => { const i = h.indexOf(name); return i >= 0 ? cells[i] : undefined; };

    if (sheet === '#Schemes') {
      const code = orNull(get('Grant Programme:Code'));
      if (!code) return;
      schemes.push({
        fy: FY,
        scheme_code: code,
        title: orNull(get('Grant Programme:Title')),
        description: orNull(get('Description')),
        funder_name: orNull(get('Funding Org:Name')),
        managed_by: orNull(get('Managed by: Organisation Name')),
        fy_value: numOrNull(get('FY value')),
        start_date: dateOrNull(get('Start Date')),
        end_date: dateOrNull(get('End Date')),
        allocation_method: orNull(get('Allocation method') ?? get('Allocation Method')),
        duration_months: numOrNull(get('Duration (Months)')) != null ? Math.round(get('Duration (Months)')) : null,
        cofog_sector: orNull(get('COFOG: Sector type')),
        authority_act: orNull(get('Authority Act: Authority Act Name')),
      });
    } else if (sheet === '#Awards') {
      const id = orNull(get('Identifier'));
      const amount = numOrNull(get('Amount Awarded'));
      if (!id || amount == null) return;
      const awardType = orNull(get('Award type'));
      const isOrg = awardType === 'Organisation';
      awards.push({
        identifier: id,
        fy: FY,
        title: orNull(get('Title')),
        amount,
        scheme_code: orNull(get('Grant Programme:Code')),
        scheme_title: orNull(get('Grant Programme:Title')),
        award_date: dateOrNull(get('Award Date')),
        recipient_id: isOrg ? orNull(get('Recipient Org:Identifier')) : null,
        recipient_name: isOrg ? orNull(get('Recipient Org:Name')) : null,
        recipient_charity_number: isOrg ? orNull(get('Recipient Org:Charity Number')) : null,
        recipient_company_number: isOrg ? orNull(get('Recipient Org:Company Number')) : null,
        recipient_city: isOrg ? orNull(get('Recipient Org:City')) : null,
        recipient_postcode: isOrg ? orNull(get('Recipient Org:Postal Code')) : null,
        funder_id: orNull(get('Funding Org:Identifier')),
        funder_name: orNull(get('Funding Org:Name')),
        managed_by: orNull(get('Managed by: Organisation Name')),
        allocation_method: orNull(get('Allocation Method')),
        open_call: (() => { const v = clean(get('From an open call?')).toLowerCase(); return v === 'yes' ? true : v === 'no' ? false : null; })(),
        award_type: awardType,
      });
    } else if (tabCodes.has(sheet)) {
      const f = orNull(get('Funding Org:Name'));
      if (f && !funderToCode.has(f)) funderToCode.set(f, sheet);
    }
  });

  for (const [f, code] of Object.entries(FUNDER_OVERRIDES)) if (!funderToCode.has(f)) funderToCode.set(f, code);
  console.log(`  schemes: ${schemes.length.toLocaleString()}; awards: ${awards.length.toLocaleString()}`);
  console.log(`  department (Funding Org) -> tab mapping (${funderToCode.size}):`);
  for (const [f, c] of [...funderToCode.entries()].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))) {
    console.log(`    ${c.padEnd(6)} ${DEPT_CODE_TO_SLUG[c] ?? '(no site page)'}  <- ${f}`);
  }

  const assign = (r) => {
    const code = funderToCode.get(r.funder_name) ?? null;
    r.department_code = code;
    r.department_slug = code ? DEPT_CODE_TO_SLUG[code] ?? null : null;
  };
  schemes.forEach(assign);
  awards.forEach(assign);

  // Report anything left unmapped, and award types.
  const unmapped = new Map();
  for (const a of awards) if (!a.department_code) { const e = unmapped.get(a.funder_name) || { n: 0, sum: 0 }; e.n++; e.sum += a.amount; unmapped.set(a.funder_name, e); }
  console.log(`  awards with no department: ${[...unmapped.values()].reduce((s, e) => s + e.n, 0)}${unmapped.size ? ' — ' + [...unmapped.entries()].map(([f, e]) => `${f}: ${e.n} (£${Math.round(e.sum).toLocaleString()})`).join('; ') : ''}`);
  const types = new Map();
  for (const a of awards) types.set(a.award_type, (types.get(a.award_type) || 0) + 1);
  console.log(`  award types: ${[...types.entries()].map(([t, n]) => `${t}=${n}`).join(', ')} (non-"Organisation" awards stored without recipient details)`);
  const dupIds = awards.length - new Set(awards.map((a) => a.identifier)).size;
  if (dupIds) throw new Error(`${dupIds} duplicate award identifiers — not writing`);
  const dupSchemes = schemes.length - new Set(schemes.map((s) => s.scheme_code)).size;
  if (dupSchemes) throw new Error(`${dupSchemes} duplicate scheme codes — not writing`);

  // Summary per department per distributing body ("Managed by", e.g. Arts
  // Council England); Funding Org is always the department itself.
  const summary = new Map();
  for (const a of awards) {
    if (!a.department_code) continue;
    const body = a.managed_by || a.funder_name;
    const k = `${a.department_code}|${body}`;
    const e = summary.get(k) || { fy: FY, department_code: a.department_code, department_slug: a.department_slug, body_name: body, award_count: 0, total_amount: 0 };
    e.award_count++; e.total_amount += a.amount;
    summary.set(k, e);
  }
  const summaryRows = [...summary.values()].map((e) => ({ ...e, total_amount: Math.round(e.total_amount * 100) / 100 }));
  const byDept = new Map();
  for (const s of summaryRows) byDept.set(s.department_code, (byDept.get(s.department_code) || 0) + s.total_amount);
  console.log(`  distributing bodies: ${summaryRows.length}`);
  for (const r of [...summaryRows].sort((a, b) => a.department_code.localeCompare(b.department_code) || b.total_amount - a.total_amount)) {
    console.log(`    ${r.department_code.padEnd(6)} ${r.body_name}: ${r.award_count.toLocaleString()} awards, £${Math.round(r.total_amount).toLocaleString()}`);
  }
  console.log('  totals by department:');
  for (const [c, t] of [...byDept.entries()].sort((a, b) => b[1] - a[1])) console.log(`    ${c.padEnd(6)} £${Math.round(t).toLocaleString()}`);
  console.log(`  grand total of awards: £${Math.round(awards.reduce((s, a) => s + a.amount, 0)).toLocaleString()}`);

  await upsert('government_grant_schemes', schemes, 'fy,scheme_code');
  await upsert('government_grants', awards, 'identifier');
  await upsert('government_grants_summary', summaryRows, 'fy,department_code,body_name');
  console.log(`\n${DRY_RUN ? 'Computed' : 'Written'}: ${schemes.length.toLocaleString()} schemes, ${awards.length.toLocaleString()} awards, ${summaryRows.length} summary rows`);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
