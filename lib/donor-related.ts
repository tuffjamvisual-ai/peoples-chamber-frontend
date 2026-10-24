// "Other donor names that may be related" on /donors/<slug> (24 Oct 2026). The Electoral Commission records each donor
// under the name given on each report, so one person or company can have several donor pages. This finds the other
// pages whose name, normalised (lower case, titles and punctuation removed), starts and ends with the same word. It is a
// name similarity only, not a confirmed identity: nothing is merged or added up, and each page keeps its own records
// and totals.
import { supabase } from '@/lib/supabase';
import { donorNameToSlug, donorPageSlug } from '@/lib/donor-slug';

// Personal titles removed before comparing names.
const TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'sir', 'lord', 'lady', 'dame', 'baroness', 'baron', 'rt', 'hon', 'prof']);

// Lower case, punctuation removed, titles removed; the words that remain.
export function normalisedDonorWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/['’‘]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !TITLES.has(w));
}

// Words that say what kind of body a donor is, not who: a name that starts or ends with one of them ("The ... Ltd",
// "... Labour Group", "The ... Club") would be paired with unrelated organisations, so it gets no similar names.
const GENERIC_WORDS = new Set([
  'the', 'and', 'of', 'ltd', 'limited', 'plc', 'llp', 'llc', 'inc', 'co', 'company', 'group', 'holdings', 'holding',
  'club', 'foundation', 'trust', 'trustees', 'branch', 'association', 'society', 'council', 'union', 'party', 'fund',
  'uk', 'international', 'partnership', 'partners', 'services', 'service', 'federation', 'committee', 'campaign',
]);

// "first|last" of the normalised name, or null when the name gives no usable pair: nothing left, a first or last word
// of one character (an initial), or a generic word (above).
export function donorNameKey(name: string): string | null {
  const w = normalisedDonorWords(name);
  if (w.length === 0) return null;
  const first = w[0], last = w[w.length - 1];
  if (first.length < 2 || last.length < 2 || GENERIC_WORDS.has(first) || GENERIC_WORDS.has(last)) return null;
  return `${first}|${last}`;
}

export type RelatedDonorName = { name: string; slug: string };

// Other donor pages whose normalised name shares the first and last word with this one. Each linked page exists
// (donorPageSlug); the current page and repeats of one page are left out. Read only.
export async function relatedDonorNames(name: string, ownSlug: string): Promise<RelatedDonorName[]> {
  const key = donorNameKey(name);
  if (!key) return [];
  const [first, last] = key.split('|');
  // Narrow the database read with the key's words (two letters or more), then compare the key exactly.
  const narrow = [...new Set([first, last])].filter((w) => w.length >= 2);
  if (narrow.length === 0) return [];
  let q = supabase.from('political_donations').select('donor_name').not('donor_name', 'is', null);
  for (const w of narrow) q = q.ilike('donor_name', `%${w}%`);
  const { data, error } = await q.limit(3000);
  if (error) throw new Error(`related donor names: ${error.message}`);
  const bySlug = new Map<string, Map<string, number>>();
  for (const r of (data ?? []) as { donor_name: string | null }[]) {
    const n = (r.donor_name ?? '').trim();
    if (!n || donorNameKey(n) !== key) continue;
    const s = donorNameToSlug(n);
    if (!s || s === ownSlug) continue;
    const spellings = bySlug.get(s) ?? new Map<string, number>();
    spellings.set(n, (spellings.get(n) ?? 0) + 1);
    bySlug.set(s, spellings);
  }
  const out: RelatedDonorName[] = [];
  for (const spellings of bySlug.values()) {
    const [label] = [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const slug = donorPageSlug(label);
    if (slug && slug !== ownSlug) out.push({ name: label, slug });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
}
