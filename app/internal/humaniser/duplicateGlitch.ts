// Deterministic duplicate / generation-glitch detector.
//
// Flag-only. Finds a repeated word sequence (8 words or longer) that appears twice
// in the output, the signature of a paste-loop / generation glitch (e.g. a sentence
// repeated inside the same paragraph). Extends each repeat to its maximal length so
// one long duplicate is reported once, not as many overlapping fragments. Never
// edits the text. Runs for the rewrite modes, not diagnosis.

import type { HumaniserMode } from "./prompt";

const MIN_NGRAM = 8;

export interface Duplicate {
  phrase: string;
  count: number;
}
export interface DuplicateResult {
  hasDuplicate: boolean;
  duplicates: Duplicate[];
}
const EMPTY: DuplicateResult = { hasDuplicate: false, duplicates: [] };

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
}

export function detectDuplicates(mode: HumaniserMode, output: string): DuplicateResult {
  if (mode === "diagnosis") return EMPTY;
  if (!output) return EMPTY;

  const w = tokenize(output);
  if (w.length < MIN_NGRAM * 2) return EMPTY;

  // Map every 8-gram to the positions where it starts.
  const positions = new Map<string, number[]>();
  for (let i = 0; i + MIN_NGRAM <= w.length; i++) {
    const key = w.slice(i, i + MIN_NGRAM).join(" ");
    const arr = positions.get(key);
    if (arr) arr.push(i);
    else positions.set(key, [i]);
  }

  // Keep 8-grams that recur non-overlapping, ordered by first position.
  const repeatedKeys: string[] = [];
  for (const [key, idxs] of positions) {
    let last = -Infinity;
    let n = 0;
    for (const idx of idxs) {
      if (idx - last >= MIN_NGRAM) {
        n++;
        last = idx;
      }
    }
    if (n >= 2) repeatedKeys.push(key);
  }
  if (!repeatedKeys.length) return EMPTY;
  repeatedKeys.sort((a, b) => positions.get(a)![0] - positions.get(b)![0]);

  const used: [number, number][] = [];
  const duplicates: Duplicate[] = [];
  for (const key of repeatedKeys) {
    const idxs = positions.get(key)!.filter((x, i, a) => i === 0 || x - a[i - 1] >= MIN_NGRAM);
    if (idxs.length < 2) continue;
    const p1 = idxs[0];
    const p2 = idxs[1];
    if (used.some(([s, e]) => p1 >= s && p1 < e)) continue;
    // extend forward while the two runs stay identical (and do not overlap)
    let len = MIN_NGRAM;
    while (p1 + len < p2 && p2 + len < w.length && w[p1 + len] === w[p2 + len]) len++;
    duplicates.push({ phrase: w.slice(p1, p1 + len).join(" "), count: idxs.length });
    used.push([p1, p1 + len], [p2, p2 + len]);
  }

  return { hasDuplicate: duplicates.length > 0, duplicates: duplicates.slice(0, 5) };
}
