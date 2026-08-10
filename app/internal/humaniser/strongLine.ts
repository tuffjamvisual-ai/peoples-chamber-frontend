// Deterministic strong-line preservation check.
//
// Flag-only, conservative. Looks for distinctive short standalone lines in the SOURCE
// (a single sentence, 3 to 11 words, its own paragraph, not a headline / dateline /
// figure line) and warns if the OUTPUT drops them entirely. It does not judge style
// and does not auto-restore. Runs for the rewrite modes, not diagnosis.

import type { HumaniserMode } from "./prompt";

export interface RemovedLine {
  line: string;
  nearest: string;
}
export interface StrongLineResult {
  hasRemovedStrongLine: boolean;
  removed: RemovedLine[];
}
const EMPTY: StrongLineResult = { hasRemovedStrongLine: false, removed: [] };

function norm(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}
function contentWords(s: string): string[] {
  return norm(s).split(" ").filter(Boolean);
}

// Headline / dateline / byline style lines are excluded.
const DATELINE = /^(by\s|\d)|·/i;

export function detectRemovedStrongLines(mode: HumaniserMode, source: string, output: string): StrongLineResult {
  // Reddit replies intentionally drop most of the source; this check would only add noise.
  if (mode === "diagnosis" || mode === "reddit") return EMPTY;
  if (!source || !output) return EMPTY;

  const srcParas = source.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const outParas = output.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const outNorm = norm(output);

  const removed: RemovedLine[] = [];
  srcParas.forEach((para, idx) => {
    if (idx === 0) return; // skip headline / standfirst
    const wc = contentWords(para);
    const sentences = (para.match(/[.?!]+/g) || []).length;
    if (wc.length < 3 || wc.length >= 10) return; // only distinctive short lines (verdict lines run short)
    if (sentences > 1) return; // single standalone line only
    if (DATELINE.test(para)) return; // not a dateline / byline
    const digitish = wc.filter((t) => /\d/.test(t)).length;
    if (digitish > wc.length / 2) return; // not a mostly-figure line
    if (outNorm.includes(norm(para))) return; // preserved exactly

    let best = "";
    let bestScore = 0;
    for (const op of outParas) {
      const ow = new Set(contentWords(op));
      const overlap = wc.filter((t) => ow.has(t)).length / wc.length;
      if (overlap > bestScore) {
        bestScore = overlap;
        best = op;
      }
    }
    removed.push({ line: para, nearest: bestScore >= 0.5 ? best : "not found" });
  });

  return { hasRemovedStrongLine: removed.length > 0, removed };
}
