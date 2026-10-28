// Blue Badges by council (England): reading DfT's Blue Badge scheme statistics tables (owner's approval, 28 Oct 2026).
// Used by scripts/import-blue-badges.ts (the 2020 to 2025 load) and /api/sync-blue-badges (each new release).
//
// Tables (Part A discovery, 28 Oct 2026):
//   DIS0108 (two sheets): badges held at 31 March and badges issued in the year to March, by council, split into
//     "without further assessment" (automatic), "subject to further assessment" (assessed by the council) and
//     organisations. Which sheet is held and which issued changed in 2025, so each sheet is read by its headings.
//   DIS0105 (DIS0109 in 2020): the population DfT uses (thousands) and DfT's own share of the population holding one.
//   DIS0301 (2021 only): lost and stolen badges by council. 2020's DIS0301 has prosecutions only; later releases
//     publish lost and stolen for England only.
// Rows kept: England (E92), regions (E12) and councils (E06, E08, E09, E10). Metropolitan county subtotals (E11) are
// skipped. Old county codes (Cumbria, North Yorkshire, Somerset, Northamptonshire) are kept under their own codes.
// A cell DfT shows as "[low]" is stored as empty and named in low_fields.

import * as XLSX from 'xlsx';
import { politeFetch, DOWNLOAD_TIMEOUT_MS, type SyncBudget } from '@/lib/sync-budget';

export const DATA_TABLES_PAGE = 'https://www.gov.uk/government/statistical-data-sets/blue-badge-scheme-statistics-data-tables-dis';
export const DATA_TABLES_API = 'https://www.gov.uk/api/content/government/statistical-data-sets/blue-badge-scheme-statistics-data-tables-dis';
const UA = { 'User-Agent': 'OpenGovt/1.0 (contact@opengovt.uk)', Accept: 'application/json' };


// Council codes DfT used before the 2020 to 2023 reorganisations, kept under their own codes and not shown on council
// pages (Buckinghamshire County Council in 2020; Northamptonshire to 2021; Cumbria, North Yorkshire, Somerset to 2023).
export const OLD_COUNTY_CODES: Record<string, string> = {
  E10000002: 'Buckinghamshire', E10000006: 'Cumbria', E10000023: 'North Yorkshire', E10000027: 'Somerset', E10000021: 'Northamptonshire',
};

const KEEP = /^E(92|12|06|08|09|10)\d{6}$/;

export type BlueBadgeRow = {
  ons_code: string;
  area_name: string;
  area_level: 'england' | 'region' | 'council';
  year: string; // 'YYYY-03-31': held at that date, issued in the year to it
  held: number | null;
  held_automatic: number | null;
  held_discretionary: number | null;
  held_organisations: number | null;
  issued: number | null;
  issued_automatic: number | null;
  issued_discretionary: number | null;
  issued_organisations: number | null;
  population_dft_thousands: number | null;
  held_pct_dft: number | null;
  held_per_1000_population: number | null;
  lost: number | null;
  stolen: number | null;
  low_fields: string[];
  rounded_to: number;
  source_table: string;
  source_url: string;
};

type Cell = number | 'low' | null;
const cell = (v: unknown): Cell => (typeof v === 'number' && Number.isFinite(v) ? v : /^\[low\]$/i.test(String(v).trim()) ? 'low' : null);
const clean = (s: unknown) => String(s ?? '').replace(/\s*\[note[^\]]*\]/gi, '').replace(/\d+$/, '').trim();

function sheetRows(wb: XLSX.WorkBook, name: string): unknown[][] {
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true }) as unknown[][];
}

type Parsed = { code: string; name: string; values: Record<string, Cell> };

