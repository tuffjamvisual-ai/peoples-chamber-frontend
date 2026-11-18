// Word matching for the /reports search (owner request 18 Nov 2026, Cowork ENTRY 304). Shared by the search index (server)
// and the search box (browser). Words are lower case, with accents taken off, split on anything that is not a letter or a
// digit. A typed word matches a word of the text when it is the start of it ('minist' finds 'ministers'). With typos on
// (the search's second try, when the words themselves find nothing: T2, 18 Nov 2026 16:07, 'water' found 77 pieces by
// 'later'), a typed word of 5 letters or more also matches when one letter differs (added, missing or changed) and the
// first letter is the same.
export function wordsOf(text: string): string[] {
  return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// At most one edit (insert, delete or change one letter) between a and b.
function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

export function wordMatches(typed: string, word: string, typos = false): boolean {
  if (word.startsWith(typed)) return true;
  if (!typos || typed.length < 5 || word[0] !== typed[0]) return false;
  // A typo in the part typed so far (the word's start of the same length, or one longer or shorter), or in the whole word.
  for (const n of [typed.length - 1, typed.length, typed.length + 1]) if (n > 0 && withinOne(typed, word.slice(0, n))) return true;
  return withinOne(typed, word);
}

export function anyWordMatches(typed: string, words: readonly string[], typos = false): boolean {
  for (const w of words) if (wordMatches(typed, w, typos)) return true;
  return false;
}

// One search over a list, the same everywhere (SEARCH-ALL, Cowork ENTRY 318 and 326): every typed word must match a word of
// the item (any order, word starts), the item's fields weighted (a match in the first field counts most); exact words first,
// and only if they find nothing a second try allowing one letter's typo. Returns the matching items, best first (equal
// scores keep the list's own order), and whether the typo try was used.
export type Fielded<T> = { item: T; fields: readonly (readonly string[])[] };
export function searchList<T>(list: readonly Fielded<T>[], query: string): { matches: T[]; typos: boolean } {
  const typed = wordsOf(query);
  if (!typed.length) return { matches: list.map((x) => x.item), typos: false };
  const run = (typos: boolean) => {
    const scored: [number, number][] = [];
    list.forEach((x, i) => {
      let score = 0;
      for (const t of typed) {
        const f = x.fields.findIndex((words) => anyWordMatches(t, words, typos));
        if (f < 0) return;
        score += x.fields.length - f;
      }
      scored.push([i, score]);
    });
    return scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([i]) => list[i].item);
  };
  const exact = run(false);
  if (exact.length) return { matches: exact, typos: false };
  return { matches: run(true), typos: true };
}

// The matched letters of a label, for bold in a suggestion: [text, matched] pieces.
export function markMatches(label: string, query: string): [string, boolean][] {
  const typed = wordsOf(query);
  if (!typed.length) return [[label, false]];
  const out: [string, boolean][] = [];
  const re = /[A-Za-z0-9À-ɏ]+|[^A-Za-z0-9À-ɏ]+/g;
  for (const m of label.match(re) ?? []) {
    const w = wordsOf(m)[0];
    const t = w ? typed.filter((x) => w.startsWith(x)).sort((a, b) => b.length - a.length)[0] : undefined;
    if (t) out.push([m.slice(0, t.length), true], [m.slice(t.length), false]);
    else out.push([m, false]);
  }
  return out.filter(([s]) => s);
}
