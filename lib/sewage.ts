// Storm overflow (sewage spill) data for the /sewage page and the council
// pages' Sewage tab. Reads public.sewage_overflows and public.sewage_area_totals
// (scripts/migrations/2026-10-12h-sewage-overflows.sql), written by
// scripts/import-sewage.js:
//   * England: Environment Agency storm overflow annual return (one row per
//     overflow), placed in its constituency and council from its grid reference.
//   * Northern Ireland: NI Water Event Duration Monitor workbook (2023-2025),
//     constituency and council as named by NI Water.
//   * Scotland: Scottish Water overflow event data (reported to SEPA 2021-2025 and
//     non-reported 2022-2025), placed from its coordinates like England
//     (scripts/import-sewage-scotland.js). Totals per area are rebuilt from every
//     source, so the one England-return overflow in Scottish Borders is included
//     in that area's figures.
//
// Wales is not loaded yet. One English-return overflow sits in Wales (Flintshire);
// Welsh areas are left out of every ranking here so none appears with a partial count.
//
// Rankings: "1" is the area with the most spill hours. Council rankings are of
// council areas (districts, unitaries, metropolitan and London boroughs) with at
// least one storm overflow; county councils are ranked against other counties
// using the total of their districts.

import { supabase } from '@/lib/supabase';

export type AreaType = 'constituency' | 'council';

export type AreaTotal = {
  area_type: AreaType;
  area_gss_code: string;
  area_name: string;
  year: number;
  nation: string;
  overflows: number;
  overflows_with_data: number;
  overflows_spilled: number;
  spill_count: number;
  spill_hours: number;
};

export type Overflow = {
  source: 'EA' | 'NIW' | 'SW';
  site_id: string;
  year: number;
  company: string;
  site_name: string | null;
  site_name_operator: string | null;
  receiving_water: string | null;
  constituency_gss_code: string | null;
  council_gss_code: string | null;
  placement: string;
  placement_distance_m: number | null;
  spill_count: number | null;
  spill_hours: number | null;
  monitoring_pct: number | null;
  volume_m3: number | null;
};

export type CouncilRef = { slug: string; name: string; short_name: string | null; type: string; gss_code: string | null; parent_slug: string | null };

const n = (v: unknown): number => (v == null ? 0 : Number(v));
const nn = (v: unknown): number | null => (v == null ? null : Number(v));

// Nations covered so far: England (E), Scotland (S) and Northern Ireland (N).
export type CoveredNation = 'England' | 'Scotland' | 'Northern Ireland';
export const isCoveredCode = (code: string | null | undefined): boolean => !!code && /^[ESN]/.test(code);
export const nationOfCode = (code: string): CoveredNation | null => (code.startsWith('E') ? 'England' : code.startsWith('S') ? 'Scotland' : code.startsWith('N') ? 'Northern Ireland' : null);

// Reads every row of a query in pages of 1,000 (the API's default cap).
async function readAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export async function getAreaTotals(): Promise<AreaTotal[]> {
  const rows = await readAll<Record<string, unknown>>((from, to) =>
    supabase.from('sewage_area_totals')
      .select('area_type, area_gss_code, area_name, year, nation, overflows, overflows_with_data, overflows_spilled, spill_count, spill_hours')
      .order('area_type').order('area_gss_code').order('year')
      .range(from, to));
  return rows.map((r) => ({
    area_type: r.area_type as AreaType,
    area_gss_code: String(r.area_gss_code),
    area_name: String(r.area_name),
    year: n(r.year),
    nation: String(r.nation),
    overflows: n(r.overflows),
    overflows_with_data: n(r.overflows_with_data),
    overflows_spilled: n(r.overflows_spilled),
    spill_count: n(r.spill_count),
    spill_hours: n(r.spill_hours),
  }));
}

// Latest year of figures for each nation.
export function latestYears(totals: AreaTotal[]): Record<CoveredNation, number | null> {
  const max = (nation: string) => totals.filter((t) => t.nation === nation).reduce<number | null>((m, t) => (m == null || t.year > m ? t.year : m), null);
  return { England: max('England'), Scotland: max('Scotland'), 'Northern Ireland': max('Northern Ireland') };
}

