"use client";
import { useState, type CSSProperties } from "react";
import { buildSystemPrompt, buildUserMessage, MODES, DEFAULT_MODE, type HumaniserMode, type RedditStance } from "./prompt";

const STANCES: { id: RedditStance; label: string }[] = [
  { id: "agree", label: "Agree" },
  { id: "disagree", label: "Disagree" },
  { id: "nuance", label: "Add nuance" },
  { id: "question", label: "Ask question" },
];
import { capTabloidOutput } from "./paragraphCap";
import { detectImputedKnowledge, type ImputedKnowledgeResult } from "./imputedKnowledge";
import { detectDroppedHedges, type ApproxHedgeResult } from "./approximationHedge";
import { detectDuplicates, type DuplicateResult } from "./duplicateGlitch";
import { detectRemovedStrongLines, type StrongLineResult } from "./strongLine";
import { detectProcessNotes, type ProcessNoteResult } from "./processNote";
import { detectVoiceRhythmIssues, type VoiceRhythmResult } from "./voiceRhythm";
import { detectWeakenedTrail, type DocTrailResult } from "./documentaryDetail";

const EMPTY_RISK: ImputedKnowledgeResult = {
  hasImputedKnowledgeRisk: false,
  flaggedPhrases: [],
  flaggedLines: [],
};

const EMPTY_APPROX: ApproxHedgeResult = {
  hasDroppedHedge: false,
  drops: [],
};

const EMPTY_DUP: DuplicateResult = { hasDuplicate: false, duplicates: [] };
const EMPTY_STRONG: StrongLineResult = { hasRemovedStrongLine: false, removed: [] };
const EMPTY_NOTE: ProcessNoteResult = { hasProcessNote: false, notes: [] };
const EMPTY_VOICE: VoiceRhythmResult = { hasIssue: false, issues: [] };
const EMPTY_DOCTRAIL: DocTrailResult = { hasWeakenedTrail: false, totalAnchors: 0, keptAnchors: 0, droppedAnchors: [], legallySensitive: false };

// Advisory (amber) styling, distinct from the red safety warnings.
const voiceBox: CSSProperties = {
  marginTop: "4px",
  marginBottom: "12px",
  padding: "14px 16px",
  border: "1px solid #8a6d3b",
  backgroundColor: "#faf3e6",
  borderRadius: "2px",
  fontFamily: "system-ui, -apple-system, sans-serif",
};
const voiceHead: CSSProperties = { fontSize: "15px", fontWeight: 700, color: "#6b5220", marginBottom: "8px" };