// One table sheet: the heading row (the one with "ONS code"), then a row per area. Columns are found by their headings.
function readTable(rows: unknown[][], cols: Record<string, (h: string) => boolean>): Parsed[] {
  const hi = rows.findIndex((r) => r.some((c) => /^ons code$/i.test(String(c).trim())));
  if (hi < 0) throw new Error('no "ONS code" heading row');
  const head = rows[hi].map((h) => clean(h).toLowerCase());
  const codeCol = head.findIndex((h) => h === 'ons code');
  const at: Record<string, number> = {};
  for (const [k, test] of Object.entries(cols)) {
    const i = head.findIndex((h, j) => j > codeCol && test(h));
    if (i < 0) throw new Error(`no column for ${k} (headings: ${head.filter(Boolean).join(' | ').slice(0, 300)})`);
    at[k] = i;
  }
  const firstData = Math.min(...Object.values(at));
  const out: Parsed[] = [];
  for (const r of rows.slice(hi + 1)) {
    const code = String(r[codeCol] ?? '').trim();
    if (!KEEP.test(code)) continue;
    // The name is the last text before the figures (2020 indents names across several columns; later years put the
    // region first).
    const name = r.slice(codeCol + 1, firstData).map((c) => clean(c)).filter(Boolean).pop() ?? '';
    const values: Record<string, Cell> = {};
    for (const [k, i] of Object.entries(at)) values[k] = cell(r[i]);
    out.push({ code, name: name.replace(/^All\s+(?!local authorities)/i, '').replace(/^All local authorities$/i, 'England'), values });
  }
  return out;
}

const COUNTS = {
  automatic: (h: string) => /without further assessment/.test(h) && !/^of which/.test(h),
  discretionary: (h: string) => /subject to further assessment/.test(h),
  organisations: (h: string) => /organisations/.test(h) && !/^total/.test(h),
  total: (h: string) => /^total/.test(h),
};

// DIS0108: the held sheet and the issued sheet, told apart by the total column's heading.
export function readDis0108(wb: XLSX.WorkBook): { held: Parsed[]; issued: Parsed[] } {
  const out: { held?: Parsed[]; issued?: Parsed[] } = {};
  for (const n of wb.SheetNames.filter((n) => /^DIS0108/i.test(n))) {
    const rows = sheetRows(wb, n);
    const hi = rows.findIndex((r) => r.some((c) => /^ons code$/i.test(String(c).trim())));
    const total = (rows[hi] ?? []).map((h) => clean(h).toLowerCase()).find((h) => /^total/.test(h)) ?? '';
    const kind = /issued/.test(total) ? 'issued' : /held/.test(total) ? 'held' : null;
    if (!kind) throw new Error(`DIS0108 sheet ${n}: cannot tell held from issued ("${total}")`);
    if (out[kind]) throw new Error(`DIS0108: two ${kind} sheets`);
    out[kind] = readTable(rows, COUNTS);
  }
  if (!out.held || !out.issued) throw new Error('DIS0108: held or issued sheet missing');
  return { held: out.held, issued: out.issued };
}

// DIS0105 (DIS0109 in 2020): population used and DfT's percentage.
export function readPopulation(wb: XLSX.WorkBook): Parsed[] {
  const n = wb.SheetNames.find((s) => /^DIS010[59]$/i.test(s.trim()));
  if (!n) throw new Error('no DIS0105 or DIS0109 sheet');
  return readTable(sheetRows(wb, n), {
    pct: (h) => /badge holders as a percentage of the population/.test(h),
    population: (h) => /^total population/.test(h),
  });
}

// DIS0301 (2021): lost and stolen badges.
export function readLostStolen(wb: XLSX.WorkBook): Parsed[] {
  const n = wb.SheetNames.find((s) => /^DIS0301$/i.test(s.trim()));
  if (!n) throw new Error('no DIS0301 sheet');
  return readTable(sheetRows(wb, n), { lost: (h) => /^lost badges/.test(h), stolen: (h) => /^stolen badges/.test(h) });
}

// The year a DIS0108 workbook is for: its held sheet's title ends with the year ("..., 2025 [note 1]").
export function dis0108Year(wb: XLSX.WorkBook): number | null {
  for (const n of wb.SheetNames.filter((s) => /^DIS0108/i.test(s))) {
    const title = String(sheetRows(wb, n)[0]?.[0] ?? '');
    const m = /^Valid Blue Badges held\b.*\b(20\d\d)\s*(\[note[^\]]*\])?\s*$/i.exec(title.trim());
    if (m) return Number(m[1]);
  }
  return null;
}