const OVERFLOW_COLUMNS = 'source, site_id, year, company, site_name, site_name_operator, receiving_water, constituency_gss_code, council_gss_code, placement, placement_distance_m, spill_count, spill_hours, monitoring_pct, volume_m3';

function toOverflow(r: Record<string, unknown>): Overflow {
  return {
    source: r.source as 'EA' | 'NIW' | 'SW',
    site_id: String(r.site_id),
    year: n(r.year),
    company: String(r.company),
    site_name: (r.site_name as string | null) ?? null,
    site_name_operator: (r.site_name_operator as string | null) ?? null,
    receiving_water: (r.receiving_water as string | null) ?? null,
    constituency_gss_code: (r.constituency_gss_code as string | null) ?? null,
    council_gss_code: (r.council_gss_code as string | null) ?? null,
    placement: String(r.placement),
    placement_distance_m: nn(r.placement_distance_m),
    spill_count: nn(r.spill_count),
    spill_hours: nn(r.spill_hours),
    monitoring_pct: nn(r.monitoring_pct),
    volume_m3: nn(r.volume_m3),
  };
}

// Every overflow in the given council areas for one year.
export async function getCouncilOverflows(codes: string[], year: number): Promise<Overflow[]> {
  if (codes.length === 0) return [];
  const rows = await readAll<Record<string, unknown>>((from, to) =>
    supabase.from('sewage_overflows').select(OVERFLOW_COLUMNS)
      .in('council_gss_code', codes).eq('year', year)
      .order('source').order('site_id')
      .range(from, to));
  return rows.map(toOverflow);
}


// Summaries for /sewage (migration 2026-10-19k), rebuilt by refresh_sewage_summary() after each import: per year, source,
// water company and area ('nation' with area_gss_code '', 'council', 'constituency'), and one row of national figures and
// notes per year and source. The page reads these instead of every overflow.
export type CompanyAreaRow = {
  year: number; source: 'EA' | 'NIW' | 'SW'; company: string; area_type: 'nation' | 'council' | 'constituency'; area_gss_code: string;
  overflows: number; overflows_with_data: number; overflows_spilled: number; spill_count: number; spill_hours: number;
};
export type SourceStats = {
  year: number; source: 'EA' | 'NIW' | 'SW'; overflows: number; overflows_with_data: number; spill_count: number; spill_hours: number;
  tidal: number; nearest: number; unplaced_sites: string[]; sites_in_scotland: string[]; overflows_in_wales: number;
  volume_m3: number | null; volume_overflows: number;
};

export async function getCompanyAreaTotals(shown: { source: 'EA' | 'NIW' | 'SW'; year: number }[]): Promise<CompanyAreaRow[]> {
  const sets = await Promise.all(shown.map(({ source, year }) => readAll<Record<string, unknown>>((from, to) =>
    supabase.from('sewage_company_area_totals')
      .select('year, source, company, area_type, area_gss_code, overflows, overflows_with_data, overflows_spilled, spill_count, spill_hours')
      .eq('source', source).eq('year', year)
      .order('area_type').order('area_gss_code').order('company')
      .range(from, to))));
  return sets.flat().map((r) => ({
    year: n(r.year), source: r.source as CompanyAreaRow['source'], company: String(r.company), area_type: r.area_type as CompanyAreaRow['area_type'],
    area_gss_code: String(r.area_gss_code), overflows: n(r.overflows), overflows_with_data: n(r.overflows_with_data),
    overflows_spilled: n(r.overflows_spilled), spill_count: n(r.spill_count), spill_hours: n(r.spill_hours),
  }));
}

export async function getSourceStats(): Promise<SourceStats[]> {
  const { data, error } = await supabase.from('sewage_source_stats')
    .select('year, source, overflows, overflows_with_data, spill_count, spill_hours, tidal, nearest, unplaced_sites, sites_in_scotland, overflows_in_wales, volume_m3, volume_overflows');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    year: n(r.year), source: r.source as SourceStats['source'], overflows: n(r.overflows), overflows_with_data: n(r.overflows_with_data),
    spill_count: n(r.spill_count), spill_hours: n(r.spill_hours), tidal: n(r.tidal), nearest: n(r.nearest),
    unplaced_sites: (r.unplaced_sites as string[]) ?? [], sites_in_scotland: (r.sites_in_scotland as string[]) ?? [],
    overflows_in_wales: n(r.overflows_in_wales), volume_m3: nn(r.volume_m3), volume_overflows: n(r.volume_overflows),
  }));
}

