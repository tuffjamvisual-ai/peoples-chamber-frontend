// Freedom of Information statistics (foi_statistics, migration 2026-10-20m; loaded by scripts/import-foi-statistics.js
// from the Cabinet Office's April to June 2026 release). Owner's decisions, 20 Oct 2026: counts as published, the
// 20-day percentage as published and rounded to a whole number, the change on the same quarter a year earlier in
// counts (a percentage only from a base of 20 or more), internal reviews and ICO complaints for the calendar year.
import { supabase } from './supabase';

// The source line names the release the table was loaded from (source_url, kept up to date by the weekly import).
export function foiSource(row: { period: string; source_url: string }): { label: string; url: string } {
  return { label: `Cabinet Office, Freedom of Information statistics, ${periodName(row.period)} (Accredited official statistics)`, url: row.source_url };
}
export const FOI_PAGE = '/transparency/freedom-of-information';

// Department page slug -> the FOI statistics' body name(s). The Business, Innovation, Science and Trade page shows
// DBT and DSIT separately: the statistics still report them as two bodies.
export const FOI_BODIES_BY_DEPT: Record<string, { body: string; label?: string }[]> = {
  'attorney-general': [{ body: "Attorney General's Office" }],
  'cabinet-office': [{ body: 'Cabinet Office' }],
  'business-trade': [
    { body: 'Department for Business and Trade', label: 'Department for Business and Trade (before the July 2026 merger)' },
    { body: 'Department for Science, Innovation and Technology', label: 'Department for Science, Innovation and Technology (before the July 2026 merger)' },
  ],
  culture: [{ body: 'Department for Culture, Media and Sport' }],
  defence: [{ body: 'Ministry of Defence' }],
  education: [{ body: 'Department for Education' }],
  energy: [{ body: 'Department for Energy Security and Net Zero' }],
  environment: [{ body: 'Department for Environment, Food and Rural Affairs' }],
  'foreign-office': [{ body: 'Foreign, Commonwealth and Development Office' }],
  health: [{ body: 'Department of Health and Social Care' }],
  'home-office': [{ body: 'Home Office' }],
  housing: [{ body: 'Ministry of Housing, Communities and Local Government' }],
  justice: [{ body: 'Ministry of Justice' }],
  'northern-ireland-office': [{ body: 'Northern Ireland Office' }],
  'scotland-office': [{ body: 'Scotland Office' }],
  transport: [{ body: 'Department for Transport' }],
  treasury: [{ body: 'HM Treasury' }],
  ukef: [{ body: 'UK Export Finance' }],
  'wales-office': [{ body: 'Wales Office' }],
  'work-pensions': [{ body: 'Department for Work and Pensions' }],
};

export type FoiRow = {
  body: string;
  period: string;
  period_year: number;
  period_quarter: number | null;
  received: number | null;
  received_ex: number | null;
  met_20_days: number | null;
  permitted_extension: number | null;
  late: number | null;
  pct_met_20_days: number | null;
  resolvable: number | null;
  granted_full: number | null;
  partially_withheld: number | null;
  fully_withheld: number | null;
  internal_reviews: number | null;
  ir_outcome_known: number | null;
  ir_upheld_full: number | null;
  ir_upheld_part: number | null;
  ir_overturned: number | null;
  ico_complaints: number | null;
  source_url: string;
};
const COLS = 'body, period, period_year, period_quarter, received, received_ex, met_20_days, permitted_extension, late, pct_met_20_days, resolvable, granted_full, partially_withheld, fully_withheld, internal_reviews, ir_outcome_known, ir_upheld_full, ir_upheld_part, ir_overturned, ico_complaints, source_url';

const QUARTER_NAMES = ['January to March', 'April to June', 'July to September', 'October to December'];
// "Q2 2026" -> "April to June 2026"; "2025" -> "2025".
export function periodName(period: string): string {
  const m = period.match(/^Q([1-4]) (\d{4})$/);
  return m ? `${QUARTER_NAMES[Number(m[1]) - 1]} ${m[2]}` : period;
}

// The latest quarter in the table, e.g. { period: 'Q2 2026', year: 2026, quarter: 2 }.
export async function latestFoiQuarter(): Promise<{ period: string; year: number; quarter: number } | null> {
  const { data, error: dataErr } = await supabase.from('foi_statistics').select('period, period_year, period_quarter')
    .not('period_quarter', 'is', null).order('period_year', { ascending: false }).order('period_quarter', { ascending: false }).limit(1).maybeSingle();
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`foi-statistics foi_statistics: ${dataErr.message}`);
  return data ? { period: data.period as string, year: data.period_year as number, quarter: data.period_quarter as number } : null;
}

export type DeptFoi = { body: string; label: string; latest: FoiRow; yearEarlier: FoiRow | null; annual: FoiRow | null };

// For a department page: each body's latest quarter, the same quarter a year earlier, and the latest calendar year
// before it (for internal reviews and ICO complaints, which are published for years only).
export async function getDeptFoi(slug: string): Promise<DeptFoi[]> {
  const bodies = FOI_BODIES_BY_DEPT[slug];
  if (!bodies) return [];
  const latest = await latestFoiQuarter();
  if (!latest) return [];
  const earlier = `Q${latest.quarter} ${latest.year - 1}`;
  const annual = String(latest.year - 1);
  const { data, error } = await supabase.from('foi_statistics').select(COLS)
    .in('body', bodies.map((b) => b.body)).in('period', [latest.period, earlier, annual]);
  // A failed read throws (owner's approval, 21 Oct 2026), so the department page keeps its last good version.
  if (error) throw new Error(`foi_statistics (department): ${error.message}`);
  if (!data) return [];
  const rows = data as FoiRow[];
  const pick = (body: string, period: string) => rows.find((r) => r.body === body && r.period === period) ?? null;
  return bodies.flatMap((b) => {
    const l = pick(b.body, latest.period);
    return l ? [{ body: b.body, label: b.label ?? b.body, latest: l, yearEarlier: pick(b.body, earlier), annual: pick(b.body, annual) }] : [];
  });
}

// For /transparency/freedom-of-information: every body in the latest quarter.
export async function getFoiLatestQuarter(): Promise<{ period: string; rows: FoiRow[] } | null> {
  const latest = await latestFoiQuarter();
  if (!latest) return null;
  const { data, error } = await supabase.from('foi_statistics').select(COLS).eq('period', latest.period).order('body');
  if (error) throw new Error(`foi_statistics (latest quarter): ${error.message}`);
  if (!data) return null;
  return { period: latest.period, rows: data as FoiRow[] };
}

// Body name -> our department page, for linking from the all-bodies table.
export const DEPT_BY_FOI_BODY: Record<string, string> = Object.fromEntries(
  Object.entries(FOI_BODIES_BY_DEPT).flatMap(([slug, bs]) => bs.map((b) => [b.body, slug])),
);
