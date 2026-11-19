// Houses in multiple occupation (HMOs) by council (owner approved 19 Nov 2026, Cowork ENTRY 362, from Stage A, ENTRY
// 358: Claude outputs/audit/hmo-358/SOURCES.md). Reads the official files saved by hand in data/hmos/ and gives one row
// per area and year (31 March) for council_hmos. Used by scripts/import-council-hmos.ts only; it never writes.
//
// England: MHCLG Local Authority Housing Statistics (LAHS), section F, 2011-12 to 2024-25: f8a (the council's estimate of
//   all HMOs), f9a (its estimate of HMOs needing a mandatory licence), f10a (properties with a mandatory licence).
//   Homes: MHCLG Live Table 100 (dwellings by district, 31 March). Councils merged since (Buckinghamshire, Dorset, BCP,
//   the Northamptonshires, Cumberland, Westmorland and Furness, North Yorkshire, Somerset, East and West Suffolk) are
//   given, for earlier years, the sum of their predecessors, only when every predecessor gave a figure, and the
//   predecessors are named. Codes that only changed (Gateshead, Northumberland, four Hertfordshire districts) are the
//   same council.
// Wales: StatsWales "Houses in multiple occupation (HMOs) by local authority area" (estimated and known HMOs) and
//   "Dwellings licenced by local authority area and licence type" (mandatory and additional HMO licences), 2006-07 to
//   2024-25 (no 2019-20); homes: StatsWales dwelling stock estimates, 31 March.
// Scotland: Scottish Government, Housing statistics: Houses in multiple occupation, licences in force at 31 March,
//   2001 to 2026 (every HMO of three or more unrelated people needs a licence there); homes: Housing statistics, stock
//   by tenure and local authority, March 2013 to 2025.
// Northern Ireland: no figures by council are published as data (ENTRY 362 step 4: the paper with them is on a site
//   whose robots.txt disallows Claude's agents), so there are no rows.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

export type HmoRow = {
  ons_code: string; area_name: string; nation: 'England' | 'Wales' | 'Scotland'; area_level: 'nation' | 'council';
  region: string | null; year: string;
  estimated: number | null; known: number | null; licensable: number | null; licensed: number | null;
  mandatory_licences: number | null; additional_licences: number | null;
  homes: number | null; homes_year: string | null;
  symbols: Record<string, string>; predecessors: string[]; notes: string[]; source_url: string;
};

export const SOURCES = {
  lahs: 'https://www.gov.uk/government/collections/local-authority-housing-data',
  lt100: 'https://www.gov.uk/government/statistical-data-sets/live-tables-on-dwelling-stock-including-vacants',
  walesHmos: 'https://stats.gov.wales/en-GB/5d159f50-e1bb-43b3-9275-30f9c031ba41',
  walesLicences: 'https://stats.gov.wales/en-GB/5a05577c-3ead-4c8a-8049-671c39757da9',
  walesStock: 'https://stats.gov.wales/en-GB/6476cc20-ddeb-46a5-be64-10a23c8a159f',
  scotland: 'https://www.gov.scot/publications/housing-statistics-houses-in-multiple-occupation/',
  scotlandStock: 'https://www.gov.scot/publications/housing-statistics-stock-by-tenure/',
};

