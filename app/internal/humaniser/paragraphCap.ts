// Deterministic post-generation paragraph validator for Mode 2 (More tabloid version).
//
// This is a FORMATTER ONLY. It never edits language. It counts sentence-ending
// units per paragraph and, where a paragraph holds more than three, inserts
// paragraph breaks so no paragraph exceeds three units. It preserves the exact
// text of every unit: no rewording, no hedge removal, no quote or number changes,
// no merging of sentences, no new wording. It only cuts paragraphs where the model
// refused to.
//
// It runs for Mode 2 only. Modes 1, 3 and 4 pass through untouched.

import type { HumaniserMode } from "./prompt";

const MAX_UNITS_PER_PARAGRAPH = 3;

const TERMINATORS = new Set([".", "?", "!"]);
const CLOSERS = new Set(['"', "'", "”", "’", ")", "]"]);
// A following unit legitimately starts with a capital, a digit, an opening quote,
// a bracket, or a currency mark. Used to avoid splitting inside things like "U.S.".
const NEXT_UNIT_START = /[A-Z0-9"'“‘(£$]/;

// Split a single paragraph into sentence-ending units. A unit ends at a run of
// terminators (. ? !) plus any trailing closing quotes/brackets, but only when the
// next non-space character clearly begins a new unit (or the paragraph ends). This
// keeps decimals ("3.5") and dotted abbreviations from being split.
export function splitSentenceUnits(paragraph: string): string[] {
  const s = paragraph;
  const units: string[] = [];
  let start = 0;
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    if (TERMINATORS.has(ch)) {
      // Do not split a decimal number: digit '.' digit.
      if (ch === "." && i > 0 && /\d/.test(s[i - 1]) && i + 1 < s.length && /\d/.test(s[i + 1])) {
        i++;
        continue;
      }
      // Consume consecutive terminators (e.g. "?!" or "...").
      let j = i + 1;
      while (j < s.length && TERMINATORS.has(s[j])) j++;
      // Consume trailing closers (quotes, brackets).
      while (j < s.length && CLOSERS.has(s[j])) j++;
      // Skip whitespace to find the next non-space character.
      let k = j;
      while (k < s.length && /\s/.test(s[k])) k++;
      const atEnd = k >= s.length;
      const hadSpace = k > j;
      if (atEnd || (hadSpace && NEXT_UNIT_START.test(s[k]))) {
        const unit = s.slice(start, j).trim();
        if (unit) units.push(unit);
        start = k;
        i = k;
        continue;
      }
    }
    i++;
  }

  const tail = s.slice(start).trim();
  if (tail) units.push(tail);
  return units;
}

// Enforce the three-unit cap across every paragraph in the text. Paragraphs are
// blank-line separated. Any paragraph with more than three units is chunked into
// consecutive paragraphs of at most three units each (so 4 -> 3+1, 5 -> 3+2).
export function capParagraphs(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const out: string[] = [];
  for (const para of paragraphs) {
    const units = splitSentenceUnits(para);
    if (units.length <= MAX_UNITS_PER_PARAGRAPH) {
      out.push(para);
      continue;
    }
    for (let idx = 0; idx < units.length; idx += MAX_UNITS_PER_PARAGRAPH) {
      out.push(units.slice(idx, idx + MAX_UNITS_PER_PARAGRAPH).join(" "));
    }
  }
  return out.join("\n\n");
}

// Mode gate: only More tabloid version is formatted. Everything else is returned
// exactly as given.
export function capTabloidOutput(mode: HumaniserMode, text: string): string {
  if (mode !== "tabloid") return text;
  return capParagraphs(text);
}
