// Shared logic for MHCLG statutory homelessness detailed local authority
// tables: used by scripts/import-council-homelessness.ts (full history from
// April 2019) and app/api/sync-homelessness/route.ts (weekly: new quarters
// and revised files). Table: scripts/migrations/2026-10-11i-council-homelessness.sql.
//
// Column positions were verified against every quarterly file (2026-10-11):
//   * Older files (Apr-Jun 2019 to Jul-Sep 2025) have stacked headings, but
//     the data sits in fixed positions; only A1's "households in area"
//     column moves, so it's located by value and cross-checked against the
//     published rate next to it.
//   * Newer files (Oct-Dec 2025 onwards) have one-row headings and a
//     different, compact layout; those headings are checked by text.
// Every file is validated on its England row before any row is returned.

import * as XLSX from 'xlsx';
import type { SupabaseClient } from '@supabase/supabase-js';

export const HOMELESSNESS_CONTENT_API = 'https://www.gov.uk/api/content/government/statistical-data-sets/live-tables-on-homelessness';
const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };

// Barnsley and Sheffield moved to new codes (April 2025); the councils table
// still uses the old ones.
const CODE_ALIASES: Record<string, string> = { E08000038: 'E08000016', E08000039: 'E08000019' };

const QUARTERS: Record<string, string> = {
  'January to March': '01', 'April to June': '04', 'July to September': '07', 'October to December': '10',
};

export type HomelessnessFile = { title: string; url: string; periodStart: string; periodLabel: string; status: 'provisional' | 'revised' | 'published' };

export type HomelessnessRow = {
  council_gss_code: string;
  period_start: string;
  period_label: string;
  assessments_total: number | null;
  owed_duty_total: number | null;
  owed_prevention: number | null;
  owed_prevention_s21: number | null;
  owed_relief: number | null;
  households_thousands: number | null;
  ta_total: number | null;
  ta_with_children: number | null;
  ta_children: number | null;
  ta_bb: number | null;
  ta_bb_children: number | null;
  ta_nightly_paid: number | null;
  ta_nightly_paid_children: number | null;
  ta_hostels: number | null;
  ta_hostels_children: number | null;
  ta_private_sector: number | null;
  ta_private_sector_children: number | null;
  ta_la_ha_stock: number | null;
  ta_la_ha_stock_children: number | null;
  ta_other: number | null;
  ta_other_children: number | null;
  ta_in_another_la: number | null;
  ta_no_accommodation_secured: number | null;
  release_status: string;
  source_title: string;
  source_url: string;
};

type A1Fields = 'assessments_total' | 'owed_duty_total' | 'owed_prevention' | 'owed_prevention_s21' | 'owed_relief';
type TAFields = 'ta_total' | 'ta_with_children' | 'ta_children' | 'ta_bb' | 'ta_bb_children' | 'ta_nightly_paid' | 'ta_nightly_paid_children'
  | 'ta_hostels' | 'ta_hostels_children' | 'ta_private_sector' | 'ta_private_sector_children' | 'ta_la_ha_stock' | 'ta_la_ha_stock_children'
  | 'ta_other' | 'ta_other_children' | 'ta_in_another_la' | 'ta_no_accommodation_secured';

const A1_OLD: Record<A1Fields, number> = { assessments_total: 4, owed_duty_total: 6, owed_prevention: 7, owed_prevention_s21: 8, owed_relief: 9 };
const A1_NEW: Record<A1Fields, number> = { assessments_total: 2, owed_duty_total: 3, owed_prevention: 4, owed_prevention_s21: 5, owed_relief: 6 };
const A1_NEW_HH = 10;
const A1_NEW_HEADINGS: [number, string][] = [
  [2, 'initial assessments total'], [3, 'assessed as owed a duty owed a prevention or relief duty total'],
  [4, 'assessed as owed a duty threatened with homelessness within 56 days'], [5, 'assessed as owed a duty threatened with homelessness due to service of valid section 21'],
  [6, 'assessed as owed a duty homeless, relief duty owed'], [10, 'households in area (thousands)'],
];

