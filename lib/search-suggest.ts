// "Did you mean" on /search (owner's live audit, 8 Nov 2026, item 4, SR1). Pure: no database here. Only when a search
// returns nothing, at most one corrected query is offered, built only from words in our own titles (bills, MPs and
// reports; lib/search-vocabulary.ts), and it is a link, never run by itself. Cautious on purpose:
//   - a word already in our titles is kept as it is;
//   - an unknown word is replaced only by a known word with the same first letter, at most one edit away (two for words
//     of six letters or more), where swapping two letters next to each other is one edit ("Finanec" -> "Finance");
//   - among equal distances the word used most often in our titles wins, then the alphabetically first;
//   - if any word cannot be matched, or nothing changes, there is no suggestion.
// No database extension (such as pg_trgm) is needed.

export type Vocabulary = Map<string, number>; // word -> how often it appears in our titles

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu;
export const words = (s: string): string[] => (s.match(WORD) ?? []).map((w) => w.toLowerCase().replace(/’/g, "'"));

export function buildVocabulary(titles: Iterable<string>): Vocabulary {
  const v: Vocabulary = new Map();
  for (const t of titles) for (const w of words(t)) if (w.length >= 2) v.set(w, (v.get(w) ?? 0) + 1);
  return v;
}

// Optimal string alignment distance (Damerau–Levenshtein with adjacent swaps), stopping early past `max`.
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

function correctWord(w: string, vocab: Vocabulary): string | null {
  if (vocab.has(w)) return w;
  if (w.length < 3 || /\d/.test(w)) return null;
  const max = w.length >= 6 ? 2 : 1;
  let best: { word: string; dist: number; count: number } | null = null;
  for (const [cand, count] of vocab) {
    if (cand[0] !== w[0] || Math.abs(cand.length - w.length) > max) continue;
    const dist = editDistance(w, cand, max);
    if (dist > max) continue;
    if (!best || dist < best.dist || (dist === best.dist && (count > best.count || (count === best.count && cand < best.word)))) best = { word: cand, dist, count };
  }
  return best?.word ?? null;
}

// The reader's word in the reader's case: "Finanec" -> "Finance", "FINANEC" -> "FINANCE".
const inCaseOf = (orig: string, word: string) =>
  orig === orig.toUpperCase() && orig.length > 1 ? word.toUpperCase() : orig[0] === orig[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word;

// One corrected query, or null.
export function suggestQuery(q: string, vocab: Vocabulary): string | null {
  const parts = q.trim().split(/\s+/).filter(Boolean);
  if (!parts.length || parts.length > 8) return null;
  let changed = false;
  const out: string[] = [];
  for (const part of parts) {
    const ws = words(part);
    if (ws.length !== 1 || part.toLowerCase().replace(/’/g, "'") !== ws[0]) {
      // Punctuation or several words run together: keep it only if every word in it is known.
      if (!ws.length || ws.some((w) => !vocab.has(w))) return null;
      out.push(part);
      continue;
    }
    const fixed = correctWord(ws[0], vocab);
    if (!fixed) return null;
    if (fixed !== ws[0]) changed = true;
    out.push(fixed === ws[0] ? part : inCaseOf(part, fixed));
  }
  return changed ? out.join(' ') : null;
}
