// Council area league table (England) for /councils/league-table and the council
// pages' Ratings tab. Reads tables written by the scoring and import scripts:
//   * area_ratings (scripts/score-areas.js): area rating, services score, bands and
//     band stability, one row per English district, unitary, metropolitan or London
//     borough area.
//   * council_statistical_neighbours (scripts/import-statistical-neighbours.js):
//     each council's 15 most similar councils (MHCLG model, 1 July 2026).
//   * council_finance_events and council_reserves (scripts/import-council-finance.js).
//   * council_ratings (scripts/import-council-ratings.js): Ofsted children's services.
//
// Wording rule: the area rating describes the AREA (place quality), not how well the
// council is run. The services score covers services councils run. Warning flags are
// facts with dates, shown beside the scores, never folded into them.

import { cache } from 'react';
import { supabase } from '@/lib/supabase';

export const TOPIC_NAMES = ['Schools and children', 'Safety', 'Health', 'Jobs and poverty', 'Housing', 'Environment', 'Connectivity', 'Local services'] as const;
export const SERVICE_PARTS: { key: string; label: string }[] = [
  { key: 'schools_quality', label: 'Schools' },
  { key: 'childrens_services', label: "Children's services" },
  { key: 'recycling', label: 'Recycling' },
  { key: 'planning', label: 'Planning' },
];

// Where each measure comes from (shown in the method section).
export const MEASURE_SOURCES: Record<string, string> = {
  schools_quality: 'Ofsted, inspections of state schools (quality of education judgement)',
  childrens_services: "Ofsted, local authority children's services inspection outcomes",
  crime: 'data.police.uk, recorded crime at street level',
  roads: 'Department for Transport, reported road casualties (table RAS0403)',
  life_exp_f: 'ONS, life expectancy for local areas',
  life_exp_m: 'ONS, life expectancy for local areas',
  obesity: 'Office for Health Improvement and Disparities, Fingertips (adults overweight or obese)',
  claimants: 'ONS, Claimant Count (Nomis)',
  child_poverty: 'DWP, Children in low income families: local area statistics',
  fuel_poverty: 'DESNZ, sub-regional fuel poverty data',
  temp_accommodation: 'MHCLG, statutory homelessness detailed local authority tables',
  affordability: 'ONS, house price to residence-based earnings ratio (table 5c)',
  recycling: 'Defra, local authority collected waste management statistics',
  sewage: 'Environment Agency, storm overflow annual return',
  gigabit: 'Ofcom, Connected Nations',
  indoor_4g_all: 'Ofcom, Connected Nations',
  planning_major: 'MHCLG, planning applications statistics (table P151a)',
  planning_nonmajor: 'MHCLG, planning applications statistics (table P153)',
};
// Where each source can be checked (audit L1). Landing pages, checked 16 Oct 2026.
export const MEASURE_SOURCE_URLS: Record<string, string> = {
  schools_quality: 'https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes',
  childrens_services: 'https://www.gov.uk/government/collections/childrens-social-care-statistics',
  crime: 'https://data.police.uk/data/',
  roads: 'https://www.gov.uk/government/statistical-data-sets/road-safety-statistics-data-tables',
  life_exp_f: 'https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandlifeexpectancies/datasets/lifeexpectancyforlocalareasofgreatbritain',
  life_exp_m: 'https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandlifeexpectancies/datasets/lifeexpectancyforlocalareasofgreatbritain',
  obesity: 'https://fingertips.phe.org.uk/',
  claimants: 'https://www.nomisweb.co.uk/sources/cc',
  child_poverty: 'https://www.gov.uk/government/collections/children-in-low-income-families-local-area-statistics',
  fuel_poverty: 'https://www.gov.uk/government/statistics/sub-regional-fuel-poverty-report-2026-2024-data',
  temp_accommodation: 'https://www.gov.uk/government/statistical-data-sets/live-tables-on-homelessness',
  affordability: 'https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/ratioofhousepricetoresidencebasedearningslowerquartileandmedian',
  recycling: 'https://www.gov.uk/government/statistics/local-authority-collected-waste-management-annual-results',
  sewage: 'https://www.data.gov.uk/dataset/19f6064d-7356-466f-844e-d20ea10ae9fd/event-duration-monitoring-storm-overflows-annual-returns',
  gigabit: 'https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/',
  indoor_4g_all: 'https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/',
  planning_major: 'https://www.gov.uk/government/statistical-data-sets/live-tables-on-planning-application-statistics',
  planning_nonmajor: 'https://www.gov.uk/government/statistical-data-sets/live-tables-on-planning-application-statistics',
};
// Who is mainly responsible for what each measure counts (audit L11). Many measures depend
// on far more than any one body; the wording says so.
export const MEASURE_RESPONSIBLE: Record<string, string> = {
  schools_quality: 'Schools and academy trusts; the council for its own maintained schools',
  childrens_services: 'County or unitary council',
  crime: 'Police force, with councils sharing community safety duties',
  roads: 'Highway authority (county or unitary council; National Highways for motorways and trunk roads)',
  life_exp_f: 'Many factors; NHS and council public health play a part',
  life_exp_m: 'Many factors; NHS and council public health play a part',
  obesity: 'Many factors; council public health plays a part',
  claimants: 'Local economy; Department for Work and Pensions runs the benefit',
  child_poverty: 'Incomes and benefits, set mostly by UK government',
  fuel_poverty: 'Energy prices, incomes and housing; mostly UK government policy',
  temp_accommodation: 'Housing authority (district or unitary council)',
  affordability: 'Housing market; councils plan for new homes',
  recycling: 'Waste collection authority (district or unitary council)',
  sewage: 'Water company',
  gigabit: 'Telecoms companies; Ofcom regulates',
  indoor_4g_all: 'Mobile companies; Ofcom regulates',
  planning_major: 'Local planning authority (district or unitary council)',
  planning_nonmajor: 'Local planning authority (district or unitary council)',
};
export const STAT_NEIGHBOURS_URL = 'https://assets.publishing.service.gov.uk/media/6a452aee1c8bd7ce25a5e8fa/010726_MHCLG_Statistical_Neighbours.xlsx';

