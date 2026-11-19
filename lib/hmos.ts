// Houses in multiple occupation for council pages and /councils/hmos (council_hmos, migration 2026-11-19a; owner approved
// 19 Nov 2026, Cowork ENTRY 362). Wording in one place so the council section and the national page agree. House style:
// sentences say "per cent", cards and table cells keep %; a figure not published reads "No figure published", never 0.
import { tagDb, COUNCIL_DATA_TAG } from '@/lib/page-reads';
import { readAll } from '@/lib/read-all';
import type { HmoRow } from '@/lib/hmo-text';

export * from '@/lib/hmo-text';

const COLS = 'ons_code, area_name, nation, area_level, region, year, estimated, known, licensable, licensed, mandatory_licences, additional_licences, homes, homes_year, symbols, predecessors, notes, source_url';

/** Rows for these councils (a county passes its districts), every year, newest first. */
export async function loadAreas(codes: string[]): Promise<HmoRow[]> {
  if (!codes.length) return [];
  const { data, error } = await tagDb([COUNCIL_DATA_TAG]).from('council_hmos').select(COLS).in('ons_code', codes).order('year', { ascending: false }).limit(2000);
  if (error) throw new Error(`council_hmos ${codes.join(',')}: ${error.message}`);
  return (data ?? []) as HmoRow[];
}

/** The latest year of each nation, every council and the nation's own row. */
export async function loadLatest(): Promise<{ rows: HmoRow[]; years: Record<string, string> }> {
  const db = tagDb([COUNCIL_DATA_TAG]);
  const all = await readAll<HmoRow>(() => db.from('council_hmos'), {
    columns: COLS,
    filter: (q) => q.gte('year', '2024-03-31'),
    orderBy: [{ column: 'ons_code' }, { column: 'year' }],
  });
  const years: Record<string, string> = {};
  for (const r of all) if (r.area_level === 'nation' && (!years[r.nation] || r.year > years[r.nation])) years[r.nation] = r.year;
  return { rows: all.filter((r) => r.year === years[r.nation]), years };
}