// Merged councils: today's code -> the codes it replaced (LAHS rows for earlier years).
export const MERGED: Record<string, string[]> = {
  E06000058: ['E06000028', 'E06000029', 'E07000048'], // Bournemouth, Christchurch and Poole (2019)
  E06000059: ['E07000049', 'E07000050', 'E07000051', 'E07000052', 'E07000053'], // Dorset (2019)
  E06000060: ['E07000004', 'E07000005', 'E07000006', 'E07000007'], // Buckinghamshire (2020)
  E06000061: ['E07000150', 'E07000152', 'E07000153', 'E07000156'], // North Northamptonshire (2021)
  E06000062: ['E07000151', 'E07000154', 'E07000155'], // West Northamptonshire (2021)
  E06000063: ['E07000026', 'E07000028', 'E07000029'], // Cumberland (2023)
  E06000064: ['E07000027', 'E07000030', 'E07000031'], // Westmorland and Furness (2023)
  E06000065: ['E07000163', 'E07000164', 'E07000165', 'E07000166', 'E07000167', 'E07000168', 'E07000169'], // North Yorkshire (2023)
  E06000066: ['E07000187', 'E07000188', 'E07000189', 'E07000246', 'E07000190', 'E07000191'], // Somerset (2023); Somerset West and Taunton (2019) itself from Taunton Deane and West Somerset
  E07000244: ['E07000205', 'E07000206'], // East Suffolk (2019)
  E07000245: ['E07000201', 'E07000204'], // West Suffolk (2019)
};
// Somerset West and Taunton (E07000246, 2019 to 2023) replaced these two; within Somerset's sum one or the other is used.
const SWT_PARTS = ['E07000190', 'E07000191'];
// Codes that changed with no change of area.
export const RECODED: Record<string, string> = { E08000020: 'E08000037', E06000048: 'E06000057', E07000097: 'E07000242', E07000101: 'E07000243', E07000100: 'E07000240', E07000104: 'E07000241' };

const WALES: Record<string, string> = {
  'Isle of Anglesey': 'W06000001', Gwynedd: 'W06000002', Conwy: 'W06000003', Denbighshire: 'W06000004', Flintshire: 'W06000005', Wrexham: 'W06000006',
  Ceredigion: 'W06000008', Pembrokeshire: 'W06000009', Carmarthenshire: 'W06000010', Swansea: 'W06000011', 'Neath Port Talbot': 'W06000012', Bridgend: 'W06000013',
  'Vale of Glamorgan': 'W06000014', Cardiff: 'W06000015', 'Rhondda Cynon Taf': 'W06000016', Caerphilly: 'W06000018', 'Blaenau Gwent': 'W06000019', Torfaen: 'W06000020',
  Monmouthshire: 'W06000021', Newport: 'W06000022', Powys: 'W06000023', 'Merthyr Tydfil': 'W06000024',
};
const SCOTLAND: Record<string, string> = {
  'Aberdeen City': 'S12000033', Aberdeenshire: 'S12000034', Angus: 'S12000041', 'Argyll & Bute': 'S12000035', Clackmannanshire: 'S12000005',
  'Dumfries & Galloway': 'S12000006', 'Dundee City': 'S12000042', 'East Ayrshire': 'S12000008', 'East Dunbartonshire': 'S12000045', 'East Lothian': 'S12000010',
  'East Renfrewshire': 'S12000011', 'Edinburgh, City of': 'S12000036', Falkirk: 'S12000014', Fife: 'S12000047', 'Glasgow City': 'S12000049', Highland: 'S12000017',
  Inverclyde: 'S12000018', Midlothian: 'S12000019', Moray: 'S12000020', 'Na h-Eileanan Siar': 'S12000013', 'North Ayrshire': 'S12000021',
  'North Lanarkshire': 'S12000050', Orkney: 'S12000023', 'Orkney Islands': 'S12000023', 'Perth & Kinross': 'S12000048', Renfrewshire: 'S12000038',
  'Scottish Borders, The': 'S12000026', 'Scottish Borders': 'S12000026', Shetland: 'S12000027', 'Shetland Islands': 'S12000027', 'South Ayrshire': 'S12000028',
  'South Lanarkshire': 'S12000029', Stirling: 'S12000030', 'West Dunbartonshire': 'S12000039', 'West Lothian': 'S12000040',
};
// The Scottish Government's own notes on estimated figures (its notes 5 and 10), by code and year (31 March).
const SCOTLAND_ESTIMATED: Record<string, string[]> = {
  S12000036: ['2020-03-31', '2021-03-31'], S12000018: ['2020-03-31', '2021-03-31'], S12000023: ['2020-03-31', '2021-03-31'], S12000026: ['2020-03-31'],
  S12000049: ['2022-03-31', '2023-03-31', '2024-03-31'],
};

