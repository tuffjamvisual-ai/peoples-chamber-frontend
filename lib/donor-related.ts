// "Other donor names that may be related" on /donors/<slug> (24 Oct 2026). The Electoral Commission records each donor
// under the name given on each report, so one person or company can have several donor pages. This finds the other
// pages whose name, normalised (lower case, titles and punctuation removed), starts and ends with the same word. It is a
// name similarity only, not a confirmed identity: nothing is merged or added up, and each page keeps its own records
// and totals.
import { supabase } from '@/lib/supabase';
import { donorNameToSlug, donorPageSlug } from '@/lib/donor-slug';
import { readAll } from '@/lib/read-all';
import { donorRegistry, type DonorPageEntry } from '@/lib/donor-registry';

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
  // Every candidate row (24 Oct 2026, report 36): a single read stopped at 1,000 rows, in no order, so for common name
  // pairs (6 over 1,000 rows, the largest 1,628) the list could miss names. lib/read-all.ts.
  const data = await readAll<{ donor_name: string | null }>(() => supabase.from('political_donations'), {
    columns: 'id, donor_name',
    filter: (q) => narrow.reduce((acc, w) => acc.ilike('donor_name', `%${w}%`), q.not('donor_name', 'is', null)),
    orderBy: 'id',
    label: 'related donor names',
  });
  const bySlug = new Map<string, Map<string, number>>();
  for (const r of data) {
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

// A donor page that is a minor spelling of a much larger one (owner's decision, 28 Oct 2026, Search Console: Google
// treated pages such as "Hong Kong Governement", 1 record, as near copies of "Hong Kong Government", 31). The small
// page keeps its records and stays open, but is not indexed, and links to the larger page. A minor spelling: the
// same first and last word (donorNameKey), or names that differ by one or two letters. The larger page must have at
// least 5 records and five times as many.
const SMALL_MAX = 2;
const LARGE_MIN = 5;

function editDistanceAtMost(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

export async function mainSpellingFor(slug: string): Promise<RelatedDonorName | null> {
  const { bySlug } = await donorRegistry();
  const own = bySlug.get(slug);
  if (!own || own.records > SMALL_MAX) return null;
  const ownWords = normalisedDonorWords(own.label).join(' ');
  if (ownWords.length < 8) return null;
  const ownKey = donorNameKey(own.label);
  let best: { e: DonorPageEntry; records: number } | null = null;
  for (const e of bySlug.values()) {
    if (e.slug === slug || e.records < Math.max(LARGE_MIN, own.records * 5)) continue;
    const words = normalisedDonorWords(e.label).join(' ');
    const similar = (ownKey != null && donorNameKey(e.label) === ownKey) || (words.slice(0, 3) === ownWords.slice(0, 3) && editDistanceAtMost(ownWords, words, 2));
    if (similar && (!best || e.records > best.records)) best = { e, records: e.records };
  }
  return best ? { name: best.e.label, slug: best.e.slug } : null;
}
