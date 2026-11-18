// Free school meals for council pages, MP pages and /councils/free-school-meals (area_free_school_meals, migration
// 2026-11-18a, loaded from the DfE statistics API; owner approved 18 Nov 2026, Cowork ENTRY 303). Wording and figures in
// one place so every page agrees. England beside each figure. A figure DfE does not give is 'not published', never 0
// (T2: 'took a meal' is not published for alternative provision from 2021/22). Constituency figures exist for 2024/25
// and 2025/26 only (the new boundaries) and do not add up to England (DfE leaves out pupils it cannot place).
import { tagDb, COUNCIL_DATA_TAG } from '@/lib/page-reads';

export type FsmRow = {
  area_code: string; area_name: string; area_level: 'england' | 'region' | 'council' | 'constituency'; academic_year: string;
  school_type: 'total' | 'primary' | 'secondary' | 'special' | 'alternative_provision' | 'nursery' | 'non_maintained_special';
  pupils: number | null; fsm_eligible: number | null; fsm_eligible_pct: number | string | null; fsm_taking_meal: number | null;
};
const COLS = 'area_code, area_name, area_level, academic_year, school_type, pupils, fsm_eligible, fsm_eligible_pct, fsm_taking_meal';

export const RANKING_PATH = '/councils/free-school-meals';
export const SOURCE_PAGE = 'https://explore-education-statistics.service.gov.uk/find-statistics/school-pupils-and-their-characteristics';
export const SOURCE_LABEL = 'Department for Education, Schools, pupils and their characteristics (January school census), statistics API';
export const OGL = 'Contains public sector information licensed under the Open Government Licence v3.0.';
export const OGL_URL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';
export const ENGLAND = 'E92000001';
export const FIRST_YEAR = '2015/16';

const num = (n: number) => n.toLocaleString('en-GB');
// '2025/26' is the January 2026 census.
export const censusLabel = (ay: string) => `January ${Number(ay.slice(0, 4)) + 1}`;
export const pct = (r: FsmRow | undefined): number | null => (r?.fsm_eligible_pct == null ? null : Math.round(Number(r.fsm_eligible_pct) * 10) / 10);
export const pctText = (r: FsmRow | undefined) => (pct(r) == null ? 'not published' : `${pct(r)!.toFixed(1)} per cent`);
export const count = (v: number | null | undefined) => (v == null ? 'not published' : num(v));
// Eligible pupils who took a free meal on census day, as a share of those eligible.
export const tookShare = (r: FsmRow | undefined): number | null =>
  r?.fsm_taking_meal == null || !r.fsm_eligible ? null : Math.round((r.fsm_taking_meal / r.fsm_eligible) * 1000) / 10;
export function changeText(cur: FsmRow | undefined, before: FsmRow | undefined): string | null {
  const a = pct(cur), b = pct(before);
  if (a == null || b == null || !before) return null;
  const d = Math.round((a - b) * 10) / 10;
  const when = `${censusLabel(before.academic_year)} (${b.toFixed(1)} per cent)`;
  return d === 0 ? `the same as ${when}` : `${d > 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(1)} percentage points on ${when}`;
}

// The change since an earlier year, said once: 'up 11.6 percentage points, from 16.4 per cent'.
export function sinceText(cur: FsmRow | undefined, before: FsmRow | undefined): string | null {
  const a = pct(cur), b = pct(before);
  if (a == null || b == null) return null;
  const d = Math.round((a - b) * 10) / 10;
  return d === 0 ? `no change, ${b.toFixed(1)} per cent then` : `${d > 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(1)} percentage points, from ${b.toFixed(1)} per cent`;
}

export const EXPLAINER = [
  'A pupil is counted as eligible for free school meals when the school has recorded that a parent or carer has claimed them and qualifies, mainly through a low income or certain benefits. Eligibility is recorded in the January school census; some eligible pupils do not take a meal, and DfE also counts how many eligible pupils took one on census day.',
  'The figures cover pupils in state funded nursery, primary, secondary, special and alternative provision schools and non maintained special schools. Pupils in infant classes get a free meal whatever their family income; they are counted as eligible only when they also qualify on income (DfE).',
];

// Every row for one area and England, all years and school types.
export async function loadArea(code: string): Promise<FsmRow[]> {
  const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('area_free_school_meals').select(COLS).in('area_code', [code, ENGLAND]).limit(200);
  if (error) throw new Error(`area_free_school_meals ${code}: ${error.message}`);
  return (data ?? []) as FsmRow[];
}

// Councils (and England) for the latest year and the year before, school type total, for the ranking page.
export async function loadCouncilsLatest(): Promise<{ latest: string | null; prev: string | null; rows: FsmRow[] }> {
  const { data: top, error: topErr } = await tagDb([COUNCIL_DATA_TAG]).from('area_free_school_meals').select('academic_year').eq('area_level', 'england').order('academic_year', { ascending: false }).limit(2);
  if (topErr) throw new Error(`area_free_school_meals latest year: ${topErr.message}`);
  const years = [...new Set((top ?? []).map((r) => r.academic_year as string))];
  const latest = years[0] ?? null;
  if (!latest) return { latest: null, prev: null, rows: [] };
  const y = Number(latest.slice(0, 4)) - 1;
  const prev = `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
  const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('area_free_school_meals').select(COLS).in('area_level', ['council', 'england']).in('academic_year', [latest, prev, FIRST_YEAR]).eq('school_type', 'total').limit(1000);
  if (error) throw new Error(`area_free_school_meals ${latest}: ${error.message}`);
  return { latest, prev, rows: (data ?? []) as FsmRow[] };
}

// One area's figures, ready to show: the latest year, the year before, 2015/16, primary and secondary, and England's.
export function summarise(rows: FsmRow[], code: string) {
  const own = rows.filter((r) => r.area_code === code && r.school_type === 'total').sort((a, b) => b.academic_year.localeCompare(a.academic_year));
  const cur = own[0];
  if (!cur) return null;
  const y = Number(cur.academic_year.slice(0, 4)) - 1;
  const prevYear = `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
  const at = (c: string, ay: string, t: FsmRow['school_type'] = 'total') => rows.find((r) => r.area_code === c && r.academic_year === ay && r.school_type === t);
  return {
    cur, prev: at(code, prevYear), first: at(code, FIRST_YEAR),
    primary: at(code, cur.academic_year, 'primary'), secondary: at(code, cur.academic_year, 'secondary'),
    eng: at(ENGLAND, cur.academic_year), engPrimary: at(ENGLAND, cur.academic_year, 'primary'), engSecondary: at(ENGLAND, cur.academic_year, 'secondary'),
  };
}