// A council's estimate that doubles or halves from one year to the next (the larger at least 500) carries a note: no
// reason was published (T1's flags, ENTRY 358; Cowork's change (b), ENTRY 362).
export const SHARP_MIN = 500;
// MHCLG's only published HMO note, LAHS 2024-25 technical notes: Brent changed its method.
export const PUBLISHED_NOTES: Record<string, Record<string, string>> = { E09000005: { '2025-03-31': 'brent_method_2025' } };

const num = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null;
  const s = String(v).replace(/,/g, '').trim();
  return /^-?\d+(\.\d+)?$/.test(s) ? Math.round(Number(s)) : null;
};
const sym = (v: unknown): string | null => {
  const s = v == null ? '' : String(v).trim();
  return s && num(s) == null ? s : null;
};
const yearEnd = (fy: string) => `${Number(fy.slice(0, 4)) + 1}-03-31`; // '2024-25' or '2024-to-2025' -> '2025-03-31'

function sheetRows(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];
}

type Lahs = { code: string; name: string; region: string | null; f8a: unknown; f9a: unknown; f10a: unknown };
export function readLahs(file: string): Lahs[] {
  const wb = XLSX.read(readFileSync(file), { type: 'buffer' });
  const name = wb.SheetNames.find((n) => /^F(\b|_| -|$)/.test(n));
  if (!name) throw new Error(`${file}: no section F sheet`);
  const rows = sheetRows(wb.Sheets[name]);
  const hr = rows.findIndex((r, i) => i < 20 && r.some((c) => String(c ?? '').trim() === 'f8a'));
  if (hr < 0) throw new Error(`${file}: no f8a header`);
  const h = rows[hr].map((c) => String(c ?? '').trim());
  const [c8, c9, c10] = ['f8a', 'f9a', 'f10a'].map((k) => h.indexOf(k));
  const body = rows.slice(hr + 1);
  let cc = -1, best = 0;
  for (let c = 0; c < 8; c++) { const n = body.filter((r) => /^E0[6-9]\d{6}$/.test(String(r[c] ?? '').trim())).length; if (n > best) { best = n; cc = c; } }
  if (cc < 0) throw new Error(`${file}: no code column`);
  // The name column: the first text column after the code that is not a region; the region column is labelled where given.
  const labels = rows.slice(Math.max(0, hr - 2), hr + 1).map((r) => r.map((c) => String(c ?? '').trim().toLowerCase()));
  const rc = (() => { for (const l of labels) { const i = l.indexOf('region'); if (i >= 0) return i; } return -1; })();
  const nc = [cc + 1, cc + 2, cc - 1].find((c) => c >= 0 && c !== rc && body.some((r) => /Leeds|Barnsley|Hartlepool/.test(String(r[c] ?? '')))) ?? -1;
  const out: Lahs[] = [];
  // The region is named on its own heading row, above its councils: carried down to each council.
  let region: string | null = null;
  for (const r of body) {
    const code = String(r[cc] ?? '').trim();
    const rv = rc >= 0 ? String(r[rc] ?? '').trim() : '';
    if (rv && rv !== 'England') region = rv;
    if (!/^E0[6-9]\d{6}$/.test(code)) continue;
    out.push({ code, name: String(r[nc] ?? '').replace(/_/g, ' ').replace(/\s+UA$/, '').trim(), region, f8a: r[c8], f9a: r[c9], f10a: r[c10] });
  }
  return out;
}

// Live Table 100: total dwellings by code, per 31 March year.
export function readLt100(file: string): Map<string, Map<string, number>> {
  const wb = XLSX.read(readFileSync(file), { type: 'buffer' });
  const out = new Map<string, Map<string, number>>();
  for (const sn of wb.SheetNames) {
    if (!/^\d{4}$/.test(sn)) continue;
    const rows = sheetRows(wb.Sheets[sn]);
    const hr = rows.findIndex((r, i) => i < 15 && r.some((c) => String(c ?? '').trim() === 'Total'));
    if (hr < 0) continue;
    const tc = rows[hr].findIndex((c) => String(c ?? '').trim() === 'Total');
    const m = new Map<string, number>();
    for (const r of rows.slice(hr + 1)) {
      const code = r.map((c) => String(c ?? '').trim()).find((c) => /^E0[6-9]\d{6}$/.test(c));
      const v = num(r[tc]);
      if (code && v != null) m.set(code, v);
    }
    if (m.size) out.set(`${sn}-03-31`, m);
  }
  return out;
}

