// Evidence panel — sits at the foot of an article (editorial, investigation, profile).
// Shows how the piece was checked. Rows render only when they apply, so a neutral
// data page can show just the baseline (AI use + corrections) while an investigation
// shows records reviewed, who was contacted and whether they replied.
// Part of the "report more, perform less" standing rule (accountability shown, not claimed).

import Link from 'next/link';
import { SourcesList, linkStyle, type EvidenceRecord } from './SourcesList';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = "var(--font-special-elite), monospace";

export type { EvidenceRecord };

// "Facts last checked" as written, except an ISO date (YYYY-MM-DD), which shows as "23 October 2026".
export function formatLastChecked(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export type EvidencePanelProps = {
  recordsReviewed?: EvidenceRecord[];
  contacted?: string;
  response?: string;
  lastChecked?: string; // human label, e.g. "11 July 2026"
  correctionsEmail?: string;
  aiDisclosure?: string;
  // When set, the records row is one "Sources (N)" link to this page instead of the full list.
  sourcesHref?: string;
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
  sourcesHref,
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
        sourcesHref ? (
          <Row label="Sources">
            <Link href={sourcesHref} style={linkStyle}>Sources ({recordsReviewed.length})</Link>
          </Row>
        ) : (
          <Row label="Records reviewed">
            <SourcesList records={recordsReviewed} />
          </Row>
        )
      )}
      {contacted && <Row label="Contacted">{contacted}</Row>}
      {response && <Row label="Response">{response}</Row>}
      {lastChecked && <Row label="Facts last checked">{formatLastChecked(lastChecked)}</Row>}
      <Row label="Corrections">
        Spotted an error? <a href={`mailto:${correctionsEmail}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{correctionsEmail}</a>. Corrections are logged.
      </Row>
      {/* AI-use row temporarily removed from rendering (pending a disclosure decision):
      <Row label="AI use">{aiDisclosure}</Row> */}
    </aside>
  );
}