export type BuildInput = {
  year: number;
  dis0108: XLSX.WorkBook;
  population: XLSX.WorkBook;
  lostStolen?: XLSX.WorkBook | null;
  sourceUrls: { dis0108: string; population: string; lostStolen?: string };
  populationTable: 'DIS0105' | 'DIS0109';
};

export function buildRows(input: BuildInput): BlueBadgeRow[] {
  const { held, issued } = readDis0108(input.dis0108);
  const pop = new Map(readPopulation(input.population).map((p) => [p.code, p]));
  const ls = input.lostStolen ? new Map(readLostStolen(input.lostStolen).map((p) => [p.code, p])) : new Map<string, Parsed>();
  const issuedBy = new Map(issued.map((p) => [p.code, p]));
  // Councils' figures rounded to the nearest 100 (2024 on) or exact: told from the figures themselves.
  const councilHeld = held.filter((h) => /^E(06|08|09|10)/.test(h.code)).map((h) => h.values.total).filter((v): v is number => typeof v === 'number');
  const roundedTo = councilHeld.length && councilHeld.every((v) => v % 100 === 0) ? 100 : 1;
  const year = `${input.year}-03-31`;
  const rows: BlueBadgeRow[] = [];
  for (const h of held) {
    // 2020's region rows are headings with no figures.
    const blank = (v: Record<string, Cell> | undefined) => !v || Object.values(v).every((x) => x == null);
    if (blank(h.values) && blank(issuedBy.get(h.code)?.values)) continue;
    const low: string[] = [];
    const num = (field: string, v: Cell | undefined) => { if (v === 'low') { low.push(field); return null; } return v ?? null; };
    const i = issuedBy.get(h.code)?.values ?? {};
    const p = pop.get(h.code)?.values ?? {};
    const l = ls.get(h.code)?.values ?? {};
    const row: BlueBadgeRow = {
      ons_code: h.code,
      area_name: h.name,
      area_level: h.code.startsWith('E92') ? 'england' : h.code.startsWith('E12') ? 'region' : 'council',
      year,
      held: num('held', h.values.total),
      held_automatic: num('held_automatic', h.values.automatic),
      held_discretionary: num('held_discretionary', h.values.discretionary),
      held_organisations: num('held_organisations', h.values.organisations),
      issued: num('issued', i.total),
      issued_automatic: num('issued_automatic', i.automatic),
      issued_discretionary: num('issued_discretionary', i.discretionary),
      issued_organisations: num('issued_organisations', i.organisations),
      population_dft_thousands: num('population_dft_thousands', p.population),
      held_pct_dft: num('held_pct_dft', p.pct),
      held_per_1000_population: null,
      lost: num('lost', l.lost),
      stolen: num('stolen', l.stolen),
      low_fields: low,
      rounded_to: roundedTo,
      source_table: ['DIS0108', input.populationTable, ...(input.lostStolen ? ['DIS0301'] : [])].join(', '),
      source_url: input.sourceUrls.dis0108,
    };
    if (row.held != null && row.population_dft_thousands) row.held_per_1000_population = Math.round((row.held / row.population_dft_thousands) * 100) / 100;
    if (row.held_pct_dft != null) row.held_pct_dft = Math.round(row.held_pct_dft * 100) / 100;
    if (row.population_dft_thousands != null) row.population_dft_thousands = Math.round(row.population_dft_thousands * 1000) / 1000;
    rows.push(row);
  }
  return rows;
}

export type CheckResult = { ok: boolean; problems: string[]; england: { held: number | null; issued: number | null }; councilSums: { held: number; issued: number }; councils: number; unmatched: string[] };