const TA_OLD: Record<TAFields, number> & { hh: number } = {
  ta_total: 4, hh: 5, ta_with_children: 7, ta_children: 8, ta_bb: 10, ta_bb_children: 11, ta_nightly_paid: 16, ta_nightly_paid_children: 17,
  ta_hostels: 19, ta_hostels_children: 20, ta_private_sector: 22, ta_private_sector_children: 23, ta_la_ha_stock: 25, ta_la_ha_stock_children: 26,
  ta_other: 28, ta_other_children: 29, ta_in_another_la: 31, ta_no_accommodation_secured: 33,
};
const TA_NEW: Record<TAFields, number> & { hh: number } = {
  ta_total: 2, hh: 3, ta_with_children: 5, ta_children: 6, ta_bb: 7, ta_bb_children: 8, ta_nightly_paid: 12, ta_nightly_paid_children: 13,
  ta_hostels: 14, ta_hostels_children: 15, ta_private_sector: 16, ta_private_sector_children: 17, ta_la_ha_stock: 18, ta_la_ha_stock_children: 19,
  ta_other: 20, ta_other_children: 21, ta_in_another_la: 22, ta_no_accommodation_secured: 23,
};
const TA_NEW_HEADINGS: [number, string][] = [
  [2, 'households in ta total'], [3, 'households in area (thousands)'], [5, 'households in ta with children total'], [6, 'children in ta total'],
  [7, 'households in b&bs including shared annexes total'], [8, 'households in b&bs including shared annexes with children'],
  [12, 'households in nightly paid, privately managed accommodation, self-contained total'], [13, 'households in nightly paid, privately managed accommodation, self-contained with children'],
  [14, 'households in hostels, including reception centres, emergency units and refuges total'], [15, 'households in hostels, including reception centres, emergency units and refuges with children'],
  [16, 'households in private sector accommodation total'], [17, 'households in private sector accommodation with children'],
  [18, 'households in la or ha stock total'], [19, 'households in la or ha stock with children'],
  [20, 'households in any other type of ta'], [21, 'households in any other type of ta'],
  [22, 'households owed a ta duty in another la total'], [23, 'households in duty owed, no accommodation secured total'],
];

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const norm = (v: unknown) => clean(v).toLowerCase().replace(/\[note \d+\]/g, '').replace(/\s+/g, ' ').trim();

// '..', '-', '[x]', '[c]', '[z]', '' -> null. Numbers stored as text are accepted.
function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = clean(v).replace(/,/g, '');
  if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}
const int = (v: unknown) => { const n = num(v); return n == null ? null : Math.round(n); };

export type SheetRows = (string | number)[][];

// Find a sheet by name, tolerating MHCLG's occasional trailing underscore ("TA1_").
function findSheet(sheets: Record<string, SheetRows>, name: string): SheetRows | null {
  for (const [k, rows] of Object.entries(sheets)) if (k.trim().replace(/_+$/, '').toUpperCase() === name) return rows;
  return null;
}

export function readWorkbookSheets(buf: Buffer): Record<string, SheetRows> {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const out: Record<string, SheetRows> = {};
  for (const name of wb.SheetNames) {
    const base = name.trim().replace(/_+$/, '').toUpperCase();
    if (base === 'A1' || base === 'TA1') out[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true }) as SheetRows;
  }
  return out;
}

export async function listQuarterlyFiles(): Promise<HomelessnessFile[]> {
  const res = await fetch(HOMELESSNESS_CONTENT_API, { headers: UA });
  if (!res.ok) throw new Error(`GOV.UK Content API HTTP ${res.status}`);
  const json = await res.json();
  const atts = ((json?.details?.attachments ?? []) as { title?: string; url?: string }[])
    .map((a) => ({ title: clean(a.title), url: String(a.url ?? '') }))
    .filter((a) => /^Detailed local authority level tables/i.test(a.title) && !/accessible/i.test(a.title) && /\.(ods|xlsx)$/i.test(a.url));
  const byPeriod = new Map<string, { title: string; url: string; periodLabel: string }>();
  for (const a of atts) {
    const m = a.title.match(/(January to March|April to June|July to September|October to December) (\d{4})/);
    if (!m) continue;
    const periodStart = `${m[2]}-${QUARTERS[m[1]]}-01`;
    const prev = byPeriod.get(periodStart);
    // Prefer a revised file over the original for the same quarter.
    if (!prev || (/revised/i.test(a.title) && !/revised/i.test(prev.title))) byPeriod.set(periodStart, { ...a, periodLabel: `${m[1]} ${m[2]}` });
  }
  const periods = [...byPeriod.keys()].sort();
  const newest = periods[periods.length - 1];
  return periods.map((p) => {
    const f = byPeriod.get(p)!;
    const status = /revised/i.test(f.title) ? 'revised' : p === newest ? 'provisional' : 'published';
    return { title: f.title, url: f.url, periodStart: p, periodLabel: f.periodLabel, status };
  });
}

export async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const near = (a: number, b: number, pct: number, abs = 0) => Math.abs(a - b) <= Math.max(abs, Math.abs(b) * pct);

export type ParseResult = {
  rows: HomelessnessRow[];
  unmatchedCodes: string[];   // district codes not in the councils table (after aliases)
  hasTA: boolean;
  england: Record<string, number | null>;
  checks: string[];           // human-readable validation results
};

