// Evidence panel — sits at the foot of an article (editorial, investigation, profile).
// Shows how the piece was checked. Rows render only when they apply, so a neutral
// data page can show just the baseline (AI use + corrections) while an investigation
// shows records reviewed, who was contacted and whether they replied.
// Part of the "report more, perform less" standing rule (accountability shown, not claimed).

const INK = '#14100d';
const ACCENT = '#6b2417';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = "'Special Elite', monospace";

export type EvidencePanelProps = {
  recordsReviewed?: string[];
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
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 16px', padding: '7px 0', borderTop: `1px solid ${HAIRLINE}` }}>
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
      <p style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', color: ACCENT, margin: '0 0 6px' }}>
        How this piece was checked
      </p>
      {recordsReviewed && recordsReviewed.length > 0 && (
        <Row label="Records reviewed">{recordsReviewed.join('; ')}</Row>
      )}
      {contacted && <Row label="Contacted">{contacted}</Row>}
      {response && <Row label="Response">{response}</Row>}
      {lastChecked && <Row label="Last fact-checked">{lastChecked}</Row>}
      <Row label="Corrections">
        Spotted an error? <a href={`mailto:${correctionsEmail}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{correctionsEmail}</a>. Corrections are logged.
      </Row>
      {/* AI-use row temporarily removed from rendering (pending a disclosure decision):
      <Row label="AI use">{aiDisclosure}</Row> */}
    </aside>
  );
}
