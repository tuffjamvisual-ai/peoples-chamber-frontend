// Evidence panel — sits at the foot of an article (editorial, investigation, profile).
// Shows how the piece was checked. Rows render only when they apply, so a neutral
// data page can show just the baseline (AI use + corrections) while an investigation
// shows records reviewed, who was contacted and whether they replied.
// Part of the "report more, perform less" standing rule (accountability shown, not claimed).

const INK = '#14100d';
const ACCENT = '#6b2417';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = "'Special Elite', monospace";

// A record is plain text, or text with a link to the document itself (added 16 Oct 2026 at
// the owner's request: sources link to the exact document where one could be found and
// opened; anything without a stable public page stays as text).
export type EvidenceRecord = string | { text: string; url?: string };

export type EvidencePanelProps = {
  recordsReviewed?: EvidenceRecord[];
  contacted?: string;
  response?: string;
  lastChecked?: string; // human label, e.g. "11 July 2026"
  correctionsEmail?: string;
  aiDisclosure?: string;
};

// AI-use disclosure temporarily removed from rendering (pending a decision on how
// to properly disclose it). Preserved here so it can be reinstated later.
// const DEFAULT_AI =
//   'Researched and drafted with AI tools; every figure is verified against the named public records above before publication.';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ev-row" style={{ padding: '7px 0', borderTop: `1px solid ${HAIRLINE}` }}>
      <div style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.12em', color: ACCENT }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK }}>{children}</div>
    </div>
  );
}

export default function EvidencePanel({
  recordsReviewed,
  contacted,
  response,
  lastChecked,
  correctionsEmail = 'contact@opengovt.uk',
  // aiDisclosure = DEFAULT_AI, // temporarily not rendered — see note above
}: EvidencePanelProps) {
  return (
    <aside
      aria-label="How this piece was checked"
      style={{ marginTop: '44px', padding: '18px 20px 8px', border: `1px solid ${HAIRLINE}`, borderTop: `3px solid ${ACCENT}`, background: 'rgba(107,36,23,0.03)' }}
    >
      {/* Label beside the text on wider screens; stacked above it on phones, where a 150px
          label column left the records a few characters wide. */}
      <style>{`
        .ev-row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 8px 16px; }
        @media (max-width: 600px) { .ev-row { grid-template-columns: minmax(0, 1fr); gap: 4px; } }
      `}</style>
      <p style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', color: ACCENT, margin: '0 0 6px' }}>
        How this piece was checked
      </p>
      {recordsReviewed && recordsReviewed.length > 0 && (
        <Row label="Records reviewed">
          <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
            {recordsReviewed.map((r, i) => {
              const text = typeof r === 'string' ? r : r.text;
              const url = typeof r === 'string' ? undefined : r.url;
              // Link the part before the first colon (publisher, title, date); the notes after it stay as text.
              const cut = text.indexOf(': ');
              const head = cut > 0 ? text.slice(0, cut) : text;
              const rest = cut > 0 ? text.slice(cut) : '';
              return (
                <li key={i} style={{ marginBottom: '6px', overflowWrap: 'anywhere' }}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{head}</a>
                  ) : head}
                  {rest}
                </li>
              );
            })}
          </ul>
        </Row>
      )}
      {contacted && <Row label="Contacted">{contacted}</Row>}
      {response && <Row label="Response">{response}</Row>}
      {lastChecked && <Row label="Facts last checked">{lastChecked}</Row>}
      <Row label="Corrections">
        Spotted an error? <a href={`mailto:${correctionsEmail}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{correctionsEmail}</a>. Corrections are logged.
      </Row>
      {/* AI-use row temporarily removed from rendering (pending a disclosure decision):
      <Row label="AI use">{aiDisclosure}</Row> */}
    </aside>
  );
}
