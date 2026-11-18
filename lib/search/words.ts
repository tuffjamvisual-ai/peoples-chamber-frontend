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
