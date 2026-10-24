// Donor name search (24 Oct 2026): every donor record held (political_donations), not only the top 200 on /donors.
// A donor matches when every word of the query appears in the name as registered with the Electoral Commission
// (case ignored). Results are grouped the way donor pages are: names that share a /donors/<slug> are one result,
// labelled with the most used spelling and counted across all of them. A result links only when that page exists
// (lib/donor-slug.ts donorPageSlug). Name matches only: no attempt is made to join different names for one donor.
import { supabase } from '@/lib/supabase';
import { donorNameToSlug, donorPageSlug } from '@/lib/donor-slug';

export type DonorNameResult = {
  name: string;          // the most used registered spelling for this donor page
  slug: string | null;   // /donors/<slug>, or null when that page would not find the donor
  records: number;       // donation records under the name(s) behind this page
};

export const DONOR_SEARCH_ROWS = 5000; // donation rows read per search
export const DONOR_SEARCH_RESULTS = 50; // donor names returned

// Words of two characters or more; LIKE wildcards are escaped so they match literally.
function words(q: string): string[] {
  return q
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 6)
    .map((w) => w.replace(/[\\%_]/g, (c) => `\\${c}`));
}

export async function searchDonorNames(q: string): Promise<{ results: DonorNameResult[]; more: boolean }> {
  const ws = words(q);
  if (ws.length === 0) return { results: [], more: false };
  let query = supabase.from('political_donations').select('donor_name').not('donor_name', 'is', null);
  for (const w of ws) query = query.ilike('donor_name', `%${w}%`);
  const { data, error } = await query.limit(DONOR_SEARCH_ROWS);
  if (error) throw new Error(`donor search: ${error.message}`);
  const rows = (data ?? []) as { donor_name: string | null }[];

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
  return { results: all.slice(0, DONOR_SEARCH_RESULTS), more: all.length > DONOR_SEARCH_RESULTS || rows.length >= DONOR_SEARCH_ROWS };
}