// Parse one quarterly file's A1 and TA1 sheets. Throws if a check fails.
export function parseQuarterlyFile(file: HomelessnessFile, sheets: Record<string, SheetRows>, councilCodes: Set<string>): ParseResult {
  const checks: string[] = [];
  const a1 = findSheet(sheets, 'A1');
  if (!a1) throw new Error('A1 sheet not found');
  const ta1 = findSheet(sheets, 'TA1');

  const englandOf = (rows: SheetRows) => rows.find((r) => clean(r[0]) === 'E92000001');

  // ---- A1
  const engA1 = englandOf(a1);
  if (!engA1) throw new Error('A1: England row not found');
  const newA1 = num(engA1[2]) != null;
  const a1Map = newA1 ? A1_NEW : A1_OLD;
  let hhCol: number;
  if (newA1) {
    const head = a1.find((r) => norm(r[1]) === 'area name');
    if (!head) throw new Error('A1 (new layout): heading row not found');
    for (const [c, want] of A1_NEW_HEADINGS) if (!norm(head[c]).startsWith(want)) throw new Error(`A1 (new layout): column ${c} heading "${clean(head[c])}" does not start "${want}"`);
    hhCol = A1_NEW_HH;
  } else {
    hhCol = -1;
    for (let c = 10; c <= 20; c++) { const v = num(engA1[c]); if (v != null && v > 10000) { hhCol = c; break; } }
    if (hhCol < 0) throw new Error('A1 (old layout): households-in-area column not found');
  }
  const eA1 = Object.fromEntries(Object.entries(a1Map).map(([k, c]) => [k, num(engA1[c])])) as Record<A1Fields, number | null>;
  const eHH = num(engA1[hhCol]);
  if (eA1.owed_duty_total == null || eA1.owed_prevention == null || eA1.owed_relief == null || eHH == null) throw new Error('A1: England figures missing');
  if (!near(eA1.owed_prevention + eA1.owed_relief, eA1.owed_duty_total, 0.01, 30)) {
    throw new Error(`A1: England prevention ${eA1.owed_prevention} + relief ${eA1.owed_relief} != owed total ${eA1.owed_duty_total}`);
  }
  checks.push(`A1 ${newA1 ? 'new' : 'old'} layout; England owed ${eA1.owed_duty_total} = prevention ${eA1.owed_prevention} + relief ${eA1.owed_relief} OK`);
  // The published "threatened per thousand" rate sits right after the households column.
  const eRate = num(engA1[hhCol + 1]);
  if (eRate == null || !near(eA1.owed_prevention / eHH, eRate, 0.02)) {
    throw new Error(`A1: households column ${hhCol} (${eHH}) doesn't reproduce the published rate ${eRate}`);
  }
  checks.push(`A1 households column ${hhCol} (${eHH}k) reproduces published rate ${eRate?.toFixed(3)} OK`);

  // ---- TA1
  let taMap: (Record<TAFields, number> & { hh: number }) | null = null;
  let eTA: Record<string, number | null> = {};
  if (ta1) {
    const engTA = englandOf(ta1);
    if (!engTA) throw new Error('TA1: England row not found');
    const newTA = num(engTA[2]) != null;
    taMap = newTA ? TA_NEW : TA_OLD;
    if (newTA) {
      const head = ta1.find((r) => norm(r[1]) === 'area name');
      if (!head) throw new Error('TA1 (new layout): heading row not found');
      for (const [c, want] of TA_NEW_HEADINGS) if (!norm(head[c]).startsWith(want)) throw new Error(`TA1 (new layout): column ${c} heading "${clean(head[c])}" does not start "${want}"`);
    }
    const g = (k: keyof typeof TA_OLD) => num(engTA[taMap![k]]);
    eTA = Object.fromEntries((Object.keys(TA_OLD) as (keyof typeof TA_OLD)[]).map((k) => [k, g(k)]));
    const types = ['ta_bb', 'ta_nightly_paid', 'ta_hostels', 'ta_private_sector', 'ta_la_ha_stock', 'ta_other'] as const;
    const kids = ['ta_bb_children', 'ta_nightly_paid_children', 'ta_hostels_children', 'ta_private_sector_children', 'ta_la_ha_stock_children', 'ta_other_children'] as const;
    if (types.some((k) => eTA[k] == null) || eTA.ta_total == null) throw new Error('TA1: England figures missing');
    const sum = types.reduce((s, k) => s + (eTA[k] as number), 0);
    if (!near(sum, eTA.ta_total as number, 0.01, 30)) throw new Error(`TA1: England accommodation types sum ${sum} != TA total ${eTA.ta_total}`);
    checks.push(`TA1 ${newTA ? 'new' : 'old'} layout; England TA ${eTA.ta_total} = sum of types ${sum} OK`);
    if (kids.every((k) => eTA[k] != null) && eTA.ta_with_children != null) {
      const ks = kids.reduce((s, k) => s + (eTA[k] as number), 0);
      if (!near(ks, eTA.ta_with_children, 0.01, 30)) throw new Error(`TA1: England with-children types sum ${ks} != households with children ${eTA.ta_with_children}`);
      checks.push(`TA1 England with children ${eTA.ta_with_children} = sum of types ${ks} OK`);
    }
    if (eTA.hh == null || !near(eTA.hh, eHH, 0.001)) checks.push(`note: TA1 households ${eTA.hh}k vs A1 ${eHH}k`);
  } else {
    checks.push('TA1 sheet not in this file');
  }

  // ---- council rows
  const resolve = (code: string) => (councilCodes.has(code) ? code : CODE_ALIASES[code] && councilCodes.has(CODE_ALIASES[code]) ? CODE_ALIASES[code] : null);
  const out = new Map<string, HomelessnessRow>();
  const unmatched = new Set<string>();
  const blank = (code: string): HomelessnessRow => ({
    council_gss_code: code, period_start: file.periodStart, period_label: file.periodLabel,
    assessments_total: null, owed_duty_total: null, owed_prevention: null, owed_prevention_s21: null, owed_relief: null, households_thousands: null,
    ta_total: null, ta_with_children: null, ta_children: null, ta_bb: null, ta_bb_children: null, ta_nightly_paid: null, ta_nightly_paid_children: null,
    ta_hostels: null, ta_hostels_children: null, ta_private_sector: null, ta_private_sector_children: null, ta_la_ha_stock: null, ta_la_ha_stock_children: null,
    ta_other: null, ta_other_children: null, ta_in_another_la: null, ta_no_accommodation_secured: null,
    release_status: file.status, source_title: file.title, source_url: file.url,
  });
  const districtRows = (rows: SheetRows) => rows.filter((r) => /^E0[6-9]\d{6}$/.test(clean(r[0])));

  for (const r of districtRows(a1)) {
    const raw = clean(r[0]);
    const code = resolve(raw);
    if (!code) { unmatched.add(raw); continue; }
    const row = out.get(code) ?? blank(code);
    for (const [k, c] of Object.entries(a1Map)) (row as Record<string, unknown>)[k] = int(r[c]);
    row.households_thousands = num(r[hhCol]);
    out.set(code, row);
  }
  if (ta1 && taMap) {
    for (const r of districtRows(ta1)) {
      const raw = clean(r[0]);
      const code = resolve(raw);
      if (!code) { unmatched.add(raw); continue; }
      const row = out.get(code) ?? blank(code);
      for (const k of Object.keys(taMap) as (keyof typeof taMap)[]) {
        if (k === 'hh') { if (row.households_thousands == null) row.households_thousands = num(r[taMap.hh]); continue; }
        (row as Record<string, unknown>)[k] = int(r[taMap[k]]);
      }
      out.set(code, row);
    }
  }
  return {
    rows: [...out.values()],
    unmatchedCodes: [...unmatched].sort(),
    hasTA: !!ta1,
    england: { ...eA1, households_thousands: eHH, ta_total: eTA.ta_total ?? null, ta_with_children: eTA.ta_with_children ?? null, ta_children: eTA.ta_children ?? null },
    checks,
  };
}