const hygieneBox: CSSProperties = {
  marginTop: "4px",
  marginBottom: "12px",
  padding: "14px 16px",
  border: "1px solid #7a1612",
  backgroundColor: "#fbeceb",
  borderRadius: "2px",
  fontFamily: "system-ui, -apple-system, sans-serif",
};
const hygieneHead: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#7a1612",
  marginBottom: "6px",
};
const hygieneList: CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
  fontSize: "15px",
  color: "#14100d",
  lineHeight: 1.6,
};

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function HumaniserPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [mode, setMode] = useState<HumaniserMode>(DEFAULT_MODE);
  const [imputedRisk, setImputedRisk] = useState<ImputedKnowledgeResult>(EMPTY_RISK);
  const [approxRisk, setApproxRisk] = useState<ApproxHedgeResult>(EMPTY_APPROX);
  const [dupRisk, setDupRisk] = useState<DuplicateResult>(EMPTY_DUP);
  const [strongRisk, setStrongRisk] = useState<StrongLineResult>(EMPTY_STRONG);
  const [noteRisk, setNoteRisk] = useState<ProcessNoteResult>(EMPTY_NOTE);
  const [voiceRisk, setVoiceRisk] = useState<VoiceRhythmResult>(EMPTY_VOICE);
  const [docTrail, setDocTrail] = useState<DocTrailResult>(EMPTY_DOCTRAIL);
  const [comment, setComment] = useState("");
  const [stance, setStance] = useState<RedditStance>("disagree");

  const active = MODES.find((m) => m.id === mode)!;
  const isDiagnosis = mode === "diagnosis";
  const isReddit = mode === "reddit";
  const isEditor = mode === "editor";

  function selectMode(next: HumaniserMode) {
    if (next === mode) return;
    setMode(next);
    setOutput("");
    setError("");
    setCopied(false);
    setCopyError("");
    setImputedRisk(EMPTY_RISK);
    setApproxRisk(EMPTY_APPROX);
    setDupRisk(EMPTY_DUP);
    setStrongRisk(EMPTY_STRONG);
    setNoteRisk(EMPTY_NOTE);
    setVoiceRisk(EMPTY_VOICE);
    setDocTrail(EMPTY_DOCTRAIL);
  }

  async function handleRewrite() {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");
    setImputedRisk(EMPTY_RISK);
    setApproxRisk(EMPTY_APPROX);
    setDupRisk(EMPTY_DUP);
    setStrongRisk(EMPTY_STRONG);
    setNoteRisk(EMPTY_NOTE);
    setVoiceRisk(EMPTY_VOICE);
    setDocTrail(EMPTY_DOCTRAIL);

    try {
      const response = await fetch("/api/internal/humanise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: buildSystemPrompt(mode),
          messages: [
            {
              role: "user",
              content: buildUserMessage(mode, input, { comment, stance }),
            },
          ],
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error.message || "API error");
        setLoading(false);
        return;
      }

      const text = data.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");

      // Mode 2 only: deterministically enforce the three-sentence paragraph cap.
      // Formatter inserts paragraph breaks; it never edits language.
      const finalText = capTabloidOutput(mode, text);
      setOutput(finalText);
      // Editor pass returns a review report, not publishable article prose, so the
      // article-detectors (which compare source vs output, or scan for tells) do not
      // apply. Every detector below is flag-only and never edits the text.
      if (mode !== "editor") {
        setImputedRisk(detectImputedKnowledge(mode, finalText));
        setApproxRisk(detectDroppedHedges(mode, input, finalText));
        setDupRisk(detectDuplicates(mode, finalText));
        setStrongRisk(detectRemovedStrongLines(mode, input, finalText));
        setNoteRisk(detectProcessNotes(mode, finalText));
        setVoiceRisk(detectVoiceRhythmIssues(mode, finalText));
        setDocTrail(detectWeakenedTrail(mode, input, finalText));
      }
    } catch (err: any) {
      setError("Request failed: " + err.message);
    }

    setLoading(false);
  }

  function flashCopied() {
    setCopyError("");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleCopy() {
    if (!output) return;
    setCopyError("");

    // 1. Modern async Clipboard API (needs a secure context + document focus).
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(output);
        flashCopied();
        return;
      }
    } catch {
      // fall through to the legacy method
    }

    // 2. Fallback: hidden textarea + document.execCommand('copy').
    try {
      const ta = document.createElement("textarea");
      ta.value = output;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, output.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) {
        flashCopied();
        return;
      }
      throw new Error("execCommand copy returned false");
    } catch {
      setCopied(false);
      setCopyError("Couldn't copy automatically. Select the output text and copy it manually (Ctrl/Cmd + C).");
    }
  }

  function handleClear() {
    setInput("");
    setComment("");
    setOutput("");
    setError("");
    setCopied(false);
    setCopyError("");
    setImputedRisk(EMPTY_RISK);
    setApproxRisk(EMPTY_APPROX);
    setDupRisk(EMPTY_DUP);
    setStrongRisk(EMPTY_STRONG);
    setNoteRisk(EMPTY_NOTE);
    setVoiceRisk(EMPTY_VOICE);
    setDocTrail(EMPTY_DOCTRAIL);
  }

  const inputWords = countWords(input);
  const inputChars = input.length;
  const outputWords = countWords(output);
  const outputChars = output.length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f4e8d4" }}>
      <div
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          color: "#14100d",
          padding: "32px 24px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            margin: "0 0 8px",
            textTransform: "uppercase",
          }}
        >
          opengovt Humaniser
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "#5a5652",
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Paste AI-drafted text. Get it rewritten in the site&apos;s editorial voice.
          Every fact stays. The cadence changes.
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            fontSize: "15px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "8px",
            display: "block",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#5a5652",
          }}
        >
          Mode
        </label>
        <div
          data-testid="mode-selector"
          role="radiogroup"
          aria-label="Rewrite mode"
          style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
        >
          {MODES.map((m) => {
            const selected = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-mode={m.id}
                onClick={() => selectMode(m.id)}
                style={{
                  padding: "8px 16px",
                  fontSize: "15px",
                  fontWeight: 600,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "0.02em",
                  color: selected ? "#f4e8d4" : "#14100d",
                  backgroundColor: selected ? "#14100d" : "transparent",
                  border: `1px solid ${selected ? "#14100d" : "#d4c8b4"}`,
                  borderRadius: "2px",
                  cursor: "pointer",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <p
          data-testid="mode-helper"
          style={{
            fontSize: "15px",
            color: "#14100d",
            opacity: 1,
            margin: "10px 0 0",
            lineHeight: 1.55,
            maxWidth: "760px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {active.helper}
        </p>
        {isDiagnosis && (
          <p
            data-testid="diagnosis-note"
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#7a1612",
              margin: "6px 0 0",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            This mode will not rewrite your text. It returns a critique only.
          </p>
        )}
        {isReddit && (
          <div data-testid="reddit-controls" style={{ marginTop: "10px" }}>
            <div
              role="radiogroup"
              aria-label="Reply stance"
              style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}
            >
              {STANCES.map((s) => {
                const selected = s.id === stance;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-stance={s.id}
                    onClick={() => setStance(s.id)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "15px",
                      fontWeight: 600,
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      color: selected ? "#f4e8d4" : "#14100d",
                      backgroundColor: selected ? "#14100d" : "transparent",
                      border: `1px solid ${selected ? "#14100d" : "#d4c8b4"}`,
                      borderRadius: "2px",
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <label
              style={{
                fontSize: "15px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "6px",
                display: "block",
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#5a5652",
              }}
            >
              Comment you&apos;re replying to
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Paste the Reddit comment you're replying to..."
              style={{
                width: "100%",
                minHeight: "90px",
                padding: "12px",
                fontSize: "15px",
                lineHeight: 1.6,
                fontFamily: "'EB Garamond', Georgia, serif",
                color: "#14100d",
                backgroundColor: "#f4e8d4",
                border: "1px solid #d4c8b4",
                borderRadius: "2px",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label
            style={{
              fontSize: "15px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "8px",
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "#5a5652",
            }}
          >
            {isReddit ? "Source article or argument" : isEditor ? "Draft to review (paste any warnings too)" : "Input"}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste AI-generated text here..."
            style={{
              flex: 1,
              minHeight: "400px",
              padding: "16px",
              fontSize: "15px",
              lineHeight: 1.7,
              fontFamily: "'EB Garamond', Georgia, serif",
              color: "#14100d",
              backgroundColor: "#f4e8d4",
              border: "1px solid #d4c8b4",
              borderRadius: "2px",
              resize: "vertical",
              outline: "none",
            }}
          />
          <div
            style={{
              fontSize: "15px",
              color: "#5a5652",
              marginTop: "6px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {inputWords} words · {inputChars} characters
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label
            style={{
              fontSize: "15px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "8px",
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "#5a5652",
            }}
          >
            {isReddit ? "Reply" : isEditor ? "Editor review" : isDiagnosis ? "Diagnosis" : "Output"}
          </label>
          <div
            style={{
              flex: 1,
              minHeight: "400px",
              padding: "16px",
              fontSize: "15px",
              lineHeight: 1.7,
              fontFamily: "'EB Garamond', Georgia, serif",
              color: "#14100d",
              backgroundColor: "#faf4ea",
              border: "1px solid #d4c8b4",
              borderRadius: "2px",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {loading ? (
              <span
                style={{
                  color: "#7a1612",
                  fontStyle: "italic",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: "15px",
                }}
              >
                {isReddit ? "Writing reply..." : isEditor ? "Reviewing..." : isDiagnosis ? "Diagnosing..." : "Rewriting..."}
              </span>
            ) : error ? (
              <span
                style={{
                  color: "#7a1612",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: "15px",
                }}
              >
                {error}
              </span>
            ) : output ? (
              output
            ) : (
              <span style={{ color: "#b0a89e", fontStyle: "italic" }}>
                {isReddit
                  ? "Reply appears here"
                  : isEditor
                    ? "Editor review appears here"
                    : isDiagnosis
                      ? "Critique appears here"
                      : "Rewritten text appears here"}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "15px",
              color: "#5a5652",
              marginTop: "6px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {outputWords} words · {outputChars} characters
          </div>
        </div>
      </div>

      {imputedRisk.hasImputedKnowledgeRisk && (
        <div
          role="alert"
          data-testid="imputed-warning"
          style={{
            marginTop: "4px",
            marginBottom: "12px",
            padding: "14px 16px",
            border: "1px solid #7a1612",
            backgroundColor: "#fbeceb",
            borderRadius: "2px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#7a1612", marginBottom: "6px" }}>
            Potential imputed knowledge or intent detected. Review before publishing.
          </div>
          <div style={{ fontSize: "15px", color: "#14100d", marginBottom: "8px", opacity: 1 }}>
            The rewrite may state what someone knew, intended or was aware of without the source
            establishing it. The output has not been changed. Check each flagged line against the source.
          </div>
          <div style={{ fontSize: "15px", color: "#14100d", marginBottom: "8px", opacity: 1 }}>
            Flagged phrases: {imputedRisk.flaggedPhrases.map((p) => `"${p}"`).join(", ")}
          </div>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "15px", color: "#14100d", lineHeight: 1.5 }}>
            {imputedRisk.flaggedLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {approxRisk.hasDroppedHedge && (
        <div
          role="alert"
          data-testid="approx-warning"
          style={{
            marginTop: "4px",
            marginBottom: "12px",
            padding: "14px 16px",
            border: "1px solid #7a1612",
            backgroundColor: "#fbeceb",
            borderRadius: "2px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#7a1612", marginBottom: "6px" }}>
            Potential approximation hedge dropped. Review before publishing.
          </div>
          <div style={{ fontSize: "15px", color: "#14100d", marginBottom: "8px", opacity: 1 }}>
            The source softened a figure but the rewrite states it more flatly. The output has not been
            changed. Restore the hedge if the source only approximated the number.
          </div>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "15px", color: "#14100d", lineHeight: 1.6 }}>
            {approxRisk.drops.map((d, i) => (
              <li key={i}>
                source <strong>&ldquo;{d.sourcePhrase}&rdquo;</strong> &rarr; output dropped
                &ldquo;{d.missingHedge}&rdquo; before <strong>{d.figure}</strong>
                {d.outputLine ? <>: &ldquo;{d.outputLine}&rdquo;</> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dupRisk.hasDuplicate && (
        <div role="alert" data-testid="duplicate-warning" style={hygieneBox}>
          <div style={hygieneHead}>Potential duplicate or generation glitch detected. Review before publishing.</div>
          <ul style={hygieneList}>
            {dupRisk.duplicates.map((d, i) => (
              <li key={i}>
                repeated {d.count}&times;: &ldquo;{d.phrase}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      {strongRisk.hasRemovedStrongLine && (
        <div role="alert" data-testid="strongline-warning" style={hygieneBox}>
          <div style={hygieneHead}>Strong original line may have been removed or weakened.</div>
          <ul style={hygieneList}>
            {strongRisk.removed.map((r, i) => (
              <li key={i}>
                source <strong>&ldquo;{r.line}&rdquo;</strong> &rarr; nearest output:{" "}
                {r.nearest === "not found" ? "not found" : <>&ldquo;{r.nearest}&rdquo;</>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {noteRisk.hasProcessNote && (
        <div role="alert" data-testid="processnote-warning" style={hygieneBox}>
          <div style={hygieneHead}>Process note found in rewrite output. Remove before publishing.</div>
          <ul style={hygieneList}>
            {noteRisk.notes.map((n, i) => (
              <li key={i}>&ldquo;{n}&rdquo;</li>
            ))}
          </ul>
        </div>
      )}

      {docTrail.hasWeakenedTrail && (
        <div role="alert" data-testid="doctrail-warning" style={hygieneBox}>
          <div style={hygieneHead}>
            {docTrail.legallySensitive
              ? "Reporting trail may be too thin for a legally sensitive political piece."
              : "Reporting trail may have been weakened. Review before publishing."}
          </div>
          <div style={{ fontSize: "15px", color: "#14100d", marginBottom: "8px", opacity: 1, fontFamily: "system-ui, -apple-system, sans-serif" }}>
            The source is document-heavy but the rewrite kept only {docTrail.keptAnchors} of {docTrail.totalAnchors}{" "}
            documentary anchors. Put the missing dates, figures, sources, quotes or right-of-reply back if the piece is a file, not an argument.
          </div>
          <ul style={hygieneList}>
            {docTrail.droppedAnchors.slice(0, 12).map((a, i) => (
              <li key={i}>&ldquo;{a}&rdquo;</li>
            ))}
          </ul>
        </div>
      )}

      {voiceRisk.hasIssue && (
        <div data-testid="voice-warning" style={voiceBox}>
          <div style={voiceHead}>
            Voice &amp; rhythm quality pass (advisory): {voiceRisk.issues.length} note
            {voiceRisk.issues.length === 1 ? "" : "s"}. These are style suggestions, not safety warnings.
          </div>
          {voiceRisk.issues.map((issue, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#6b5220" }}>{issue.label}</div>
              <div style={{ fontSize: "15px", color: "#14100d", opacity: 1, margin: "2px 0 4px" }}>
                {issue.reason} <em>Direction: {issue.suggestion}</em>
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "15px", color: "#14100d", lineHeight: 1.5 }}>
                {issue.lines.slice(0, 8).map((line, j) => (
                  <li key={j}>&ldquo;{line}&rdquo;</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <button
          onClick={handleRewrite}
          disabled={loading || !input.trim()}
          data-testid="action-button"
          style={{
            padding: "10px 28px",
            fontSize: "15px",
            fontWeight: 600,
            fontFamily: "system-ui, -apple-system, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: loading || !input.trim() ? "#8a8480" : "#f4e8d4",
            backgroundColor: loading || !input.trim() ? "#d4c8b4" : "#14100d",
            border: "none",
            borderRadius: "2px",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? isReddit
              ? "Writing..."
              : isEditor
                ? "Reviewing..."
                : isDiagnosis
                  ? "Diagnosing..."
                  : "Rewriting..."
            : isReddit
              ? "Write reply"
              : isEditor
                ? "Review"
                : isDiagnosis
                  ? "Diagnose"
                  : "Rewrite"}
        </button>

        {output && (
          <button
            onClick={handleCopy}
            aria-live="polite"
            style={{
              padding: "10px 28px",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "system-ui, -apple-system, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: copied ? "#f4e8d4" : "#14100d",
              backgroundColor: copied ? "#1a7a3c" : "transparent",
              border: `1px solid ${copied ? "#1a7a3c" : "#14100d"}`,
              borderRadius: "2px",
              cursor: "pointer",
              transition: "background-color 120ms ease, color 120ms ease",
            }}
          >
            {copied ? "Copied!" : "Copy output"}
          </button>
        )}

        <button
          onClick={handleClear}
          style={{
            padding: "10px 28px",
            fontSize: "15px",
            fontWeight: 600,
            fontFamily: "system-ui, -apple-system, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#7a1612",
            backgroundColor: "transparent",
            border: "1px solid #7a1612",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      {copyError && (
        <div role="alert" style={{ marginTop: "12px", fontSize: "15px", color: "#7a1612", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          {copyError}
        </div>
      )}

      <div
        style={{
          marginTop: "32px",
          paddingTop: "16px",
          borderTop: "1px solid #d4c8b4",
          fontSize: "15px",
          color: "#8a8480",
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: 1.6,
        }}
      >
        Internal tool · opengovt editorial voice ·{" "}
        {isDiagnosis
          ? "All facts preserved, critique only, nothing rewritten"
          : "All facts preserved, cadence rewritten"}{" "}
        · Powered by Claude Sonnet 4.6
      </div>
      </div>
    </div>
  );
}
