// Youth justice by council and service (owner approved 18 Nov 2026, Cowork ENTRY 303 and 307, FSM-YJ step 2b): reads the
// three Youth Justice Statistics 2024 to 2025 files (MoJ and YJB, published 29 January 2026; GOV.UK zips, unpacked into
// --dir), checks them and writes the guarded load SQL. It never writes to the database itself.
//   npx tsx scripts/import-youth-justice.ts --dir <unpacked zips> --sql <out.sql>
// Sources (file names inside the zips):
//   Ch 2 - First time entrants to the youth justice system.xlsx, sheets 2.10 (number) and 2.11 (rate per 100,000 aged 10
//     to 17), by local authority of residence, years ending December 2014 to 2024, England and Wales;
//   Children_Table.ods, sheet Data: children cautioned or sentenced by youth justice service (YJS), years ending March
//     2015 to 2025. The file repeats rows, so they are SUMMED per service and year (the sums equal the published Ch 3
//     table 3.1 totals, checked below);
//   Annex C - Resources in YJSs 2024-25.xlsx, sheet C.4: each service's funding by source, year ending March 2025.
// Names only, no codes: lib/youth-justice/names.json maps every name (built from our councils table); a name not there stops.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import names from '../lib/youth-justice/names.json';
import { lit } from './lib/sql-literal';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SOURCE = 'https://www.gov.uk/government/statistics/youth-justice-statistics-2024-to-2025';
const REGIONS: Record<string, string> = {
  'North East': 'E12000001', 'North West': 'E12000002', 'Yorkshire and the Humber': 'E12000003', 'East Midlands': 'E12000004',
  'West Midlands': 'E12000005', 'Eastern': 'E12000006', 'London': 'E12000007', 'South East': 'E12000008', 'South West': 'E12000009', 'Wales': 'W92000004',
};

function find(dir: string, file: string): string {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) { const f = (() => { try { return find(p, file); } catch { return null; } })(); if (f) return f; }
    else if (e === file) return p;
  }
  throw new Error(`${file} not found under ${dir}`);
}
const sheet = (file: string, name: string) => {
  const wb = XLSX.read(readFileSync(file));
  const ws = wb.Sheets[name]; if (!ws) throw new Error(`${path.basename(file)}: no sheet ${name}`);
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
};
const cell = (v: unknown): { n: number | null; sym: string | null } => {
  if (typeof v === 'number') return { n: v, sym: null };
  const s = String(v ?? '').trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return { n: Number(s), sym: null };
  return { n: null, sym: s || null };
};
const r2 = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

type Fte = { area_code: string; area_name: string; area_level: string; country: string; year: number; fte_count: number | null; fte_rate: number | null; symbols: Record<string, string>; source_url: string };
type Yjs = { yjs_name: string; country: string; region: string | null; year: string; council_codes: string[]; children_cautioned_sentenced: number | null;
  funding_yjb_grant: number | null; funding_local_authority: number | null; funding_police: number | null; funding_pcc: number | null; funding_probation: number | null;
  funding_health: number | null; funding_welsh_government: number | null; funding_other: number | null; funding_total: number | null; population_10_17: number | null; source_url: string };

