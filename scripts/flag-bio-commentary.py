#!/usr/bin/env python3
"""Flag likely commentary (as opposed to checkable fact) in MP biographies.

Reads a JSONL export of biographies (one object per line with id, name, party,
bio), splits each biography into sentences and flags sentences that show signs
of commentary. It does not change anything; it writes a report for a person to
review. Pattern matching cannot judge meaning, so expect some misses and some
false flags.

Usage:
  python3 scripts/flag-bio-commentary.py bios.jsonl --limit 5 --out report.md
  python3 scripts/flag-bio-commentary.py bios.jsonl --ids 39,172 --out report.md
"""
import argparse, json, re, sys

EVALUATIVE = r"""effective(ly)?|ineffective|capable|competent|incompetent|able|skil(l)?ful(ly)?|adept|astute|shrewd|
formidable|impressive|remarkabl[ey]|notabl[ey]|prominent|high profile|influential|powerful|
successful(ly)?|unsuccessful|failed|failure|achievement|best|worst|strongest|weakest|
controversial|divisive|polari[sz]ing|outspoken|combative|abrasive|loyal|loyalist|maverick|
principled|opportunis(t|tic)|pragmatic|ambitious|charismatic|energetic|diligent|hardworking|
assured|sure footed|robust(ly)?|forceful(ly)?|passionate(ly)?|tireless(ly)?|dogged(ly)?|
significant(ly)?|substantial|considerable|major|key|leading|important|crucial|vital|
striking(ly)?|telling(ly)?|ironic(ally)?|curious(ly)?|unusual(ly)?|rare(ly)?|genuine(ly)?|
clear(ly)?|obvious(ly)?|undoubted(ly)?|certainly|simply|merely|only|even|still"""
HEDGE = r"""widely (seen|regarded|viewed|considered|credited)|seen as|regarded as|viewed as|considered (to be|a)|
known (as|for)|reputation|arguabl[ey]|perhaps|possibly|seems?|appears? to|apparently|
critics (say|said|argue)|some (say|argue|have)|many (see|regard|consider)"""
VERDICT = r"""best work|record is that of|creature of|defining|legacy|hallmark|trademark|
in short|in the end|ultimately|above all|what matters|the result (is|was)|the record shows|
the old school|of the old school|in many ways"""
STALE = r"\b(currently|now|to date|so far|at present|presently|these days|this parliament|recently|latest)\b"
PREDICT = r"\b(likely to|unlikely to|may (well )?(prove|become|face|struggle)|could (prove|become|face)|will (be|face|need)|is set to|is expected to|future|prospects?)\b"
MONTHS = r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\b"

def rx(s):
    return re.compile(r"\b(" + re.sub(r"\s*\n\s*", "", s) + r")\b", re.I)

CHECKS = [
    ("evaluative word", rx(EVALUATIVE)),
    ("hedge or reputation claim", rx(HEDGE)),
    ("verdict phrasing", rx(VERDICT)),
    ("stale time word", re.compile(STALE, re.I)),
    ("prediction", re.compile(PREDICT, re.I)),
]
# Weak words only count when they are not part of a plain factual phrase.
WEAK = {"only", "even", "still", "key", "major", "leading", "able", "best", "clear", "clearly", "simply", "rare", "rarely"}

ABBREV = re.compile(r"\b(Sir|Dame|Mr|Mrs|Ms|Dr|Prof|St|Rt|Hon|Lt|Col|Gen|No|vs|e\.g|i\.e|etc)\.$", re.I)

def sentences(text):
    out = []
    for para in re.split(r"\n\s*\n", text.strip()):
        buf = ""
        for part in re.split(r"(?<=[.!?])\s+(?=[A-Z\"'‘“(])", para.strip()):
            buf = f"{buf} {part}".strip() if buf else part
            if ABBREV.search(buf):
                continue
            out.append(buf)
            buf = ""
        if buf:
            out.append(buf)
    return out

def strip_quotes(s):
    # Words inside quotation marks are someone else's, not our commentary.
    return re.sub(r"[\"“][^\"”]*[\"”]|‘[^’]*’", " ", s)

def flag(sentence):
    plain = strip_quotes(sentence)
    reasons = []
    for label, pat in CHECKS:
        hits = sorted({m.group(0).lower() for m in pat.finditer(plain)})
        if label == "evaluative word":
            strong = [h for h in hits if h not in WEAK]
            weak = [h for h in hits if h in WEAK]
            if strong or len(weak) >= 2:
                reasons.append(f"{label}: {', '.join(strong + weak)}")
        elif hits:
            reasons.append(f"{label}: {', '.join(hits)}")
    has_anchor = re.search(r"\d", plain) or re.search(MONTHS, plain)
    words = len(plain.split())
    if words <= 8 and not has_anchor:
        reasons.append("short verdict style sentence")
    if reasons and not has_anchor:
        reasons.append("no date or figure to check it against")
    return reasons

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("export")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--ids", default="")
    ap.add_argument("--out", default="-")
    a = ap.parse_args()
    want = {int(x) for x in a.ids.split(",") if x.strip()}
    rows = [json.loads(l) for l in open(a.export) if l.strip()]
    rows = [r for r in rows if r.get("bio")]
    if want:
        rows = [r for r in rows if int(r["id"]) in want]
    if a.limit:
        rows = rows[: a.limit]

    lines = ["# Likely commentary in MP biographies", "",
             "Flags only. Nothing has been changed. A flag means \"check this sentence\", not \"this is wrong\".", ""]
    total_s = total_f = 0
    for r in rows:
        ss = sentences(r["bio"])
        flagged = [(s, flag(s)) for s in ss]
        flagged = [(s, f) for s, f in flagged if f]
        total_s += len(ss); total_f += len(flagged)
        lines += [f"## {r['name']} ({r.get('party', '')}, id {r['id']})", "",
                  f"{len(flagged)} of {len(ss)} sentences flagged.", ""]
        for s, f in flagged:
            lines += [f"- {s}", f"  - *{'; '.join(f)}*"]
        lines.append("")
    lines.insert(4, f"**{total_f} of {total_s} sentences flagged across {len(rows)} biographies.**\n")
    text = "\n".join(lines)
    if a.out == "-":
        sys.stdout.write(text)
    else:
        open(a.out, "w").write(text)
        print(f"Wrote {a.out}: {total_f} of {total_s} sentences flagged across {len(rows)} biographies.")

if __name__ == "__main__":
    main()