function csvRows(file: string): Record<string, string>[] {
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  const wb = XLSX.read(text, { type: 'string', raw: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: '' }) as Record<string, string>[];
}

export function buildRows(dir: string): HmoRow[] {
  const rows: HmoRow[] = [];
  // ---- England
  const lt100 = readLt100(path.join(dir, 'LiveTable100.ods'));
  const lahsDir = path.join(dir, 'lahs');
  const byYear = new Map<string, Lahs[]>();
  for (const f of readdirSync(lahsDir).sort()) {
    const m = f.match(/^(\d{4})-to-(\d{4})__/);
    if (m) byYear.set(`${m[2]}-03-31`, readLahs(path.join(lahsDir, f)));
  }
  const latest = [...byYear.keys()].sort().at(-1)!;
  const current = byYear.get(latest)!;
  const regionOf = new Map(current.map((r) => [r.code, r.region]));
  for (const [year, list] of [...byYear.entries()].sort()) {
    const byCode = new Map(list.map((r) => [r.code, r]));
    const homes = lt100.get(year);
    const homesFor = (codes: string[]) => { if (!homes) return null; let t = 0; for (const c of codes) { const v = homes.get(c); if (v == null) return null; t += v; } return t; };
    for (const now of current) {
      const code = now.code;
      let parts: string[] = [];
      let src = byCode.get(code);
      if (!src) {
        const old = Object.entries(RECODED).find(([, to]) => to === code)?.[0];
        if (old && byCode.get(old)) src = byCode.get(old);
      }
      let est: number | null, lic: number | null, licd: number | null;
      const symbols: Record<string, string> = {};
      const predecessors: string[] = [];
      let homesCodes: string[] = [code];
      if (src) {
        est = num(src.f8a); lic = num(src.f9a); licd = num(src.f10a);
        for (const [k, v] of [['estimated', src.f8a], ['licensable', src.f9a], ['licensed', src.f10a]] as const) { const s = sym(v); if (s) symbols[k] = s; }
        // Homes under the code that year's table uses, which can differ from LAHS's: the row's code, today's, or the old one.
        const tries = [src.code, code, ...Object.entries(RECODED).filter(([, to]) => to === code).map(([from]) => from)];
        homesCodes = [tries.find((t) => homes?.has(t)) ?? code];
      } else if (MERGED[code]) {
        parts = MERGED[code].filter((c) => byCode.has(c));
        if (code === 'E06000066') parts = parts.filter((c) => !(SWT_PARTS.includes(c) && byCode.has('E07000246')));
        if (!parts.length) continue; // the council did not exist and no predecessor row this year
        const vals = parts.map((c) => byCode.get(c)!);
        const sum = (k: 'f8a' | 'f9a' | 'f10a') => (vals.every((v) => num(v[k]) != null) ? vals.reduce((t, v) => t + num(v[k])!, 0) : null);
        est = sum('f8a'); lic = sum('f9a'); licd = sum('f10a');
        for (const v of vals) predecessors.push(v.name);
        homesCodes = parts;
      } else continue;
      if (est == null && lic == null && licd == null && !Object.keys(symbols).length && !predecessors.length) continue;
      const h = homesFor(homesCodes);
      rows.push({
        ons_code: code, area_name: now.name, nation: 'England', area_level: 'council', region: regionOf.get(code) ?? null, year,
        estimated: est, known: null, licensable: lic, licensed: licd, mandatory_licences: null, additional_licences: null,
        homes: h, homes_year: h != null ? year : null, symbols, predecessors, notes: [], source_url: SOURCES.lahs,
      });
    }
    // England: the sum of the councils that gave a figure (MHCLG's own England total for 2024-25 is the same sum).
    const eng = rows.filter((r) => r.nation === 'England' && r.year === year && r.area_level === 'council');
    const total = (k: 'estimated' | 'licensable' | 'licensed') => eng.reduce((t, r) => t + (r[k] ?? 0), 0);
    rows.push({
      ons_code: 'E92000001', area_name: 'England', nation: 'England', area_level: 'nation', region: null, year,
      estimated: total('estimated'), known: null, licensable: total('licensable'), licensed: total('licensed'), mandatory_licences: null, additional_licences: null,
      homes: homes ? [...homes.values()].reduce((t, v) => t + v, 0) : null, homes_year: homes ? year : null, symbols: {}, predecessors: [], notes: [], source_url: SOURCES.lahs,
    });
  }
  // ---- Wales
  const wh = csvRows(path.join(dir, 'wales-hmos.csv'));
  const wl = csvRows(path.join(dir, 'wales-licences.csv'));
  const ws = csvRows(path.join(dir, 'wales-dwelling-stock.csv'));
  const wv = (list: Record<string, string>[], area: string, desc: string, fy: string) => num(list.find((r) => r.Area === area && r['Data description'] === desc && r.Year === fy)?.['Data values']);
  const stock = (area: string, year: string) => {
    const d = `31/03/${year.slice(0, 4)}`;
    return num(ws.find((r) => r.Area === area && r.Period === d && (r.Tenure || '').trim() === 'All tenures' && /number/i.test(r['Data description']))?.['Data values']);
  };
  for (const fy of [...new Set(wh.map((r) => r.Year))].sort()) {
    const year = yearEnd(fy);
    for (const area of ['Wales', ...Object.keys(WALES)]) {
      const h = stock(area, year);
      rows.push({
        ons_code: area === 'Wales' ? 'W92000004' : WALES[area], area_name: area, nation: 'Wales', area_level: area === 'Wales' ? 'nation' : 'council', region: null, year,
        estimated: wv(wh, area, 'Estimate of all HMOs in local authority area', fy), known: wv(wh, area, 'Known HMOs in local authority area', fy),
        licensable: null, licensed: wv(wl, area, 'Total HMO licences', fy),
        mandatory_licences: wv(wl, area, 'Mandatory HMO licences', fy), additional_licences: wv(wl, area, 'Additional HMO licences', fy),
        homes: h, homes_year: h != null ? year : null, symbols: {}, predecessors: [], notes: [], source_url: SOURCES.walesHmos,
      });
    }
  }
  // ---- Scotland
  const swb = XLSX.read(readFileSync(path.join(dir, 'scotland-hmo.xlsx')), { type: 'buffer' });
  const lic = sheetRows(swb.Sheets.Licenses);
  const lhr = lic.findIndex((r) => String(r[0] ?? '').trim() === 'Local Authority');
  const years = lic[lhr].slice(1).map((c) => String(c ?? '').trim());
  const stwb = XLSX.read(readFileSync(path.join(dir, 'scotland-stock-by-tenure.xlsx')), { type: 'buffer' });
  const stockBy = new Map<string, Map<string, number>>(); // year -> code -> homes
  for (const sn of stwb.SheetNames) {
    const m = sn.match(/^Tbl Stock by tenure by LA (\d{4})$/);
    if (!m) continue;
    const mm = new Map<string, number>();
    for (const r of sheetRows(stwb.Sheets[sn])) {
      const n = String(r[0] ?? '').trim(); const v = num(r[1]);
      if (v == null) continue;
      if (n === 'Scotland') mm.set('S92000003', v); else if (SCOTLAND[n]) mm.set(SCOTLAND[n], v);
    }
    stockBy.set(`${m[1]}-03-31`, mm);
  }
  const stockYears = [...stockBy.keys()].sort();
  for (const r of lic.slice(lhr + 1)) {
    const n = String(r[0] ?? '').trim();
    const code = n === 'Scotland' ? 'S92000003' : SCOTLAND[n];
    if (!code) continue;
    years.forEach((y, i) => {
      if (!/^\d{4}$/.test(y)) return;
      const year = `${y}-03-31`;
      const v = num(r[i + 1]);
      // Homes: the same 31 March where published; otherwise the latest year published, labelled with its own year.
      const hy = stockBy.has(year) ? year : year > stockYears.at(-1)! ? stockYears.at(-1)! : null;
      const h = hy ? stockBy.get(hy)!.get(code) ?? null : null;
      const s = sym(r[i + 1]);
      rows.push({
        ons_code: code, area_name: n, nation: 'Scotland', area_level: code === 'S92000003' ? 'nation' : 'council', region: null, year,
        estimated: null, known: null, licensable: null, licensed: v, mandatory_licences: null, additional_licences: null,
        homes: h, homes_year: h != null ? hy : null, symbols: s ? { licensed: s } : {}, predecessors: [],
        notes: SCOTLAND_ESTIMATED[code]?.includes(year) ? ['estimated_by_government'] : [], source_url: SOURCES.scotland,
      });
    });
  }
  // ---- Notes: a sharp change in a council's estimate, and the published notes.
  const series = new Map<string, HmoRow[]>();
  for (const r of rows) if (r.area_level === 'council') series.set(r.ons_code, [...(series.get(r.ons_code) ?? []), r]);
  for (const list of series.values()) {
    list.sort((a, b) => a.year.localeCompare(b.year));
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1].estimated, b = list[i].estimated;
      if (a && b && Math.max(a, b) >= SHARP_MIN && (b / a >= 2 || b / a <= 0.5)) list[i].notes.push('sharp_change');
    }
  }
  for (const r of rows) { const n = PUBLISHED_NOTES[r.ons_code]?.[r.year]; if (n) r.notes.push(n); }
  return rows;
}

