// Blue Badges for council pages and /councils/blue-badges (council_blue_badges, migration 2026-10-28d; owner's
// decisions, 28 Oct 2026). Wording and figures in one place so the council block and the ranking page agree.
//   - Share of residents: held per 1,000 residents, calculated by Open Govt from DfT's figures and the population DfT
//     uses, shown as per cent.
//   - Change on the year: badges held at 31 March against the year before.
//   - A figure DfT shows as "[low]" is empty in the table and shown with DfT's own definition.
//   - From 2024 DfT rounds council figures to the nearest 100 (rounded_to), and the page says so.
//   - Lost or stolen badges: England only, on the ranking page (no council figures are published since 2021).

import { supabase } from '@/lib/supabase';

// DfT's own definition of "[low]", from the tables' shorthand line ("[low] = a low value but not a real zero").
export const LOW_DEFINITION = 'a low value but not a real zero';

export type BlueBadgeRow = {
  ons_code: string;
  area_name: string;
  area_level: 'england' | 'region' | 'council';
  year: string;
  held: number | null;
  held_automatic: number | null;
  held_discretionary: number | null;
  issued: number | null;
  held_per_1000_population: number | string | null;
  lost: number | null;
  stolen: number | null;
  low_fields: string[];
  rounded_to: number;
  source_url: string;
};

const COLS = 'ons_code, area_name, area_level, year, held, held_automatic, held_discretionary, issued, held_per_1000_population, lost, stolen, low_fields, rounded_to, source_url';

export const RANKING_PATH = '/councils/blue-badges';
export const LOW_TEXT = `${LOW_DEFINITION} (DfT)`;
export const ROUNDING_NOTE = 'DfT rounds council figures to the nearest 100, so they may not add up exactly to the figure for England.';
export const SHARE_NOTE = 'Share of residents is worked out by opengovt from DfT\'s figures and the population DfT uses.';

const num = (n: number) => n.toLocaleString('en-GB');
export const yearOf = (d: string) => Number(d.slice(0, 4));
export const asAt = (d: string) => `31 March ${yearOf(d)}`;
export const yearTo = (d: string) => `the year to March ${yearOf(d)}`;

// The release a year's figures come from, and the source line (owner's wording, 28 Oct 2026).
export function releaseFor(d: string): { label: string; url: string } {
  const y = yearOf(d);
  return {
    label: `Blue Badge scheme statistics, April ${y - 1} to March ${y}`,
    url: y === 2025
      ? 'https://www.gov.uk/government/statistics/blue-badge-scheme-statistics-april-2024-to-march-2025'
      : 'https://www.gov.uk/government/statistical-data-sets/blue-badge-scheme-statistics-data-tables-dis',
  };
}
export const OGL = 'Contains public sector information licensed under the Open Government Licence v3.0.';
export const OGL_URL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';

// A count, or DfT's "[low]" wording where the table has none for that reason.
export function count(row: BlueBadgeRow, field: 'held' | 'held_automatic' | 'held_discretionary' | 'issued'): string {
  const v = row[field];
  if (v != null) return num(v);
  return row.low_fields.includes(field) ? LOW_TEXT : 'not published';
}

export function sharePct(row: BlueBadgeRow | undefined): number | null {
  const v = row?.held_per_1000_population;
  return v == null ? null : Math.round(Number(v)) / 10;
}
export const shareText = (row: BlueBadgeRow | undefined) => {
  const p = sharePct(row);
  return p == null ? (row?.low_fields.includes('held') ? LOW_TEXT : 'not published') : `${p.toFixed(1)} per cent`;
};

// Badges held against the year before: the count and the percentage.
export function change(cur: BlueBadgeRow, prev: BlueBadgeRow | undefined): { pct: number; diff: number } | null {
  if (!prev || cur.held == null || prev.held == null || prev.held === 0) return null;
  const diff = cur.held - prev.held;
  return { diff, pct: Math.round((diff / prev.held) * 1000) / 10 };
}
export function changeText(cur: BlueBadgeRow, prev: BlueBadgeRow | undefined): string | null {
  const c = change(cur, prev);
  if (!c || !prev) return null;
  const when = `${asAt(prev.year)} (${num(prev.held!)})`;
  if (c.diff === 0) return `The same as at ${when}`;
  return `${c.diff > 0 ? 'Up' : 'Down'} ${num(Math.abs(c.diff))} (${Math.abs(c.pct).toFixed(1)} per cent) on ${when}`;
}
export const pctChangeText = (c: { pct: number } | null) => (c == null ? 'not published' : `${c.pct > 0 ? 'up ' : c.pct < 0 ? 'down ' : ''}${Math.abs(c.pct).toFixed(1)} per cent`);

export async function loadArea(code: string): Promise<BlueBadgeRow[]> {
  const { data, error } = await supabase.from('council_blue_badges').select(COLS).eq('ons_code', code).order('year', { ascending: false }).limit(20);
  if (error) throw new Error(`council_blue_badges ${code}: ${error.message}`);
  return (data ?? []) as BlueBadgeRow[];
}

// Every row for the latest year and the year before (England, regions and councils).
export async function loadLatestTwoYears(): Promise<{ latest: string | null; rows: BlueBadgeRow[] }> {
  const { data: top, error: topErr } = await supabase.from('council_blue_badges').select('year').eq('area_level', 'england').order('year', { ascending: false }).limit(1);
  if (topErr) throw new Error(`council_blue_badges latest year: ${topErr.message}`);
  const latest = (top?.[0]?.year as string | undefined) ?? null;
  if (!latest) return { latest: null, rows: [] };
  const prev = `${yearOf(latest) - 1}-03-31`;
  const { data, error } = await supabase.from('council_blue_badges').select(COLS).in('year', [latest, prev]).limit(1000);
  if (error) throw new Error(`council_blue_badges ${latest}: ${error.message}`);
  return { latest, rows: (data ?? []) as BlueBadgeRow[] };
}

// The newest England row with lost and stolen figures.
export async function loadEnglandLostStolen(): Promise<BlueBadgeRow | null> {
  const { data, error } = await supabase.from('council_blue_badges').select(COLS).eq('area_level', 'england').not('lost', 'is', null).order('year', { ascending: false }).limit(1);
  if (error) throw new Error(`council_blue_badges lost and stolen: ${error.message}`);
  return ((data ?? [])[0] as BlueBadgeRow | undefined) ?? null;
}