export async function writeHomelessnessRows(db: SupabaseClient, rows: HomelessnessRow[]): Promise<number> {
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from('council_homelessness').upsert(rows.slice(i, i + 1000).map((r) => ({ ...r, synced_at: now })), { onConflict: 'council_gss_code,period_start' });
    if (error) throw new Error(`council_homelessness upsert at ${i}: ${error.message}`);
  }
  return rows.length;
}

// Source URL stored for each quarter (to spot new quarters and revised files).
export async function storedSources(db: SupabaseClient): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await db.from('council_homelessness').select('period_start, source_url').order('period_start').order('council_gss_code').range(from, from + 999);
    if (error) throw new Error(`council_homelessness read: ${error.message}`);
    for (const r of data ?? []) out.set(r.period_start as string, r.source_url as string);
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function loadCouncilCodes(db: SupabaseClient): Promise<{ codes: Set<string>; names: Map<string, string> }> {
  const { data, error } = await db.from('councils').select('gss_code, name');
  if (error) throw new Error(`councils read: ${error.message}`);
  const rows = (data ?? []).filter((c) => c.gss_code) as { gss_code: string; name: string }[];
  return { codes: new Set(rows.map((c) => c.gss_code)), names: new Map(rows.map((c) => [c.gss_code, c.name])) };
}
