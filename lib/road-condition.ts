// Road condition for council pages and /councils/road-condition (council_road_condition, migration 2026-10-28g; owner's
// decisions, 28 Oct 2026). Wording in one place so the council block and the ranking page agree. Compared with England
// only; England is DfT's figure as published, which leaves out Derbyshire from FYE 2019. A figure DfT flags as surveyed
// by an alternative method is shown with DfT's warning and left out of the rankings.
import { supabase } from '@/lib/supabase';

export type RoadRow = {
  ons_code: string; area_name: string; area_level: 'england' | 'council'; year: string;
  a_roads_red_pct: number | string | null; b_c_roads_red_pct: number | string | null; unclassified_red_pct: number | string | null;
  a_roads_amber_pct: number | string | null; a_roads_green_pct: number | string | null; b_c_roads_amber_pct: number | string | null; b_c_roads_green_pct: number | string | null;
  treated_a_pct: number | string | null; treated_bcu_pct: number | string | null; network_a_km: number | string | null; network_bcu_km: number | string | null;
  symbols: Record<string, string>; not_comparable: string[]; source_url: string;
};
const COLS = 'ons_code, area_name, area_level, year, a_roads_red_pct, b_c_roads_red_pct, unclassified_red_pct, a_roads_amber_pct, a_roads_green_pct, b_c_roads_amber_pct, b_c_roads_green_pct, treated_a_pct, treated_bcu_pct, network_a_km, network_bcu_km, symbols, not_comparable, source_url';

export const RANKING_PATH = '/councils/road-condition';
export const SOURCE_PAGE = 'https://www.gov.uk/government/statistical-data-sets/road-condition-statistics-data-tables-rdc';
export const PUBLICATION = 'https://www.gov.uk/government/statistics/road-conditions-in-england-to-march-2026';
export const SOURCE_LABEL = 'Department for Transport, Road condition statistics: data tables (RDC), April 2007 to March 2026';
export const OGL = 'Contains public sector information licensed under the Open Government Licence v3.0.';
export const OGL_URL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';

export type RoadType = 'a' | 'bc' | 'u';
export const ROAD_TYPES: { key: RoadType; field: 'a_roads_red_pct' | 'b_c_roads_red_pct' | 'unclassified_red_pct'; label: string; short: string }[] = [
  { key: 'a', field: 'a_roads_red_pct', label: 'A roads and motorways', short: 'A roads' },
  { key: 'bc', field: 'b_c_roads_red_pct', label: 'B and C roads', short: 'B and C roads' },
  { key: 'u', field: 'unclassified_red_pct', label: 'Unclassified roads', short: 'Unclassified roads' },
];

// DfT's shorthand, in DfT's words.
export const SYMBOL_MEANING: Record<string, string> = {
  x: 'data unavailable (DfT)',
  y: 'submitted data was unrepresentative due to insufficient data coverage or known data quality issues (DfT)',
  z: 'not applicable (DfT)',
};
// DfT's own words (table notes 2 and 4, and the alternative methods note).
export const RED_MEANING = 'should have been considered for maintenance. Treatment may or may not be required, but the road should be investigated fully';
export const EXPLAINER = [
  'DfT groups each road’s surface condition into green (no further investigation or work is needed), amber (maintenance may be required soon) and red (should have been considered for maintenance: treatment may or may not be required, but the road should be investigated fully). The figures are the share of the road, measured in 10 metre sections, that is red.',
  'A, B and C roads are surveyed by SCANNER machines, accredited for accuracy. There is no required method for unclassified roads, so councils use different surveys, and DfT advises caution when comparing councils on them. Unclassified figures come from different source data and cannot be compared with A, B and C roads.',
  'The size of road networks varies: a change of 1 kilometre of red road moves the percentage more in a small council than in a large one (DfT).',
];
export const NOT_COMPARABLE_WARNING = 'DfT flags this figure: the council used a survey method other than SCANNER, so it is not directly comparable with other councils, and DfT does not advise comparing it year on year where the method changed.';
export const LAST_YEAR_NOTE = 'March 2026 is the last year of this series. DfT moved to a new British Standards Institution standard, PAS 2161, in April 2026. It has five condition categories, which are not backward compatible with the red, amber and green categories, so these tables will not be updated again.';
export const ENGLAND_NOTE = 'England is DfT’s figure, which leaves out Derbyshire from the year to March 2019 because of the survey method it used.';

const pct = (v: number | string | null | undefined) => (v == null ? null : Number(v));
export const value = (row: RoadRow | undefined, f: keyof RoadRow) => pct(row?.[f] as number | string | null | undefined);
export function valueText(row: RoadRow | undefined, f: keyof RoadRow): string {
  const v = value(row, f);
  if (v != null) return `${v} per cent`;
  const sym = row?.symbols?.[f as string];
  return sym && SYMBOL_MEANING[sym] ? SYMBOL_MEANING[sym] : 'not published';
}
export const notComparable = (row: RoadRow | undefined, f: string) => !!row?.not_comparable?.includes(f);
export const fye = (d: string) => `the year to March ${Number(d.slice(0, 4))}`;

// Change on the year, in percentage points.
export function changeText(cur: RoadRow | undefined, prev: RoadRow | undefined, f: keyof RoadRow): string | null {
  const a = value(cur, f), b = value(prev, f);
  if (a == null || b == null) return null;
  const d = Math.round((a - b) * 10) / 10;
  if (d === 0) return `no change on ${fye(prev!.year)}`;
  return `${d > 0 ? 'up' : 'down'} ${Math.abs(d)} percentage point${Math.abs(d) === 1 ? '' : 's'} on ${fye(prev!.year)}`;
}

export async function loadArea(code: string): Promise<RoadRow[]> {
  const { data, error } = await supabase.from('council_road_condition').select(COLS).in('ons_code', [code, 'E92000001']).order('year', { ascending: false }).limit(60);
  if (error) throw new Error(`council_road_condition ${code}: ${error.message}`);
  return (data ?? []) as RoadRow[];
}

export async function loadLatestTwoYears(): Promise<{ latest: string | null; rows: RoadRow[] }> {
  const { data: top, error: topErr } = await supabase.from('council_road_condition').select('year').eq('area_level', 'england').order('year', { ascending: false }).limit(1);
  if (topErr) throw new Error(`council_road_condition latest year: ${topErr.message}`);
  const latest = (top?.[0]?.year as string | undefined) ?? null;
  if (!latest) return { latest: null, rows: [] };
  const prev = `${Number(latest.slice(0, 4)) - 1}-03-31`;
  const { data, error } = await supabase.from('council_road_condition').select(COLS).in('year', [latest, prev]).limit(1000);
  if (error) throw new Error(`council_road_condition ${latest}: ${error.message}`);
  return { latest, rows: (data ?? []) as RoadRow[] };
}
