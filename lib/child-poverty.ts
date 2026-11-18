// Child poverty for council pages and /councils/child-poverty (council_child_poverty: DWP Children in Low Income
// Families, local area statistics; migration 2026-10-11f). Wording and sums in one place so the council section and the
// ranking page agree (owner approved 18 Nov 2026, Cowork ENTRY 317).
// County councils have no rows of their own: their figures are summed from their districts. Each district's child
// population is count / percentage, so a summed percentage is weighted correctly, never averaged.
import { tagDb, COUNCIL_DATA_TAG } from '@/lib/page-reads';

export type PovertyRow = { council_gss_code: string; measure: string; fye: number; children_count: number; percentage: number | null; release_label: string };
export type Figure = { count: number; pct: number | null };

export const RANKING_PATH = '/councils/child-poverty';
// Years before 2021 to 2022 are not comparable (DWP), so changes are measured from that year.
export const FIRST_COMPARABLE_FYE = 2022;

// "2024 to 2025" (house style, T1-5x).
export const fyLabel = (fye: number) => `${fye - 1} to ${fye}`;
export const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');
export const fmtPct = (p: number | null) => (p == null ? 'n/a' : `${p.toFixed(1)}%`);

// What the figure counts, as on the council section's "About these figures" fold.
export const EXPLAINER =
  'A child is counted if their family’s income is below 60 per cent of the UK median for that year and the family claimed Child Benefit plus at least one other benefit (Universal Credit, tax credits or Housing Benefit). The two measures can differ a lot: housing costs push the figure after housing costs far higher in expensive areas such as London. Figures are provisional and years before 2021/22 are not comparable, so the trend starts there.';
export const sourceLine = (release: string) =>
  `Source: Department for Work and Pensions, Children in Low Income Families: local area statistics (${release}).`;
export const SOURCE_PAGE = 'https://www.gov.uk/government/collections/children-in-low-income-families-local-area-statistics';
export const SOURCE_LABEL = 'Department for Work and Pensions, Children in Low Income Families: local area statistics';

// Sum one measure and year across the given councils. Null if any council is missing that figure, so a county total is
// never silently partial.
export function combine(rows: PovertyRow[], codes: string[], measure: string, fye: number): Figure | null {
  let count = 0, pop = 0, popKnown = true;
  for (const code of codes) {
    const r = rows.find((x) => x.council_gss_code === code && x.measure === measure && x.fye === fye);
    if (!r) return null;
    count += r.children_count;
    if (r.percentage && r.percentage > 0) pop += r.children_count / (r.percentage / 100);
    else popKnown = false;
  }
  return { count, pct: popKnown && pop > 0 ? (count / pop) * 100 : null };
}

// Every council's rows for the two relative measures in the given years (361 councils; read a measure and year at a
// time so no read passes the 1,000 row limit).
export async function loadAllCouncils(years: number[]): Promise<PovertyRow[]> {
  const reads = ['relative_ahc', 'relative_bhc'].flatMap((m) => years.map((y) => ({ m, y })));
  const out = await Promise.all(reads.map(async ({ m, y }) => {
    const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('council_child_poverty')
      .select('council_gss_code, measure, fye, children_count, percentage, release_label').eq('measure', m).eq('fye', y).limit(1000);
    if (error) throw new Error(`council_child_poverty ${m} ${y}: ${error.message}`);
    return (data ?? []) as PovertyRow[];
  }));
  return out.flat();
}

// The latest year held.
export async function loadLatestYear(): Promise<number | null> {
  const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('council_child_poverty').select('fye').eq('measure', 'relative_ahc').order('fye', { ascending: false }).limit(1);
  if (error) throw new Error(`council_child_poverty latest: ${error.message}`);
  return (data?.[0]?.fye as number | undefined) ?? null;
}
