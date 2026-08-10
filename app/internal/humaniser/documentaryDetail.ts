// Documentary-detail preservation warning.
//
// Flag-only. Some pieces are files, not arguments: they carry a reporting trail of
// dates, figures, section numbers, URLs, named regulators, named documents, quotes,
// denials and right-of-reply lines. A tabloid rewrite must not smooth that trail into
// a clean essay. This check extracts the documentary anchors present in the SOURCE and
// warns if the OUTPUT drops too many of them. It never edits the text.
//
// Activates only when the source is document-heavy (>= 6 distinct anchors), so ordinary
// argument pieces (which carry few anchors) do not trip it. Runs for the rewrite modes
// cleaner / tabloid / safer; not diagnosis, and not reddit (a reply intentionally drops
// most of the source).

import type { HumaniserMode } from "./prompt";

export interface DocTrailResult {
  hasWeakenedTrail: boolean;
  totalAnchors: number;
  keptAnchors: number;
  droppedAnchors: string[];
  legallySensitive: boolean;
}
const EMPTY: DocTrailResult = { hasWeakenedTrail: false, totalAnchors: 0, keptAnchors: 0, droppedAnchors: [], legallySensitive: false };

// Markers that make a piece legally sensitive: allegations, standards, investigations,
// money/misconduct, resignations, legal findings. On these, the check activates at a
// lower anchor threshold (a thin sensitive piece is the danger).
const SENSITIVE_RE = /\b(alleg\w+|inquiry|investigation|misconduct|resign\w*|breach\w*|fraud\w*|donation|donor|standards|watchdog|regulator|tribunal|convicted|charged|guilty|corrupt\w*|undeclared|conflict of interest|commissioner|police)\b/i;

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";

// Named bodies / outlets worth treating as anchors when present.
const NAMED = [
  "Companies House",
  "Electoral Commission",
  "Standards Commissioner",
  "Parliamentary Commissioner for Standards",
  "Land Registry",
  "Bureau of Investigative Journalism",
  "Ofsted",
  "Ofcom",
  "HMRC",
  "the Times",
  "the Guardian",
  "Reuters",
  "register of interests",
  "Register of Members' Financial Interests",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractAnchors(text: string): string[] {
  const found = new Set<string>();
  const add = (s: string) => {
    const t = s.trim().toLowerCase().replace(/[.,;:]+$/, "").replace(/\s+/g, " ");
    if (t) found.add(t);
  };
  const grab = (re: RegExp) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      add(m[0]);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  };

  grab(/£\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:billion|million|thousand|bn|m|k))?/gi); // money
  grab(/\b\d[\d,]*(?:\.\d+)?\s*per cent\b/gi); // percentages
  grab(new RegExp(String.raw`\b\d{1,2}\s+(?:${MONTHS})(?:\s+\d{4})?\b`, "gi")); // day month (year)
  grab(new RegExp(String.raw`\b(?:${MONTHS})\s+\d{4}\b`, "gi")); // month year
  grab(/\b(?:19|20)\d{2}\b/g); // years
  grab(/\b(?:section|clause|paragraph|article)\s+\d+\b/gi); // section numbers
  grab(/https?:\/\/\S+|www\.\S+/gi); // URLs
  grab(/\b(?:[A-Z][a-z]+\s+){1,4}(?:Commission|Commissioner|Committee|Authority|Register|Inquiry|Tribunal|Ombudsman|Act|Bill|Report|Review)\b/g); // named bodies/docs
  grab(/\b(?:denies|denied|disputes|disputed|declined to comment|no findings have been made|baseless|spokesperson|right of reply)\b/gi); // right of reply
  grab(/\b(?:found to have|breached|convicted|charged|guilty|cleared|no case to answer|upheld|dismissed the)\b/gi); // official findings
  grab(/\b(?:high court|crown court|the court|tribunal|police|watchdog|regulator|the register)\b/gi); // courts / watchdogs
  grab(/\b(?:filed|registered|declared|tabled|referred|opened an inquiry)\b/gi); // procedural

  // quotes (>= 6 chars of content)
  let q: RegExpExecArray | null;
  const qre = /"([^"]{6,})"|“([^”]{6,})”/g;
  while ((q = qre.exec(text)) !== null) add((q[1] || q[2]).slice(0, 60));

  for (const n of NAMED) {
    if (new RegExp(`\\b${escapeRegExp(n)}\\b`, "i").test(text)) add(n);
  }

  return [...found];
}

export function detectWeakenedTrail(mode: HumaniserMode, source: string, output: string): DocTrailResult {
  if (mode === "diagnosis" || mode === "reddit") return EMPTY;
  if (!source || !output) return EMPTY;

  const anchors = extractAnchors(source);
  const legallySensitive = SENSITIVE_RE.test(source);
  // Files activate at 6+ anchors; legally-sensitive pieces activate at 3+ (a thin
  // sensitive rewrite is the danger the receipts advisory guards against).
  if (anchors.length < 6 && !(legallySensitive && anchors.length >= 3)) return EMPTY;

  const outNorm = output.toLowerCase().replace(/\s+/g, " ");
  const dropped = anchors.filter((a) => !outNorm.includes(a));
  const kept = anchors.length - dropped.length;

  return {
    legallySensitive,
    hasWeakenedTrail: dropped.length / anchors.length > 0.4,
    totalAnchors: anchors.length,
    keptAnchors: kept,
    droppedAnchors: dropped,
  };
}