export async function getCouncilRefs(): Promise<CouncilRef[]> {
  const { data, error } = await supabase.from('councils').select('slug, name, short_name, type, gss_code, parent_slug').limit(1000);
  if (error) throw new Error(`councils read: ${error.message}`);
  return (data ?? []) as CouncilRef[];
}

export type Ranked = AreaTotal & { rank: number; of: number };

// Ranks areas by spill hours (most first). Equal hours share a rank.
export function rankByHours(rows: AreaTotal[]): Ranked[] {
  const sorted = [...rows].sort((a, b) => b.spill_hours - a.spill_hours || a.area_name.localeCompare(b.area_name));
  let rank = 0, prev: number | null = null;
  return sorted.map((r, i) => {
    if (prev === null || r.spill_hours !== prev) { rank = i + 1; prev = r.spill_hours; }
    return { ...r, rank, of: sorted.length };
  });
}

// County councils: totals of their districts (districts carry the council
// figures, as counties are not in the ONS council boundaries).
export function countyTotals(councilTotals: AreaTotal[], councils: CouncilRef[], year: number): AreaTotal[] {
  const bySlug = new Map(councils.map((c) => [c.slug, c]));
  const byCode = new Map(councilTotals.filter((t) => t.year === year).map((t) => [t.area_gss_code, t]));
  const out = new Map<string, AreaTotal>();
  for (const d of councils) {
    if (d.type !== 'district' || !d.parent_slug || !d.gss_code) continue;
    const county = bySlug.get(d.parent_slug);
    const t = byCode.get(d.gss_code);
    if (!county || !county.gss_code || !t) continue;
    const cur = out.get(county.gss_code) ?? {
      area_type: 'council' as const, area_gss_code: county.gss_code, area_name: county.name, year, nation: t.nation,
      overflows: 0, overflows_with_data: 0, overflows_spilled: 0, spill_count: 0, spill_hours: 0,
    };
    cur.overflows += t.overflows; cur.overflows_with_data += t.overflows_with_data; cur.overflows_spilled += t.overflows_spilled;
    cur.spill_count += t.spill_count; cur.spill_hours = Math.round((cur.spill_hours + t.spill_hours) * 100) / 100;
    out.set(county.gss_code, cur);
  }
  return [...out.values()];
}

export type CompanyTotal = { company: string; nation: string; overflows: number; withData: number; spilled: number; spills: number; hours: number };

// National figures per water company for one year (covered nations only), from the summary's 'nation' rows.
export function companyTotals(rows: CompanyAreaRow[]): CompanyTotal[] {
  return rows.filter((r) => r.area_type === 'nation').map((r) => ({
    company: r.company, nation: r.source === 'NIW' ? 'Northern Ireland' : r.source === 'SW' ? 'Scotland' : 'England',
    overflows: r.overflows, withData: r.overflows_with_data, spilled: r.overflows_spilled, spills: r.spill_count, hours: Math.round(r.spill_hours),
  })).sort((a, b) => b.hours - a.hours);
}

// Water companies responsible in each area ("council|E06000052" -> names, most hours first; equal hours by name).
export function companiesByArea(rows: CompanyAreaRow[]): Record<string, string[]> {
  const acc = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (r.area_type === 'nation') continue;
    const key = `${r.area_type}|${r.area_gss_code}`;
    const m = acc.get(key) ?? new Map<string, number>();
    m.set(r.company, (m.get(r.company) ?? 0) + r.spill_hours);
    acc.set(key, m);
  }
  const out: Record<string, string[]> = {};
  for (const [k, m] of acc) out[k] = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
  return out;
}

export const fmtInt = (v: number) => Math.round(v).toLocaleString('en-GB');
export const fmtHours = (v: number) => (v >= 100 ? fmtInt(v) : (Math.round(v * 10) / 10).toLocaleString('en-GB'));
export const ordinal = (k: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = k % 100;
  return `${k}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
