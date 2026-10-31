// Links between Commons divisions (owner, 31 Oct 2026): every division page reachable by plain links Google can follow.
// Search Console listed most of the 2,406 division pages as "discovered, not indexed": they were known only from the
// sitemap, 30 to 49 list pages deep, and no page linked one division to another. These reads feed the year archives
// (/divisions/year/<yyyy>), the "More votes" block on each division page and the bill pages' list of their votes.
// Every read uses an index: commons_divisions_fts and commons_division_totals on (date, number), mp_division_votes on
// bill_id. No full-table reads.
import { supabase } from '@/lib/supabase';

export type DivisionRef = { date: string; number: number; title: string };
export type YearDivision = DivisionRef & { ayes: number | null; noes: number | null };

// The address of a division page, in the full form the page serves (the short form redirects to it).
export const divisionHref = (date: string, number: number) => `/divisions/pw-${date.slice(0, 10)}-${number}-commons`;
export const yearHref = (year: number, page = 1) => (page > 1 ? `/divisions/year/${year}?page=${page}` : `/divisions/year/${year}`);

const ref = (r: { division_date_only: string; division_number: number; division_title: string | null }): DivisionRef => ({
  date: String(r.division_date_only).slice(0, 10),
  number: r.division_number,
  title: r.division_title || `Division ${r.division_number}`,
});

// The years that have divisions, oldest first: the first and last division's years, then every year between that has
// at least one (one indexed count per year, 11 years today).
export async function divisionYears(): Promise<number[]> {
  const [first, last] = await Promise.all([
    supabase.from('commons_divisions_fts').select('division_date_only').order('division_date_only', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('commons_divisions_fts').select('division_date_only').order('division_date_only', { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const r of [first, last]) if (r.error) throw new Error(`division years: ${r.error.message}`);
  if (!first.data || !last.data) return [];
  const from = Number(String(first.data.division_date_only).slice(0, 4));
  const to = Number(String(last.data.division_date_only).slice(0, 4));
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const counts = await Promise.all(years.map((y) => yearCount(y)));
  return years.filter((_, i) => counts[i] > 0);
}

// How many divisions a year has (one indexed count).
export async function yearCount(year: number): Promise<number> {
  const { count, error } = await supabase.from('commons_divisions_fts').select('division_number', { count: 'exact', head: true })
    .gte('division_date_only', `${year}-01-01`).lte('division_date_only', `${year}-12-31`);
  if (error) throw new Error(`division count ${year}: ${error.message}`);
  return count ?? 0;
}

// One page of a year's divisions, newest first, with their Aye and No totals (commons_division_totals, the figures the
// division page shows).
export async function yearDivisions(year: number, page: number, perPage: number): Promise<{ rows: YearDivision[]; total: number }> {
  const from = (page - 1) * perPage;
  const { data, count, error } = await supabase.from('commons_divisions_fts')
    .select('division_date_only, division_number, division_title', { count: 'exact' })
    .gte('division_date_only', `${year}-01-01`).lte('division_date_only', `${year}-12-31`)
    .order('division_date_only', { ascending: false }).order('division_number', { ascending: false })
    .range(from, from + perPage - 1);
  // PGRST103: a page past the end; the caller shows the last page instead.
  if (error && error.code !== 'PGRST103') throw new Error(`divisions in ${year}: ${error.message}`);
  const rows = ((data ?? []) as { division_date_only: string; division_number: number; division_title: string | null }[]).map(ref);
  // Past the last page there are no rows and no count: count the year on its own, so the page can show the last page.
  if (!rows.length) return { rows: [], total: count ?? (await yearCount(year)) };
  const newest = rows[0].date, oldest = rows[rows.length - 1].date;
  const { data: totals, error: tErr } = await supabase.from('commons_division_totals')
    .select('division_date, division_number, aye_count, no_count')
    .gte('division_date', oldest).lte('division_date', newest);
  if (tErr) throw new Error(`division totals ${year}: ${tErr.message}`);
  const byKey = new Map(((totals ?? []) as { division_date: string; division_number: number; aye_count: number | null; no_count: number | null }[])
    .map((t) => [`${String(t.division_date).slice(0, 10)}-${t.division_number}`, t]));
  return {
    rows: rows.map((r) => { const t = byKey.get(`${r.date}-${r.number}`); return { ...r, ayes: t?.aye_count ?? null, noes: t?.no_count ?? null }; }),
    total: count ?? 0,
  };
}

// The divisions around one: the one before and after (by date, then number), and up to 10 others on the same day.
export async function divisionNeighbours(date: string, number: number): Promise<{ previous: DivisionRef | null; next: DivisionRef | null; sameDay: DivisionRef[] }> {
  const cols = 'division_date_only, division_number, division_title';
  const [prev, next, day] = await Promise.all([
    supabase.from('commons_divisions_fts').select(cols)
      .or(`division_date_only.lt.${date},and(division_date_only.eq.${date},division_number.lt.${number})`)
      .order('division_date_only', { ascending: false }).order('division_number', { ascending: false }).limit(1),
    supabase.from('commons_divisions_fts').select(cols)
      .or(`division_date_only.gt.${date},and(division_date_only.eq.${date},division_number.gt.${number})`)
      .order('division_date_only', { ascending: true }).order('division_number', { ascending: true }).limit(1),
    supabase.from('commons_divisions_fts').select(cols)
      .eq('division_date_only', date).neq('division_number', number)
      .order('division_number', { ascending: true }).limit(10),
  ]);
  for (const r of [prev, next, day]) if (r.error) throw new Error(`division ${date}/${number} neighbours: ${r.error.message}`);
  type Row = { division_date_only: string; division_number: number; division_title: string | null };
  return {
    previous: prev.data?.[0] ? ref(prev.data[0] as Row) : null,
    next: next.data?.[0] ? ref(next.data[0] as Row) : null,
    sameDay: ((day.data ?? []) as Row[]).map(ref),
  };
}

// The Commons divisions matched to a bill (mp_division_votes.bill_id), oldest first. The vote rows are one per MP, so
// up to 2,000 are read and reduced to their divisions (71 divisions have a bill today, one bill each).
export async function billDivisions(billId: number): Promise<DivisionRef[]> {
  const { data, error } = await supabase.from('mp_division_votes')
    .select('division_date_only, division_number, division_title')
    .eq('bill_id', billId).not('division_date_only', 'is', null).not('division_number', 'is', null)
    .range(0, 1999);
  if (error) throw new Error(`bill ${billId} divisions: ${error.message}`);
  const seen = new Map<string, DivisionRef>();
  for (const r of (data ?? []) as { division_date_only: string; division_number: number; division_title: string | null }[]) {
    const d = ref(r);
    if (!seen.has(`${d.date}-${d.number}`)) seen.set(`${d.date}-${d.number}`, d);
  }
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number);
}
