// Voice & Rhythm Quality Pass.
//
// Advisory, warning-only. This is NOT a detector-evasion tool and NOT a safety rail.
// It flags copy that reads as too neat, too symmetrical or too machine-shaped, and
// suggests an editorial direction. It never rewrites, never mutates, and never
// removes factual caution. A human editor decides what to do with each flag.
//
// Runs for the rewrite modes (cleaner, tabloid, safer). Not for diagnosis, whose
// output is a critique rather than an article.

import type { HumaniserMode } from "./prompt";

export interface VoiceIssue {
  type: string;
  label: string;
  lines: string[];
  reason: string;
  suggestion: string;
}
export interface VoiceRhythmResult {
  hasIssue: boolean;
  issues: VoiceIssue[];
}
const EMPTY: VoiceRhythmResult = { hasIssue: false, issues: [] };

function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}
function sentenceCount(s: string): number {
  return (s.match(/[.?!]+["'”’)\]]*(?=\s|$)/g) || []).length || 1;
}
const DATELINE = /^(by\s|\d)|·/i;

// Small, curated list of stock column phrasing. Deliberately short: this is about
// distinctive voice, not another sprawling banned-word list.
const CLICHES = [
  "said the quiet part out loud",
  "the quiet part out loud",
  "the people least heard",
  "make no mistake",
  "let that sink in",
  "the elephant in the room",
  "at the end of the day",
  "when all is said and done",
  "the harsh reality",
  "the uncomfortable truth",
  "begs the question",
  "the writing is on the wall",
  "a perfect storm",
  "the bottom line is",
  "speaks volumes",
];

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detectVoiceRhythmIssues(mode: HumaniserMode, output: string): VoiceRhythmResult {
  // Article-structure checks do not apply to a short Reddit reply.
  if (mode === "diagnosis" || mode === "reddit") return EMPTY;
  if (!output) return EMPTY;

  const paras = paragraphs(output);
  if (paras.length < 4) return EMPTY;
  const body = paras.slice(1); // skip headline / standfirst
  const issues: VoiceIssue[] = [];

  // A. Too many one-line verdict paragraphs.
  const oneLiners = body.filter((p) => !DATELINE.test(p) && sentenceCount(p) === 1 && wordCount(p) <= 10);
  if (oneLiners.length >= 4) {
    issues.push({
      type: "one-line-verdicts",
      label: "Too many one-line verdict paragraphs",
      lines: oneLiners,
      reason: `${oneLiners.length} paragraphs are single short verdict lines. A stack of neat landing strips reads as assembled from a kit rather than written.`,
      suggestion: "Keep the one or two strongest as standalone beats; merge the rest into the surrounding paragraphs.",
    });
  }

  // B. Short punch lines stacked back to back.
  const shortFlags = body.map((p) => sentenceCount(p) === 1 && wordCount(p) <= 12 && !DATELINE.test(p));
  let run: string[] = [];
  let bestRun: string[] = [];
  for (let i = 0; i < body.length; i++) {
    if (shortFlags[i]) run.push(body[i]);
    else { if (run.length > bestRun.length) bestRun = run; run = []; }
  }
  if (run.length > bestRun.length) bestRun = run;
  if (bestRun.length >= 3) {
    issues.push({
      type: "stacked-punchlines",
      label: "Short punch lines stacked together",
      lines: bestRun,
      reason: `${bestRun.length} short standalone lines run back to back, giving a staccato, over-staged rhythm.`,
      suggestion: "Fold one or two into a fuller paragraph so the beats do not arrive in a mechanical sequence.",
    });
  }

  // C. Repeated pivot openers.
  for (const pivot of ["But", "That", "This"]) {
    const starters = body.filter((p) => new RegExp(`^${pivot}\\b`, "i").test(p));
    if (starters.length >= 3) {
      issues.push({
        type: "pivot-openers",
        label: `Repeated "${pivot}" pivot`,
        lines: starters.map((p) => p.split(/(?<=[.?!])\s/)[0]),
        reason: `${starters.length} paragraphs open with "${pivot}", leaning on the same argumentative turn each time.`,
        suggestion: "Vary the movement; let some paragraphs continue the argument without announcing the pivot.",
      });
    }
  }

  // D. Paragraph rhythm too regular (a long run of equal sentence counts).
  let regVal = -1;
  let regLen = 0;
  let regBestLen = 0;
  let regStart = 0;
  let regBestStart = 0;
  for (let i = 0; i < body.length; i++) {
    const sc = sentenceCount(body[i]);
    if (sc === regVal) regLen++;
    else { regVal = sc; regLen = 1; regStart = i; }
    if (regLen > regBestLen) { regBestLen = regLen; regBestStart = regStart; }
  }
  if (regBestLen >= 4) {
    issues.push({
      type: "regular-rhythm",
      label: "Paragraph rhythm too regular",
      lines: body.slice(regBestStart, regBestStart + regBestLen).map((p) => (p.length > 60 ? p.slice(0, 57) + "..." : p)),
      reason: `${regBestLen} consecutive paragraphs share the same sentence count, so the piece marches at one pace.`,
      suggestion: "Vary paragraph length deliberately: mix a longer paragraph in among the short ones.",
    });
  }

  // E. Generic column phrases / clichés.
  const clicheLines: string[] = [];
  const found = new Set<string>();
  for (const p of body) {
    for (const c of CLICHES) {
      if (new RegExp(`\\b${esc(c)}\\b`, "i").test(p)) {
        found.add(c);
        if (!clicheLines.includes(p)) clicheLines.push(p);
      }
    }
  }
  if (clicheLines.length) {
    issues.push({
      type: "generic-phrases",
      label: "Generic column phrase or cliché",
      lines: clicheLines,
      reason: `Contains stock column phrasing (${[...found].map((c) => `"${c}"`).join(", ")}) that reads as familiar rather than distinctive.`,
      suggestion: "Replace with specific, concrete wording particular to this story.",
    });
  }

  // F. Slogan-like final line.
  const last = body[body.length - 1];
  if (last && sentenceCount(last) === 1 && wordCount(last) <= 6 && !DATELINE.test(last)) {
    issues.push({
      type: "slogan-ending",
      label: "Ending too slogan-like",
      lines: [last],
      reason: "The piece closes on a very short standalone line, which reads as theatrical sloganeering.",
      suggestion: "Attach it to the preceding sentence, or close on a concrete fact rather than a slogan.",
    });
  }

  return { hasIssue: issues.length > 0, issues };
}