// Checks before anything is written: England's row is there; the councils add up to England within rounding (each
// council figure is rounded to rounded_to, and "[low]" cells are under 50); every council code is one of ours, or an
// old county code.
export function checkRows(rows: BlueBadgeRow[], ourCodes: Set<string>): CheckResult {
  const problems: string[] = [];
  const eng = rows.find((r) => r.area_level === 'england');
  const councils = rows.filter((r) => r.area_level === 'council');
  const sum = (k: 'held' | 'issued') => councils.reduce((s, r) => s + (r[k] ?? 0), 0);
  const tol = (k: 'held' | 'issued') => {
    const lows = councils.filter((r) => r.low_fields.includes(k)).length;
    const rounding = councils[0]?.rounded_to === 100 ? councils.length * 50 : Math.ceil((eng?.[k] ?? 0) * 0.001);
    return rounding + lows * 50;
  };
  if (!eng) problems.push('no England row');
  for (const k of ['held', 'issued'] as const) {
    if (eng?.[k] == null) { problems.push(`England ${k} missing`); continue; }
    const d = Math.abs(sum(k) - eng[k]!);
    if (d > tol(k)) problems.push(`councils' ${k} add up to ${sum(k)}, England ${eng[k]}: ${d} apart, more than rounding allows (${tol(k)})`);
  }
  const unmatched = councils.filter((r) => !ourCodes.has(r.ons_code) && !OLD_COUNTY_CODES[r.ons_code]).map((r) => `${r.ons_code} ${r.area_name}`);
  if (unmatched.length) problems.push(`council codes not in our councils table: ${unmatched.join('; ')}`);
  if (councils.length < 140) problems.push(`only ${councils.length} councils read`);
  return { ok: problems.length === 0, problems, england: { held: eng?.held ?? null, issued: eng?.issued ?? null }, councilSums: { held: sum('held'), issued: sum('issued') }, councils: councils.length, unmatched };
}

// The current release on the data tables page: the DIS0105 and DIS0108 files and when the page was last updated.
export async function findCurrentTables(budget?: SyncBudget): Promise<{ updatedAt: string; dis0105: string; dis0108: string }> {
  const res = await politeFetch(DATA_TABLES_API, { headers: UA }, { budget });
  if (!res.ok) throw new Error(`GOV.UK content API ${res.status} for the Blue Badge data tables page`);
  const j = (await res.json()) as { public_updated_at?: string; details?: { attachments?: { url?: string }[] } };
  const urls = (j.details?.attachments ?? []).map((a) => a.url ?? '');
  const find = (t: string) => urls.find((u) => new RegExp(`/${t}\\.ods$`, 'i').test(u));
  const dis0105 = find('dis0105'), dis0108 = find('dis0108');
  if (!dis0105 || !dis0108) throw new Error('DIS0105 or DIS0108 not found on the Blue Badge data tables page');
  return { updatedAt: j.public_updated_at ?? '', dis0105, dis0108 };
}

export async function fetchWorkbook(url: string, budget?: SyncBudget): Promise<XLSX.WorkBook> {
  const res = await politeFetch(url, { headers: { 'User-Agent': UA['User-Agent'] } }, { budget, timeoutMs: DOWNLOAD_TIMEOUT_MS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
}

// GOV.UK search: the newest "Blue Badge" statistics release, to spot a new one (the data tables page is then read).
export async function newestRelease(budget?: SyncBudget): Promise<{ title: string; link: string; published: string } | null> {
  // GOV.UK search answers 503 to this query when ordered by date or asked for more than 5 results (28 Oct 2026), so
  // the newest of 5 is picked here.
  const q = new URLSearchParams({ q: 'Blue Badge scheme statistics', filter_organisations: 'department-for-transport', count: '5', fields: 'title,link,public_timestamp' });
  const res = await politeFetch(`https://www.gov.uk/api/search.json?${q}`, { headers: UA }, { budget });
  if (!res.ok) throw new Error(`GOV.UK search ${res.status}`);
  const j = (await res.json()) as { results?: { title: string; link: string; public_timestamp: string }[] };
  const r = (j.results ?? []).filter((x) => /blue badge.*statistics:/i.test(x.title) && x.public_timestamp)
    .sort((a, b) => b.public_timestamp.localeCompare(a.public_timestamp))[0];
  return r ? { title: r.title, link: `https://www.gov.uk${r.link}`, published: r.public_timestamp } : null;
}
