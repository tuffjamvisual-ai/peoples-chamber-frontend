// Deterministic process-note detector.
//
// Flag-only (NOT a stripper). The rewrite output should be article text only. If a
// process note, report, checklist or confirmation leaks in after the article, this
// warns the operator. It does not auto-remove, because distinguishing a leaked note
// from a legitimate word ("Summary", "---") is not safe to do by deletion.
//
// Note: in practice the observed process-note leakage came from the assistant's chat
// replies, not the Humaniser tool (whose prompt already forbids commentary). This is
// belt-and-braces. Runs for the rewrite modes, not diagnosis.

import type { HumaniserMode } from "./prompt";

const NOTE_PATTERNS: RegExp[] = [
  /preserved verbatim/i,
  /edits applied/i,
  /no facts changed/i,
  /rhythm[-\s]and[-\s]texture pass/i,
  /no separate fact[-\s]check/i,
  /the following was preserved/i,
  /^\s*output\s*:/i,
  /^\s*checklist\b/i,
  /^\s*summary\s*:/i,
  /^\s*changes made\b/i,
];

export interface ProcessNoteResult {
  hasProcessNote: boolean;
  notes: string[];
}
const EMPTY: ProcessNoteResult = { hasProcessNote: false, notes: [] };

export function detectProcessNotes(mode: HumaniserMode, output: string): ProcessNoteResult {
  if (mode === "diagnosis") return EMPTY;
  if (!output) return EMPTY;

  const lines = output.split("\n").map((l) => l.trim()).filter(Boolean);
  const notes: string[] = [];
  for (const line of lines) {
    if (NOTE_PATTERNS.some((re) => re.test(line)) && !notes.includes(line)) notes.push(line);
  }
  return { hasProcessNote: notes.length > 0, notes };
}
