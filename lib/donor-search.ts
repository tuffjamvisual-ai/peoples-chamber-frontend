// Donor name search (24 Oct 2026): every donor record held (political_donations), not only the top 200 on /donors.
// A donor matches when every word of the query appears in the name as registered with the Electoral Commission
// (case ignored). Results are grouped the way donor pages are: names that share a /donors/<slug> are one result,
// labelled with the most used spelling and counted across all of them. A result links only when that page exists
// (lib/donor-slug.ts donorPageSlug). Name matches only: no attempt is made to join different names for one donor.
import { supabase } from '@/lib/supabase';
import { donorNameToSlug, donorPageSlug } from '@/lib/donor-slug';
import { readAll } from '@/lib/read-all';

export type DonorNameResult = {
  name: string;          // the most used registered spelling for this donor page
  slug: string | null;   // /donors/<slug>, or null when that page would not find the donor
  records: number;       // donation records under the name(s) behind this page
};

export const DONOR_SEARCH_RESULTS = 50; // donor names returned (a ranked first page)

// Words of two characters or more; LIKE wildcards are escaped so they match literally.
function words(q: string): string[] {
  return q
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 6)
    .map((w) => w.replace(/[\\%_]/g, (c) => `\\${c}`));
}

// totalNames is the number of donor pages that match; more is true when the returned first page is shorter than that.
export async function searchDonorNames(q: string): Promise<{ results: DonorNameResult[]; more: boolean; totalNames: number }> {
  const ws = words(q);
  if (ws.length === 0) return { results: [], more: false, totalNames: 0 };
  // Every matching row (24 Oct 2026, report 36): a single read stopped at 1,000 rows in no order, so common words
  // ("Ltd", 6,787 rows) gave an arbitrary part of the names and understated record counts. lib/read-all.ts.
  const rows = await readAll<{ donor_name: string | null }>(() => supabase.from('political_donations'), {
    columns: 'id, donor_name',
    filter: (query) => ws.reduce((acc, w) => acc.ilike('donor_name', `%${w}%`), query.not('donor_name', 'is', null)),
    orderBy: 'id',
    label: 'donor search',
  });

  // Count each spelling, then group spellings by the donor page they share.
  const bySlug = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const name = (r.donor_name ?? '').trim();
    if (!name) continue;
    const key = donorNameToSlug(name) || `name:${name}`;
    const spellings = bySlug.get(key) ?? new Map<string, number>();
    spellings.set(name, (spellings.get(name) ?? 0) + 1);
    bySlug.set(key, spellings);
  }
  const all: DonorNameResult[] = [...bySlug.values()].map((spellings) => {
    const [name] = [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const records = [...spellings.values()].reduce((s, n) => s + n, 0);
    return { name, slug: donorPageSlug(name), records };
  });
  all.sort((a, b) => b.records - a.records || a.name.localeCompare(b.name, 'en-GB'));
  return { results: all.slice(0, DONOR_SEARCH_RESULTS), more: all.length > DONOR_SEARCH_RESULTS, totalNames: all.length };
}
