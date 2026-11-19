// One matcher for the directory's pages (owner, Cowork ENTRY 383, 19 Nov 2026: typing 'youth crime' in the A to Z
// directory found nothing, though /councils/youth-justice exists). Used by 'Filter this list' on /directory and the
// section pages (app/directory/DirectoryFilter.tsx, in the browser) and by the 'Pages on opengovt' group on /search
// (lib/directory.ts searchDirectory), so both find the same pages for the same words.
//
// Rules: case, punctuation and accents do not matter ('Sinn Fein' finds Sinn Féin, 'MPs' finds "MP's"); a simple plural
// is the same word ('hmos' finds HMO, 'loans' finds loan); every word typed must be found, in any order, in the page's
// name, its other names, its keywords or its description: a whole word, or the start of one for a word of 3 or more
// letters ('pens' finds pensions), and in the filter as the reader types, the start of one for the last word however
// short ('yo' finds Youth Justice); small joining words ('the', 'of', 'in' ...) are not required. Pure: no database,
// no imports, so the browser can run it.

export type Matchable = {
  title: string;
  desc?: string | null;
  keywords?: readonly string[] | null;
  /** Other names for the same page (the directory's 'Listed as' entries); counted as the name. */
  alt?: readonly string[] | null;
};

// Words a reader adds that say nothing about the page. Dropped from what is typed unless nothing else is left.
const JOINING = new Set(['a', 'an', 'the', 'of', 'and', 'in', 'on', 'for', 'to', 'is', 'are', 'what', 'how', 'my', 'by', 'with', 'about', 'from', 'at', 'do', 'does', 'who', 'which', 'where']);

/** Lower case, accents folded, apostrophes dropped, any other mark a space, spaces collapsed. */
export function normalise(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘`&]/g, '') // apostrophes and '&' join: "MP's" is mps, 'A&E' is ae; 'Money & Power' is money power
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** A simple plural to its singular: parties -> party, taxes -> tax, houses -> house, hmos -> hmo, mps -> mp. */
export function fold(w: string): string {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (/(ches|shes|xes|sses|zes)$/.test(w)) return w.slice(0, -2);
  if (w.length >= 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

/** The words of a text, normalised and folded. */
export function wordsOf(s: string): string[] {
  const n = normalise(s);
  return n ? n.split(' ').map(fold) : [];
}

/** The words a reader typed that must be found: joining words dropped unless they are all there is. */
export function queryWords(q: string): string[] {
  const all = wordsOf(q);
  const kept = all.filter((w) => !JOINING.has(w));
  return kept.length ? kept : all;
}

const hasWordAt = (words: readonly string[], q: string, prefix: boolean) => words.some((w) => w === q || (prefix && w.startsWith(q)));
// The phrase at the start of a word: 'youth crime' in 'youth crime prevention', not in 'ayouth crime'.
const hasPhrase = (text: string, phrase: string) => (' ' + text).includes(' ' + phrase);

/**
 * How well a page matches what was typed: 0 for no match (some word not found anywhere), otherwise higher is better.
 * The name first (whole name 100, the name starts with or holds the phrase 90, every word in the name 80), then the
 * keywords (a keyword is the phrase 75, holds it 70, every word in the keywords 60, in the name and keywords together
 * 50), then the description (20).
 */
export function matchScore(e: Matchable, q: string, opts: { typing?: boolean } = {}): number {
  const qw = queryWords(q);
  if (!qw.length) return 0;
  // A word of 3 or more letters may be the start of a longer one; so may the last word while the reader is typing it.
  const terms = qw.map((w, i) => ({ w, pre: w.length >= 3 || (!!opts.typing && i === qw.length - 1) }));
  const all = (...lists: (readonly string[])[]) => terms.every((t) => lists.some((l) => hasWordAt(l, t.w, t.pre)));
  const names = [e.title, ...(e.alt ?? [])].map((t) => wordsOf(t));
  const kws = (e.keywords ?? []).map((k) => wordsOf(k));
  const desc = wordsOf(e.desc ?? '');
  const nameWords = names.flat();
  const kwWords = kws.flat();
  if (!all(nameWords, kwWords, desc)) return 0;
  const phrase = qw.join(' ');
  if (names.some((n) => n.join(' ') === phrase)) return 100;
  if (names.some((n) => hasPhrase(n.join(' '), phrase))) return 90;
  if (all(nameWords)) return 80;
  if (kws.some((k) => k.join(' ') === phrase)) return 75;
  if (kws.some((k) => hasPhrase(k.join(' '), phrase))) return 70;
  if (all(kwWords)) return 60;
  if (all(nameWords, kwWords)) return 50;
  return 20;
}

/** The pages that match, best first (then by name), at most `limit`. */
export function rankMatches<T extends Matchable>(entries: readonly T[], q: string, limit = Infinity): T[] {
  // A search of joining words only ('the', 'of') names no page.
  if (!wordsOf(q).some((w) => !JOINING.has(w))) return [];
  return entries
    .map((e) => ({ e, s: matchScore(e, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title, 'en-GB'))
    .slice(0, limit)
    .map((x) => x.e);
}