export const MEASURE_TOPIC: Record<string, string> = {
  schools_quality: 'Schools and children', childrens_services: 'Schools and children',
  crime: 'Safety', roads: 'Safety',
  life_exp_f: 'Health', life_exp_m: 'Health', obesity: 'Health',
  claimants: 'Jobs and poverty', child_poverty: 'Jobs and poverty', fuel_poverty: 'Jobs and poverty',
  temp_accommodation: 'Housing', affordability: 'Housing',
  recycling: 'Environment', sewage: 'Environment',
  gigabit: 'Connectivity', indoor_4g_all: 'Connectivity',
  planning_major: 'Local services', planning_nonmajor: 'Local services',
};

export type FlagKind = 'ofsted' | 's114' | 'intervention' | 'inspection' | 'efs' | 'reserves';
export type LeagueFlag = { kind: FlagKind; label: string; county: boolean };

export type MeasureDetail = { label: string; period: string | null; better: 'higher' | 'lower'; value: number; score: number | null };

export type LeagueRow = {
  code: string;
  name: string;
  slug: string | null;
  type: string;
  typeLabel: string;
  areaScore: number | null;
  areaRank: number | null;
  areaBand: number | null;
  areasRanked: number;
  nearBoundary: boolean;
  bandChanges: number | null;
  bandVersions: number | null;
  topics: Record<string, number>;
  measures: Record<string, MeasureDetail>;
  servicesScore: number | null;
  servicesRank: number | null;
  servicesBand: number | null;
  servicesRanked: number;
  services: Record<string, number>;
  peer: { rank: number; of: number } | null;
  flags: LeagueFlag[];
  excludedReason: string | null;
  methodVersion: string;
};

export type CouncilRef = { gss_code: string; slug: string; name: string; short_name: string | null; type: string; type_label: string | null; parent_slug: string | null; country: string };

const num = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));

// Reads every row of a query in pages of 1,000, in a fixed order so no row is missed.
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