function main() {
  const dir = arg('--dir'), out = arg('--sql');
  if (!dir || !out) throw new Error('usage: --dir <unpacked zips> --sql <out.sql>');
  const problems: string[] = [];

  // 1. First time entrants (2.10 number, 2.11 rate): the same names in the same order.
  const ch2 = find(dir, 'Ch 2 - First time entrants to the youth justice system.xlsx');
  const t10 = sheet(ch2, '2.10'), t11 = sheet(ch2, '2.11');
  const hi = t10.findIndex((r) => String(r[1] ?? '').startsWith('Local Authority'));
  const years = (t10[hi] as unknown[]).slice(2).map((y) => Number(y));
  if (years[0] !== 2014 || years[years.length - 1] !== 2024) throw new Error(`2.10 years ${years.join(',')}`);
  const fte: Fte[] = []; const seen = new Set<string>();
  for (let i = hi + 1; i < t10.length; i++) {
    const a = t10[i], b = t11[i]; const region = String(a[0] ?? '').trim(), name = String(a[1] ?? '').trim();
    if (!name) continue;
    if (String(b?.[1] ?? '').trim() !== name) problems.push(`2.10 and 2.11 differ at row ${i + 1}: ${name}`);
    let code: string, level: string, country: string;
    if (name === 'Total England and Wales') { code = 'K04000001'; level = 'england_wales'; country = 'England and Wales'; }
    else if (name.startsWith('Total ')) {
      const rn = name.slice(6); code = REGIONS[rn]; level = 'region'; country = rn === 'Wales' ? 'Wales' : 'England';
      if (!code) { problems.push(`unknown region total ${name}`); continue; }
    } else {
      const fteNames = names.fte as Record<string, string>;
      code = fteNames[name];
      if (!code) { problems.push(`first time entrants name not in the list: ${name}`); continue; }
      // Two 'Dorset' rows: the one with figures in 2014 (to 2018) is the old county, the other the new council (from 2019).
      if (name.startsWith('Dorset')) code = cell(a[2]).n != null ? names.fteDorsetOld : code;
      level = 'council'; country = region === 'Wales' ? 'Wales' : 'England';
    }
    seen.add(name);
    years.forEach((y, k) => {
      const c = cell(a[k + 2]), r = cell(b?.[k + 2]); const symbols: Record<string, string> = {};
      if (c.sym) symbols.fte_count = c.sym; if (r.sym) symbols.fte_rate = r.sym;
      fte.push({ area_code: code, area_name: name.replace(/\s*\[note \d+\]/g, ''), area_level: level, country, year: y,
        fte_count: c.n == null ? null : r2(c.n, 2), fte_rate: r.n == null ? null : r2(r.n, 3), symbols, source_url: SOURCE });
    });
  }
  const ew24 = fte.find((x) => x.area_code === 'K04000001' && x.year === 2024);
  if (ew24?.fte_count !== 8110.07 || ew24?.fte_rate !== 137.892) problems.push(`England and Wales 2024 is ${ew24?.fte_count}, ${ew24?.fte_rate}; expected 8110.07, 137.892`);
  for (const y of years) {
    const regions = fte.filter((x) => x.area_level === 'region' && x.year === y).reduce((s, x) => s + (x.fte_count ?? 0), 0);
    const ew = fte.find((x) => x.area_code === 'K04000001' && x.year === y)?.fte_count ?? 0;
    if (Math.abs(regions - ew) > 1) problems.push(`${y}: region totals add up to ${r2(regions, 2)}, England and Wales is ${ew}`);
  }
  const keys = new Set<string>();
  for (const x of fte) { const k = `${x.area_code}|${x.year}`; if (keys.has(k)) problems.push(`two first time entrants rows for ${k}`); keys.add(k); }

  // 2. Children cautioned or sentenced by service: rows summed per service and year.
  const ct = sheet(find(dir, 'Children_Table.ods'), 'Data');
  const h = (ct[0] as string[]).map((x) => String(x).trim());
  const ix = (k: string) => { const i = h.indexOf(k); if (i < 0) throw new Error(`Children_Table: no column ${k}`); return i; };
  const [cy, cs, cr, ce, cn] = ['Financial_Year', 'YJS', 'Wales or English region', 'England_Wales', 'Number_Children'].map(ix);
  const svc = new Map<string, Yjs>(); const byYear: Record<string, { England: number; Wales: number }> = {};
  const yjsNames = names.yjs as Record<string, string[]>;
  for (const row of ct.slice(1)) {
    const name = String(row[cs] ?? '').trim(); if (!name) continue;
    const year = String(row[cy]).trim(), country = String(row[ce]).trim(), n = Number(row[cn]);
    if (!yjsNames[name]) { problems.push(`service name not in the list: ${name}`); continue; }
    if (!Number.isFinite(n)) { problems.push(`${name} ${year}: Number_Children ${row[cn]}`); continue; }
    const k = `${name}|${year}`;
    const s = svc.get(k) ?? { yjs_name: name, country, region: String(row[cr] ?? '').trim() || null, year, council_codes: yjsNames[name], children_cautioned_sentenced: 0,
      funding_yjb_grant: null, funding_local_authority: null, funding_police: null, funding_pcc: null, funding_probation: null, funding_health: null,
      funding_welsh_government: null, funding_other: null, funding_total: null, population_10_17: null, source_url: SOURCE };
    s.children_cautioned_sentenced = (s.children_cautioned_sentenced ?? 0) + n; svc.set(k, s);
    (byYear[year] ??= { England: 0, Wales: 0 })[country as 'England' | 'Wales'] += n;
  }
  // The published Ch 3 table 3.1 totals (England / Wales) for the first and last years.
  const expect: Record<string, [number, number]> = { '2014-15': [36018, 1928], '2024-25': [12661, 628] };
  for (const [y, [e, w]] of Object.entries(expect)) if (byYear[y]?.England !== e || byYear[y]?.Wales !== w) problems.push(`${y}: children cautioned or sentenced ${JSON.stringify(byYear[y])}, expected ${e} and ${w}`);

  // 3. Funding by source, year ending March 2025 (C.4), onto each service's 2024-25 row.
  const c4 = sheet(find(dir, 'Annex C - Resources in YJSs 2024-25.xlsx'), 'C.4');
  const h4i = c4.findIndex((r) => String(r[0] ?? '').trim() === 'Youth Justice Service');
  const h4 = (c4[h4i] as string[]).map((x) => String(x ?? '').trim());
  const col = (k: string) => { const i = h4.findIndex((x) => x.startsWith(k)); if (i < 0) throw new Error(`C.4: no column ${k}`); return i; };
  const F = { funding_yjb_grant: col('YJB Youth Justice Grant'), funding_local_authority: col('Local Authority'), funding_police: col('Police'), funding_pcc: col('Police and Crime Commissioner'),
    funding_probation: col('Probation'), funding_health: col('Health'), funding_welsh_government: col('Welsh Government'), funding_other: col('Other'), funding_total: col('Total funding') };
  const pop = col('10-17 mid year population');
  const alias = names.annexAlias as Record<string, string>;
  let sumGrant = 0, sumTotal = 0; const totals: Record<string, number[]> = {};
  for (const row of c4.slice(h4i + 1)) {
    const raw = String(row[0] ?? '').trim();
    // The total rows leave the first column blank and carry their label in the second ('England and Wales Total').
    const label = String(row[1] ?? '').trim();
    if (!raw) { if (/Total$/.test(label)) totals[label] = [Number(row[F.funding_yjb_grant]), Number(row[F.funding_total])]; continue; }
    const name = alias[raw] ?? raw; const s = svc.get(`${name}|2024-25`);
    if (!s) { problems.push(`C.4 service with no 2024-25 children row: ${raw}`); continue; }
    for (const [k, i] of Object.entries(F)) (s as Record<string, unknown>)[k] = r2(Number(row[i]), 2);
    s.population_10_17 = Math.round(Number(row[pop]));
    sumGrant += Number(row[F.funding_yjb_grant]); sumTotal += Number(row[F.funding_total]);
  }
  const ewT = totals['England and Wales Total'];
  if (!ewT || Math.abs(sumGrant - ewT[0]) > 1 || Math.abs(sumTotal - ewT[1]) > 1) problems.push(`C.4 services add up to ${r2(sumGrant, 2)} grant and ${r2(sumTotal, 2)} total; the England and Wales Total row is ${ewT}`);

  const services = [...svc.values()];
  console.log(`first time entrants: ${fte.length} rows (${new Set(fte.map((x) => x.area_code)).size} areas, ${years[0]} to ${years[years.length - 1]}); England and Wales 2024 ${ew24?.fte_count}, rate ${ew24?.fte_rate}`);
  console.log(`services: ${services.length} rows (${new Set(services.map((x) => x.yjs_name)).size} services); 2024-25 children ${JSON.stringify(byYear['2024-25'])}; C.4 grant ${r2(sumGrant, 2)}, total ${r2(sumTotal, 2)}`);
  if (problems.length) throw new Error(`checks failed:\n  ${[...new Set(problems)].slice(0, 30).join('\n  ')}`);

  const FC: (keyof Fte)[] = ['area_code', 'area_name', 'area_level', 'country', 'year', 'fte_count', 'fte_rate', 'symbols', 'source_url'];
  const SC: (keyof Yjs)[] = ['yjs_name', 'country', 'region', 'year', 'council_codes', 'children_cautioned_sentenced', 'funding_yjb_grant', 'funding_local_authority', 'funding_police', 'funding_pcc', 'funding_probation', 'funding_health', 'funding_welsh_government', 'funding_other', 'funding_total', 'population_10_17', 'source_url'];
  const ins = (table: string, cols: string[], rs: Record<string, unknown>[]) => `INSERT INTO public.${table} (${cols.join(', ')}) VALUES\n` + rs.map((r) => `  (${cols.map((k) => lit(r[k])).join(', ')})`).join(',\n') + ';';
  const sql = [
    `-- Youth justice: ${fte.length} first time entrants rows and ${services.length} service rows, written by scripts/import-youth-justice.ts`,
    '\\set ON_ERROR_STOP on', 'BEGIN;', "SET LOCAL statement_timeout = '60s';", "SET LOCAL lock_timeout = '5s';",
    'DO $$ BEGIN',
    "  IF EXISTS (SELECT 1 FROM public.council_youth_first_entrants) OR EXISTS (SELECT 1 FROM public.youth_justice_services) THEN RAISE EXCEPTION 'the youth justice tables are not empty'; END IF;",
    'END $$;',
    ins('council_youth_first_entrants', FC, fte as unknown as Record<string, unknown>[]),
    ins('youth_justice_services', SC, services as unknown as Record<string, unknown>[]),
    'DO $$ DECLARE a integer; b integer; c numeric; BEGIN',
    '  SELECT count(*) INTO a FROM public.council_youth_first_entrants; SELECT count(*) INTO b FROM public.youth_justice_services;',
    `  IF a <> ${fte.length} OR b <> ${services.length} THEN RAISE EXCEPTION 'rows %, %', a, b; END IF;`,
    "  SELECT fte_count INTO c FROM public.council_youth_first_entrants WHERE area_code = 'K04000001' AND year = 2024;",
    "  IF c IS DISTINCT FROM 8110.07 THEN RAISE EXCEPTION 'England and Wales 2024 is %', c; END IF;",
    'END $$;',
    "UPDATE public.hand_loaded_datasets SET held_period = 'first time entrants 2014 to 2024; services years ending March 2015 to 2025, funding 2024-25', loaded_on = current_date WHERE key = 'youth_justice';",
    'COMMIT;', '',
  ].join('\n');
  writeFileSync(out, sql);
  console.log(`wrote ${out}`);
}
try { main(); } catch (e) { console.error((e as Error).message); process.exit(1); }
