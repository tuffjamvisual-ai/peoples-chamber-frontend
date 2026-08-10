// Deterministic imputed-knowledge / intent detector.
//
// A mechanical tripwire, not a rewriter. It scans rewrite-mode output for a closed
// set of phrases that impute knowledge, awareness, motive or intent, and flags them
// for the operator. It NEVER edits, deletes or rewrites the text. It runs for the
// rewrite modes (cleaner, tabloid, safer). It does NOT run for diagnosis, which may
// legitimately quote problematic language as part of its critique.
//
// A prompt rule alone kept letting "the government knows this" slip back in. This
// catches it every time.

import type { HumaniserMode } from "./prompt";

// Case-insensitive, whole-word matching. Multi-word phrases match as a unit. Single
// words use word boundaries so "knowingly" does not match "unknowingly".
export const IMPUTED_KNOWLEDGE_PHRASES: string[] = [
  "knows this",
  "knew this",
  "knew it",
  "knows it",
  "knew what",
  "knows what",
  "doing it anyway",
  "did it anyway",
  "went ahead anyway",
  "pressed ahead anyway",
  "deliberately",
  "knowingly",
  "was aware",
  "were aware",
  "is aware",
  "are aware",
  "must have known",
  "could not have failed to know",
  "chose to",
  "chose not to",
  "decided to ignore",
  "ignored the warning",
  "ignored warnings",
  "turned a blind eye",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PATTERNS: { phrase: string; re: RegExp }[] = IMPUTED_KNOWLEDGE_PHRASES.map((phrase) => ({
  phrase,
  re: new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i"),
}));

// "intended to" is handled separately: it only imputes intent when an ACTOR is the
// subject ("ministers intended to", "he intended to"), not when a thing states its
// purpose ("a deal intended to unlock up to £50 billion"). Only fire on the actor case.
const INTENT_RE = /\b(?:he|she|they|we|i|ministers?|minister|government|officials?|official|department|council|board)\s+intend(?:ed|s)\s+to\b/i;

export interface ImputedKnowledgeResult {
  hasImputedKnowledgeRisk: boolean;
  flaggedPhrases: string[];
  flaggedLines: string[];
}

const EMPTY: ImputedKnowledgeResult = {
  hasImputedKnowledgeRisk: false,
  flaggedPhrases: [],
  flaggedLines: [],
};

// Scan the final generated output (run this after any paragraph formatting).
// Returns which banned phrases matched and which lines/paragraphs contain them.
export function detectImputedKnowledge(mode: HumaniserMode, text: string): ImputedKnowledgeResult {
  if (mode === "diagnosis") return EMPTY;
  if (!text) return EMPTY;

  const flaggedPhrases: string[] = [];
  const flaggedLines: string[] = [];

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    for (const { phrase, re } of PATTERNS) {
      if (re.test(line)) {
        if (!flaggedPhrases.includes(phrase)) flaggedPhrases.push(phrase);
        if (!flaggedLines.includes(line)) flaggedLines.push(line);
      }
    }
    const intent = line.match(INTENT_RE);
    if (intent) {
      const ph = intent[0].toLowerCase().replace(/\s+/g, " ");
      if (!flaggedPhrases.includes(ph)) flaggedPhrases.push(ph);
      if (!flaggedLines.includes(line)) flaggedLines.push(line);
    }
  }

  return {
    hasImputedKnowledgeRisk: flaggedPhrases.length > 0,
    flaggedPhrases,
    flaggedLines,
  };
}
