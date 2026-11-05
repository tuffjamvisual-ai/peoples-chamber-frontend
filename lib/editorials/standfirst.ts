// Whether a report shows its stored standfirst (owner, 5 Nov 2026). It does not where the standfirst repeats the opening
// paragraph, so a reader never gets the same words twice in a row. Applies by itself to every new report.
//
// The rule: compare the standfirst with the first paragraph, ignoring spacing and curly or straight quotes. It repeats
// if one begins with the other, or if their first 300 characters are more than 60 per cent alike (Ratcliff-Obershelp,
// the measure in Python's difflib, below: twice the matching characters over the total length).
import type { Block } from './types';

const clean = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

// Python's difflib.SequenceMatcher, as used to mark the first 52 reports, including its rule for strings of 200 characters
// or more: a character in over 1 per cent of the second string cannot start a match, only extend one.
function longest(a: string, b: string, index: Map<string, number[]>, alo: number, ahi: number, blo: number, bhi: number): [number, number, number] {
  let bestI = alo, bestJ = blo, size = 0;
  let lengths = new Map<number, number>();
  for (let i = alo; i < ahi; i++) {
    const next = new Map<number, number>();
    for (const j of index.get(a[i]) ?? []) {
      if (j < blo) continue;
      if (j >= bhi) break;
      const k = (lengths.get(j - 1) ?? 0) + 1;
      next.set(j, k);
      if (k > size) { bestI = i - k + 1; bestJ = j - k + 1; size = k; }
    }
    lengths = next;
  }
  while (bestI > alo && bestJ > blo && a[bestI - 1] === b[bestJ - 1]) { bestI--; bestJ--; size++; }
  while (bestI + size < ahi && bestJ + size < bhi && a[bestI + size] === b[bestJ + size]) size++;
  return [bestI, bestJ, size];
}

function matching(a: string, b: string): number {
  const index = new Map<string, number[]>();
  [...Array(b.length).keys()].forEach((j) => { index.set(b[j], [...(index.get(b[j]) ?? []), j]); });
  if (b.length >= 200) {
    const limit = Math.floor(b.length / 100) + 1;
    for (const [c, at] of [...index]) if (at.length > limit) index.delete(c);
  }
  let total = 0;
  const queue: [number, number, number, number][] = [[0, a.length, 0, b.length]];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop()!;
    const [i, j, k] = longest(a, b, index, alo, ahi, blo, bhi);
    if (!k) continue;
    total += k;
    if (alo < i && blo < j) queue.push([alo, i, blo, j]);
    if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
  }
  return total;
}

export function similarity(a: string, b: string): number {
  const x = a.slice(0, 300), y = b.slice(0, 300);
  return x.length + y.length ? (2 * matching(x, y)) / (x.length + y.length) : 0;
}

export function standfirstRepeatsOpening(standfirst: string, body: Block[]): boolean {
  const first = body.find((b) => b.type === 'paragraph');
  if (!first || first.type !== 'paragraph') return false;
  const s = clean(standfirst), p = clean(first.text);
  if (!s || !p) return false;
  return s.startsWith(p) || p.startsWith(s) || similarity(s, p) > 0.6;
}