// Shows stored periods in words: "2026-08-01" -> "August 2026", "2025-09 to 2026-08" ->
// "September 2025 to August 2026". Anything else is shown as stored.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function formatPeriod(p: string | null): string | null {
  if (!p) return p;
  const word = (y: string, mo: string) => { const i = Number(mo) - 1; return i >= 0 && i < 12 ? `${MONTHS[i]} ${y}` : `${y}-${mo}`; };
  // Full dates anywhere ("2026-08-01"); year-month only as a "from to" range, so a
  // financial year such as "2011-12" is never read as a month.
  const range = p.match(/^(\d{4})-(\d{2}) to (\d{4})-(\d{2})$/);
  if (range) return `${word(range[1], range[2])} to ${word(range[3], range[4])}`;
  return p.replace(/\b(\d{4})-(\d{2})-\d{2}\b/g, (_m, y: string, mo: string) => word(y, mo));
}

export const bandLabel = (band: number | null): string =>
  band == null ? 'Not ranked' : ['', 'top fifth', 'second fifth', 'middle fifth', 'fourth fifth', 'bottom fifth'][band] ?? '';

export const ordinal = (k: number): string => {
  const s = ['th', 'st', 'nd', 'rd'], v = k % 100;
  return `${k}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

type EventRow = { council_gss_code: string; event_type: string; period: string; event_date: string | null };
type ReserveRow = { council_gss_code: string; financial_year: string; usable_start: number | null; usable_end: number | null; usable_change: number | null };

// Warning flags for one council (its own events, reserves and, where it runs
// children's services, its Ofsted grade). county = true when the council is the
// county council for a district area.
function councilFlags(code: string, county: boolean, events: EventRow[], reserves: Map<string, ReserveRow>, ofsted: Map<string, { grade: string | null; rank: number | null }>, includeOfsted: boolean): LeagueFlag[] {
  const flags: LeagueFlag[] = [];
  if (includeOfsted) {
    const o = ofsted.get(code);
    if (o && o.rank === 4) flags.push({ kind: 'ofsted', label: "Ofsted: children's services Inadequate", county });
  }
  const mine = events.filter((e) => e.council_gss_code === code);
  const s114 = [...new Set(mine.filter((e) => e.event_type === 'section_114').map((e) => (e.event_date || e.period).slice(0, 4)))].sort();
  if (s114.length) flags.push({ kind: 's114', label: `Section 114 notice: ${s114.join(', ')}`, county });
  const intv = mine.filter((e) => e.event_type === 'intervention').map((e) => e.period).sort();
  if (intv.length) flags.push({ kind: 'intervention', label: `Government intervention since ${intv[0]}`, county });
  const insp = mine.filter((e) => e.event_type === 'best_value_inspection').map((e) => e.period).sort();
  if (insp.length) flags.push({ kind: 'inspection', label: `Best value inspection, ${insp[insp.length - 1]}`, county });
  const efs = mine.filter((e) => e.event_type === 'exceptional_support').map((e) => e.period).sort();
  if (efs.length) flags.push({ kind: 'efs', label: `Exceptional financial support: ${efs.length === 1 ? efs[0] : `${efs.length} years, latest ${efs[efs.length - 1]}`}`, county });
  const r = reserves.get(code);
  if (r && r.usable_end != null) {
    if (r.usable_end < 0) flags.push({ kind: 'reserves', label: `Usable reserves below zero (31 March ${r.financial_year.slice(0, 2)}${r.financial_year.slice(5, 7)})`, county });
    else if (r.usable_start != null && r.usable_start > 0 && r.usable_change != null && r.usable_change / r.usable_start <= -0.5) {
      flags.push({ kind: 'reserves', label: `Usable reserves fell ${Math.round((-r.usable_change / r.usable_start) * 100)}% in ${r.financial_year}`, county });
    }
  }
  return flags;
}

export type LeagueData = {
  rows: LeagueRow[];          // ranked areas
  separate: LeagueRow[];      // listed separately (too small to rank fairly)
  councils: CouncilRef[];
  measureInfo: { key: string; label: string; period: string | null; better: string; topic: string; source: string; sourceUrl: string | null; responsible: string }[];
  stability: { versions: number; near: number; never: number; ranked: number };
  reservesYear: string | null;
  // Every English council's own flags (district flags without Ofsted, which counties hold),
  // its Ofsted children's services grade, and its Statistical Neighbours.
  flagsByCouncil: Map<string, LeagueFlag[]>;
  ofstedByCouncil: Map<string, { grade: string | null; rank: number | null }>;
  neighboursOf: Map<string, string[]>;
};

// Read once per request: the league page and every council page's Ratings tab share it.
export const getLeagueData = cache(async (): Promise<LeagueData> => {
  const [ratings, councils, events, reserveRows, ofstedRows, neighbours] = await Promise.all([
    readAll<Record<string, unknown>>((f, t) => supabase.from('area_ratings')
      .select('area_gss_code, area_name, area_score, area_rank, area_band, areas_ranked, topic_scores, measures, services_score, services_rank, services_band, services_ranked, services_detail, band_changes, band_versions, near_band_boundary, excluded_reason, method_version')
      .order('area_gss_code').range(f, t)),
    readAll<CouncilRef>((f, t) => supabase.from('councils').select('gss_code, slug, name, short_name, type, type_label, parent_slug, country').order('slug').range(f, t)),
    readAll<EventRow>((f, t) => supabase.from('council_finance_events').select('council_gss_code, event_type, period, event_date').order('council_gss_code').order('event_type').order('period').range(f, t)),
    readAll<ReserveRow>((f, t) => supabase.from('council_reserves').select('council_gss_code, financial_year, usable_start, usable_end, usable_change').order('council_gss_code').order('financial_year').range(f, t)),
    readAll<{ council_gss_code: string; value_grade: string | null; grade_rank: number | null }>((f, t) => supabase.from('council_ratings').select('council_gss_code, value_grade, grade_rank').eq('measure', 'ofsted_childrens_services').order('council_gss_code').order('period').range(f, t)),
    readAll<{ council_gss_code: string; neighbour_rank: number; neighbour_gss_code: string }>((f, t) => supabase.from('council_statistical_neighbours').select('council_gss_code, neighbour_rank, neighbour_gss_code').order('council_gss_code').order('neighbour_rank').range(f, t)),
  ]);

  const byCode = new Map(councils.filter((c) => c.gss_code).map((c) => [c.gss_code, c]));
  const bySlug = new Map(councils.map((c) => [c.slug, c]));
  // Latest financial year per council.
  const reserves = new Map<string, ReserveRow>();
  for (const r of reserveRows) {
    const cur = reserves.get(r.council_gss_code);
    if (!cur || r.financial_year > cur.financial_year) reserves.set(r.council_gss_code, { ...r, usable_start: num(r.usable_start), usable_end: num(r.usable_end), usable_change: num(r.usable_change) });
  }
  const ofsted = new Map(ofstedRows.map((o) => [o.council_gss_code, { grade: o.value_grade, rank: num(o.grade_rank) }]));
  const peersOf = new Map<string, string[]>();
  for (const n of neighbours) peersOf.set(n.council_gss_code, [...(peersOf.get(n.council_gss_code) ?? []), n.neighbour_gss_code]);

  const servicesBy = new Map(ratings.map((r) => [String(r.area_gss_code), num(r.services_score)]));

  const all: LeagueRow[] = ratings.map((r) => {
    const code = String(r.area_gss_code);
    const c = byCode.get(code);
    const county = c?.type === 'district' && c.parent_slug ? bySlug.get(c.parent_slug) : undefined;
    // Children's services are run by the county for a district; otherwise by the council itself.
    const flags = [
      ...councilFlags(code, false, events, reserves, ofsted, !county),
      ...(county ? councilFlags(county.gss_code, true, events, reserves, ofsted, true) : []),
    ];
    const svc = num(r.services_score);
    let peer: { rank: number; of: number } | null = null;
    const peers = peersOf.get(code);
    if (svc != null && peers) {
      const group = [code, ...peers].map((p) => servicesBy.get(p)).filter((v): v is number => v != null);
      peer = { rank: group.filter((v) => v > svc).length + 1, of: group.length };
    }
    const topics = (r.topic_scores ?? {}) as Record<string, number>;
    const services = (r.services_detail ?? {}) as Record<string, number>;
    return {
      code,
      name: String(r.area_name),
      slug: c?.slug ?? null,
      type: c?.type ?? '',
      typeLabel: c?.type_label ?? '',
      areaScore: num(r.area_score),
      areaRank: num(r.area_rank),
      areaBand: num(r.area_band),
      areasRanked: Number(r.areas_ranked),
      nearBoundary: r.near_band_boundary === true,
      bandChanges: num(r.band_changes),
      bandVersions: num(r.band_versions),
      topics,
      measures: (r.measures ?? {}) as Record<string, MeasureDetail>,
      servicesScore: svc,
      servicesRank: num(r.services_rank),
      servicesBand: num(r.services_band),
      servicesRanked: Number(r.services_ranked),
      services,
      peer,
      flags,
      excludedReason: (r.excluded_reason as string | null) ?? null,
      methodVersion: String(r.method_version),
    };
  });

  const rows = all.filter((r) => r.areaRank != null).sort((a, b) => (a.areaRank ?? 0) - (b.areaRank ?? 0));
  const separate = all.filter((r) => r.areaRank == null);

  // Measure list for the method section, from the stored measure details.
  const seen = new Map<string, { label: string; period: string | null; better: string }>();
  for (const r of all) for (const [k, m] of Object.entries(r.measures)) if (!seen.has(k)) seen.set(k, { label: m.label, period: m.period, better: m.better });
  const order = Object.keys(MEASURE_TOPIC);
  const measureInfo = order.filter((k) => seen.has(k)).map((k) => ({ key: k, ...seen.get(k)!, period: formatPeriod(seen.get(k)!.period), topic: MEASURE_TOPIC[k], source: MEASURE_SOURCES[k] ?? '', sourceUrl: MEASURE_SOURCE_URLS[k] ?? null, responsible: MEASURE_RESPONSIBLE[k] ?? '' }));

  const versions = rows.find((r) => r.bandVersions != null)?.bandVersions ?? 0;
  const stability = {
    versions,
    near: rows.filter((r) => r.nearBoundary).length,
    never: rows.filter((r) => r.bandChanges === 0).length,
    ranked: rows.length,
  };
  const reservesYear = [...reserves.values()].reduce<string | null>((m, r) => (m == null || r.financial_year > m ? r.financial_year : m), null);

  const flagsByCouncil = new Map<string, LeagueFlag[]>();
  for (const c of councils) {
    if (c.country !== 'England' || !c.gss_code) continue;
    flagsByCouncil.set(c.gss_code, councilFlags(c.gss_code, false, events, reserves, ofsted, c.type !== 'district'));
  }

  return { rows, separate, councils, measureInfo, stability, reservesYear, flagsByCouncil, ofstedByCouncil: ofsted, neighboursOf: peersOf };
});

export type FinanceEvent = { event_type: string; period: string; event_date: string | null; amount_gbp: number | null; source: string; source_url: string };
export type ReserveDetail = {
  financial_year: string;
  usable_start: number | null; usable_end: number | null; usable_change: number | null;
  unallocated_end: number | null; earmarked_end: number | null;
  usable_end_pct_of_spending: number | null; source: string; source_url: string;
};

// One council's finance record: dated events (newest first) and its latest reserves.
export async function getCouncilFinance(code: string): Promise<{ events: FinanceEvent[]; reserves: ReserveDetail | null }> {
  const [ev, rs] = await Promise.all([
    supabase.from('council_finance_events').select('event_type, period, event_date, amount_gbp, source, source_url').eq('council_gss_code', code).order('period', { ascending: false }),
    supabase.from('council_reserves').select('financial_year, usable_start, usable_end, usable_change, unallocated_end, earmarked_end, usable_end_pct_of_spending, source, source_url').eq('council_gss_code', code).order('financial_year', { ascending: false }).limit(1),
  ]);
  if (ev.error) throw new Error(ev.error.message);
  if (rs.error) throw new Error(rs.error.message);
  const events = (ev.data ?? []).map((e) => ({ ...e, amount_gbp: num(e.amount_gbp) })) as FinanceEvent[];
  const r = (rs.data ?? [])[0] as Record<string, unknown> | undefined;
  const reserves: ReserveDetail | null = r ? {
    financial_year: String(r.financial_year),
    usable_start: num(r.usable_start), usable_end: num(r.usable_end), usable_change: num(r.usable_change),
    unallocated_end: num(r.unallocated_end), earmarked_end: num(r.earmarked_end),
    usable_end_pct_of_spending: num(r.usable_end_pct_of_spending), source: String(r.source), source_url: String(r.source_url),
  } : null;
  return { events, reserves };
}
