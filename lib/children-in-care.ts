// Children in care for council pages and /councils/children-in-care (council_children_in_care, migration 2026-10-28g;
// owner's decisions, 28 Oct 2026). Wording and figures in one place so the council block and the ranking page agree.
// Compared with England only. A figure DfE shows as a symbol is empty in the table and shown with DfE's own meaning.
import { pageDb } from '@/lib/page-reads';

export type CareRow = {
  ons_code: string; area_name: string; area_level: 'england' | 'council'; year: string;
  looked_after: number | null; rate_per_10000: number | string | null; started: number | null; ceased: number | null;
  placed_outside_area: number | null; placed_outside_area_pct: number | string | null; uasc: number | null; adopted: number | null;
  symbols: Record<string, string>; rounded_to: number; source_url: string;
};
const COLS = 'ons_code, area_name, area_level, year, looked_after, rate_per_10000, started, ceased, placed_outside_area, placed_outside_area_pct, uasc, adopted, symbols, rounded_to, source_url';

export const RANKING_PATH = '/councils/children-in-care';
export const SOURCE_PAGE = 'https://explore-education-statistics.service.gov.uk/find-statistics/children-looked-after-in-england-including-adoptions';
export const OGL = 'Contains public sector information licensed under the Open Government Licence v3.0.';
export const OGL_URL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';

// DfE's own meanings for its symbols (data guidance, reporting year 2025).
export const SYMBOL_MEANING: Record<string, string> = {
  c: 'not published, to protect confidentiality (DfE)',
  z: 'not applicable (DfE)',
  x: 'not available (DfE)',
  k: 'a value that would round to zero but is not zero (DfE)',
};

const num = (n: number) => n.toLocaleString('en-GB');
export const yearOf = (d: string) => Number(d.slice(0, 4));
export const asAt = (d: string) => `31 March ${yearOf(d)}`;
export const yearTo = (d: string) => `the year to 31 March ${yearOf(d)}`;
export const releaseLabel = (d: string) => `Children looked after in England including adoptions, reporting year ${yearOf(d)}`;

type Field = 'looked_after' | 'rate_per_10000' | 'started' | 'ceased' | 'placed_outside_area' | 'placed_outside_area_pct' | 'uasc' | 'adopted';
export const n = (row: CareRow | undefined, f: Field): number | null => (row?.[f] == null ? null : Number(row[f]));
// A count, or DfE's meaning for the symbol it shows instead.
export function text(row: CareRow | undefined, f: Field): string {
  const v = n(row, f);
  if (v != null) return num(v);
  const sym = row?.symbols?.[f];
  return sym && SYMBOL_MEANING[sym] ? SYMBOL_MEANING[sym] : 'not published';
}
export const rateText = (row: CareRow | undefined) => (n(row, 'rate_per_10000') == null ? text(row, 'rate_per_10000') : `${num(n(row, 'rate_per_10000')!)} per 10,000 children`);

export function change(cur: CareRow | undefined, prev: CareRow | undefined): { diff: number; pct: number } | null {
  const a = n(cur, 'looked_after'), b = n(prev, 'looked_after');
  if (a == null || b == null || b === 0) return null;
  return { diff: a - b, pct: Math.round(((a - b) / b) * 1000) / 10 };
}
export function changeText(cur: CareRow | undefined, prev: CareRow | undefined): string | null {
  const c = change(cur, prev);
  if (!c || !prev) return null;
  const when = `${asAt(prev.year)} (${num(n(prev, 'looked_after')!)})`;
  if (c.diff === 0) return `The same as at ${when}`;
  return `${c.diff > 0 ? 'Up' : 'Down'} ${num(Math.abs(c.diff))} (${Math.abs(c.pct).toFixed(1)} per cent) on ${when}`;
}
export const pctChangeText = (c: { pct: number } | null) => (c == null ? 'not published' : `${c.pct > 0 ? 'up ' : c.pct < 0 ? 'down ' : 'no change'}${c.pct ? `${Math.abs(c.pct).toFixed(1)} per cent` : ''}`);

// What "looked after" means, from DfE's release (reporting year 2025): the legal routes into care.
export const EXPLAINER = [
  'A child is looked after, or in care, when the council has taken on their care. DfE records each child’s legal status. Most are looked after under a care order made by a court; others under a voluntary agreement under section 20 of the Children Act 1989, where there is parental consent or no one with parental responsibility is in place; and some under a placement order, a court order allowing the council to place a child for adoption. A small number are detained for child protection reasons or under youth justice legal statuses.',
  'In 2025, 75 per cent of children looked after in England were looked after under a care order, 19 per cent under a voluntary agreement and 6 per cent under a placement order (DfE).',
  'The rate is children looked after per 10,000 children aged under 18 in the area. Children placed outside the council’s area are placed outside its boundary, which DfE counts whatever the distance. Unaccompanied asylum seeking children are children seeking asylum in the UK without a parent or carer; some councils look after many more than others.',
];
export const ROUNDING_NOTE = 'DfE rounds England’s figures to the nearest 10; council figures are not rounded.';

export async function loadArea(code: string): Promise<CareRow[]> {
  const { data, error } = await pageDb().from('council_children_in_care').select(COLS).in('ons_code', [code, 'E92000001']).order('year', { ascending: false }).limit(20);
  if (error) throw new Error(`council_children_in_care ${code}: ${error.message}`);
  return (data ?? []) as CareRow[];
}

export async function loadLatestTwoYears(): Promise<{ latest: string | null; rows: CareRow[] }> {
  const { data: top, error: topErr } = await pageDb().from('council_children_in_care').select('year').eq('area_level', 'england').order('year', { ascending: false }).limit(1);
  if (topErr) throw new Error(`council_children_in_care latest year: ${topErr.message}`);
  const latest = (top?.[0]?.year as string | undefined) ?? null;
  if (!latest) return { latest: null, rows: [] };
  const prev = `${yearOf(latest) - 1}-03-31`;
  const { data, error } = await pageDb().from('council_children_in_care').select(COLS).in('year', [latest, prev]).limit(1000);
  if (error) throw new Error(`council_children_in_care ${latest}: ${error.message}`);
  return { latest, rows: (data ?? []) as CareRow[] };
}
