// Deterministic approximation-hedge checker.
//
// A mechanical tripwire, not a rewriter. It compares the SOURCE input against the
// generated OUTPUT. If the source attached an approximation hedge to a figure
// (e.g. "around 10,000", "Roughly two thirds", "up to £10,000", "an estimated
// £1.6 billion") and the output repeats that same figure without the hedge or an
// equivalent hedge nearby, it flags the drop for operator review. It NEVER edits,
// deletes or rewrites the text.
//
// Runs for the rewrite modes (cleaner, tabloid, safer). Not for diagnosis, which
// may quote source/output issues as part of its critique.
//
// Built after Tabloid mode twice shaved a softener off a figure: "around 10,000"
// -> "10,000" and "Roughly two thirds" -> "Two thirds". The number survived both
// times; the certainty level did not.

import type { HumaniserMode } from "./prompt";

// Equivalence groups. A dropped hedge is only flagged if NO member of its own group
// sits next to the same figure in the output.
const HEDGE_GROUPS: string[][] = [
  ["around", "roughly", "about", "approximately"],
  ["an estimated", "estimated"],
  ["up to", "as much as", "as many as"],
  ["more than", "over", "at least"],
  ["less than", "under"],
  ["nearly", "almost"],
];

// Longest first so multi-word hedges ("an estimated", "up to") match before their
// substrings.
const HEDGE_TERMS = HEDGE_GROUPS.flat().sort((a, b) => b.length - a.length);

function groupOf(hedge: string): string[] {
  const h = hedge.toLowerCase();
  for (const g of HEDGE_GROUPS) if (g.includes(h)) return g;
  return [h];
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A figure is money/number (with an optional scale word or "per cent") or a word
// fraction. Bare number words ("two", "three") are deliberately excluded to keep the
// checker quiet.
const NUM = String.raw`£?\d[\d,]*(?:\.\d+)?(?:\s+(?:billion|million|thousand|hundred|per cent|percent))?`;
const FRAC = String.raw`(?:one|two|three|four|five|a)\s+(?:thirds?|quarters?|halves|fifths?|third|quarter|half)`;
const FIGURE = `(?:${NUM}|${FRAC})`;
const HEDGE_ALT = HEDGE_TERMS.map(esc).join("|");
const PAIR_RE = new RegExp(String.raw`\b(${HEDGE_ALT})\s+(${FIGURE})`, "gi");

export interface DroppedHedge {
  sourcePhrase: string;
  outputLine: string;
  figure: string;
  missingHedge: string;
}
export interface ApproxHedgeResult {
  hasDroppedHedge: boolean;
  drops: DroppedHedge[];
}
const EMPTY: ApproxHedgeResult = { hasDroppedHedge: false, drops: [] };

const WINDOW = 30;

function figureRegex(fig: string): RegExp {
  const body = esc(fig.trim()).replace(/\s+/g, "\\s+");
  return new RegExp(String.raw`(?<!\d)${body}(?!\d)`, "gi");
}

export function detectDroppedHedges(mode: HumaniserMode, source: string, output: string): ApproxHedgeResult {
  if (mode === "diagnosis") return EMPTY;
  if (!source || !output) return EMPTY;

  const srcNorm = source.replace(/\s+/g, " ");
  const seen = new Set<string>();
  const drops: DroppedHedge[] = [];

  PAIR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAIR_RE.exec(srcNorm)) !== null) {
    const hedge = m[1].trim();
    const figure = m[2].trim();
    const key = (hedge + "|" + figure).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const group = groupOf(hedge);
    const figRe = figureRegex(figure);
    let anyOccurrence = false;
    let anyHedged = false;
    let unhedgedLine = "";

    figRe.lastIndex = 0;
    let fm: RegExpExecArray | null;
    while ((fm = figRe.exec(output)) !== null) {
      anyOccurrence = true;
      const idx = fm.index;
      const win = output.slice(Math.max(0, idx - WINDOW), idx);
      const hedged = group.some((t) => new RegExp(String.raw`\b${esc(t)}\b`, "i").test(win));
      if (hedged) { anyHedged = true; break; }
      if (!unhedgedLine) {
        const lineStart = output.lastIndexOf("\n", idx) + 1;
        let lineEnd = output.indexOf("\n", idx);
        if (lineEnd === -1) lineEnd = output.length;
        unhedgedLine = output.slice(lineStart, lineEnd).trim();
      }
      if (figRe.lastIndex === fm.index) figRe.lastIndex++;
    }

    if (anyOccurrence && !anyHedged) {
      drops.push({ sourcePhrase: `${hedge} ${figure}`, outputLine: unhedgedLine, figure, missingHedge: hedge });
    }
  }

  return { hasDroppedHedge: drops.length > 0, drops };
}
