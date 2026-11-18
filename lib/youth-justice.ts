// Youth justice for council pages and /councils/youth-justice (council_youth_first_entrants and youth_justice_services,
// migration 2026-11-18a; owner approved 18 Nov 2026, Cowork ENTRY 303). Wording and figures in one place. Compared with
// England and Wales: the release gives no England only total. Welsh councils appear on the ranking page only (owner).
import { tagDb, COUNCIL_DATA_TAG } from '@/lib/page-reads';

export type FteRow = { area_code: string; area_name: string; area_level: string; country: string; year: number; fte_count: number | string | null; fte_rate: number | string | null; symbols: Record<string, string> };
export type YjsRow = {
  yjs_name: string; country: string; region: string | null; year: string; council_codes: string[]; children_cautioned_sentenced: number | null;
  funding_yjb_grant: number | string | null; funding_local_authority: number | string | null; funding_police: number | string | null; funding_pcc: number | string | null;
  funding_probation: number | string | null; funding_health: number | string | null; funding_welsh_government: number | string | null; funding_other: number | string | null;
  funding_total: number | string | null; population_10_17: number | null;
};
const FTE_COLS = 'area_code, area_name, area_level, country, year, fte_count, fte_rate, symbols';
const YJS_COLS = 'yjs_name, country, region, year, council_codes, children_cautioned_sentenced, funding_yjb_grant, funding_local_authority, funding_police, funding_pcc, funding_probation, funding_health, funding_welsh_government, funding_other, funding_total, population_10_17';

export const RANKING_PATH = '/councils/youth-justice';
export const EW = 'K04000001';
export const SOURCE_PAGE = 'https://www.gov.uk/government/statistics/youth-justice-statistics-2024-to-2025';
export const SOURCE_LABEL = 'Ministry of Justice and Youth Justice Board, Youth Justice Statistics 2024 to 2025 (published 29 January 2026)';
export const OGL = 'Contains public sector information licensed under the Open Government Licence v3.0.';
export const OGL_URL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';

const SYMBOL: Record<string, string> = { '..': 'fewer than ten, not published', '*': 'not given for this area after a boundary change' };
const num = (n: number) => n.toLocaleString('en-GB');
export const val = (v: number | string | null | undefined) => (v == null ? null : Number(v));
// First time entrants are modelled estimates with decimals in the source: shown as whole numbers.
export function fteText(r: FteRow | undefined): string {
  const v = val(r?.fte_count);
  if (v != null) return num(Math.round(v));
  const s = r?.symbols?.fte_count; return s && SYMBOL[s] ? SYMBOL[s] : 'not published';
}
export function rateText(r: FteRow | undefined): string {
  const v = val(r?.fte_rate);
  if (v != null) return `${Math.round(v)} per 100,000 children aged 10 to 17`;
  const s = r?.symbols?.fte_rate; return s && SYMBOL[s] ? SYMBOL[s] : 'not published';
}
export const pounds = (v: number | string | null | undefined) => (val(v) == null ? 'not published' : `£${num(Math.round(val(v)!))}`);
export const yearLabel = (y: number) => `the year to December ${y}`;
export const fyLabel = (fy: string) => `the year to March ${Number(fy.slice(0, 4)) + 1}`;

export const FUNDING_SOURCES: [keyof YjsRow, string][] = [
  ['funding_yjb_grant', 'Youth Justice Board grant'], ['funding_local_authority', 'Council'], ['funding_police', 'Police'], ['funding_pcc', 'Police and crime commissioner'],
  ['funding_probation', 'Probation'], ['funding_health', 'Health'], ['funding_welsh_government', 'Welsh Government'], ['funding_other', 'Other'],
];

export const EXPLAINER = [
  'A first time entrant is a child aged 10 to 17 who receives their first youth caution or conviction. The figures are by the council area where the child lives, for years ending in December, and are modelled estimates (Ministry of Justice), shown here as whole numbers.',
  'A youth justice service is the team each council (or several councils together) runs with the police, probation and health services to work with children who offend. Its caseload counts children cautioned or sentenced in years ending in March. Reoffending and the number of children in custody are published only for England and Wales as a whole and for regions, so they are not shown by council.',
];

export async function loadFte(code: string): Promise<FteRow[]> {
  const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('council_youth_first_entrants').select(FTE_COLS).in('area_code', [code, EW]).order('year', { ascending: false }).limit(40);
  if (error) throw new Error(`council_youth_first_entrants ${code}: ${error.message}`);
  return (data ?? []) as FteRow[];
}
export async function loadServices(code: string): Promise<YjsRow[]> {
  const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('youth_justice_services').select(YJS_COLS).contains('council_codes', [code]).order('year', { ascending: false }).limit(40);
  if (error) throw new Error(`youth_justice_services ${code}: ${error.message}`);
  return (data ?? []) as YjsRow[];
}
export async function loadServiceTotals(year: string): Promise<{ England: number; Wales: number }> {
  const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('youth_justice_services').select('country, children_cautioned_sentenced').eq('year', year).limit(400);
  if (error) throw new Error(`youth_justice_services ${year}: ${error.message}`);
  const out = { England: 0, Wales: 0 };
  for (const r of data ?? []) out[r.country as 'England' | 'Wales'] += Number(r.children_cautioned_sentenced ?? 0);
  return out;
}
export async function loadRanking(): Promise<{ latest: number | null; rows: FteRow[] }> {
  const { data: top, error: e1 } = await tagDb([COUNCIL_DATA_TAG]).from('council_youth_first_entrants').select('year').eq('area_code', EW).order('year', { ascending: false }).limit(1);
  if (e1) throw new Error(`council_youth_first_entrants latest: ${e1.message}`);
  const latest = (top?.[0]?.year as number | undefined) ?? null;
  if (latest == null) return { latest: null, rows: [] };
  const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('council_youth_first_entrants').select(FTE_COLS).in('year', [latest, latest - 1]).limit(1000);
  if (error) throw new Error(`council_youth_first_entrants ${latest}: ${error.message}`);
  return { latest, rows: (data ?? []) as FteRow[] };
}
