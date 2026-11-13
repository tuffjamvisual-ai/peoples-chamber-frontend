// Donor name matching without database reads (moved from lib/donor-related.ts on 13 Nov 2026 for T1-SITEMAP (c), so the
// sitemap and unit tests can use the same rules as the donor pages). lib/donor-related.ts imports these.
import type { DonorPageEntry } from '@/lib/donor-registry';

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


// The minor spelling thresholds (see mainSpellingFor in lib/donor-related.ts).
export const SMALL_MAX = 2;
export const LARGE_MIN = 5;

export function editDistanceAtMost(a: string, b: string, max: number): boolean {
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

// Every donor page that is a minor spelling of a larger one (T1-SITEMAP (c), Cowork 13 Nov 2026): the slugs for which
// mainSpellingFor would return a page, worked out for all pages at once for the sitemap (which lists only main
// spellings: a minor spelling's page is noindex). The same rule as mainSpellingFor, comparing each small page only with
// the large pages (LARGE_MIN records or more) instead of every page.
export function minorSpellingSlugs(entries: Iterable<DonorPageEntry>): Set<string> {
  const all = [...entries];
  const large = all.filter((e) => e.records >= LARGE_MIN).map((e) => ({ e, words: normalisedDonorWords(e.label).join(' '), key: donorNameKey(e.label) }));
  const minor = new Set<string>();
  for (const own of all) {
    if (own.records > SMALL_MAX) continue;
    const ownWords = normalisedDonorWords(own.label).join(' ');
    if (ownWords.length < 8) continue;
    const ownKey = donorNameKey(own.label);
    const floor = Math.max(LARGE_MIN, own.records * 5);
    for (const l of large) {
      if (l.e.slug === own.slug || l.e.records < floor) continue;
      if ((ownKey != null && l.key === ownKey) || (l.words.slice(0, 3) === ownWords.slice(0, 3) && editDistanceAtMost(ownWords, l.words, 2))) { minor.add(own.slug); break; }
    }
  }
  return minor;
}