export function checkRows(rows: HmoRow[], ourCodes: Set<string>): { ok: boolean; problems: string[]; summary: Record<string, unknown> } {
  const problems: string[] = [];
  const keys = new Set<string>();
  for (const r of rows) {
    const k = `${r.ons_code}|${r.year}`;
    if (keys.has(k)) problems.push(`duplicate ${k}`);
    keys.add(k);
    if (r.area_level === 'council' && !ourCodes.has(r.ons_code)) problems.push(`${r.ons_code} ${r.area_name} not in our councils`);
    for (const f of ['estimated', 'known', 'licensable', 'licensed', 'mandatory_licences', 'additional_licences', 'homes'] as const) { const v = r[f]; if (v != null && v < 0) problems.push(`${k} ${f} = ${v}`); }
  }
  const at = (code: string, year: string) => rows.find((r) => r.ons_code === code && r.year === year);
  const e = at('E92000001', '2025-03-31');
  const want = [[e?.estimated, 458855], [e?.licensable, 132246], [e?.licensed, 95217], [at('E07000171', '2025-03-31')?.estimated, 169], [at('E08000035', '2025-03-31')?.licensed, 2938], [at('W92000004', '2025-03-31')?.estimated, 18490], [at('S92000003', '2026-03-31')?.licensed, 15027], [at('S12000036', '2026-03-31')?.licensed, 6806]];
  want.forEach(([got, exp], i) => { if (got !== exp) problems.push(`check ${i}: expected ${exp}, got ${got}`); });
  const wo = at('E07000181', '2025-03-31');
  if (!wo || wo.estimated != null) problems.push('West Oxfordshire 2024-25 should have no estimate');
  const eng25 = rows.filter((r) => r.nation === 'England' && r.area_level === 'council' && r.year === '2025-03-31').length;
  if (eng25 !== 296) problems.push(`England councils 2024-25: ${eng25}`);
  return {
    ok: problems.length === 0, problems,
    summary: {
      rows: rows.length, england2025: e, englandCouncils2025: eng25,
      wales: rows.filter((r) => r.nation === 'Wales').length, scotland: rows.filter((r) => r.nation === 'Scotland').length,
      sharp: rows.filter((r) => r.notes.includes('sharp_change')).length, merged: rows.filter((r) => r.predecessors.length).length,
    },
  };
}
