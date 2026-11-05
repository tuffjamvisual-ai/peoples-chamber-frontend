// The /sources page of an investigation or file briefing (added 23 Oct 2026): every record the piece was checked
// against, linked from the article as one "Sources (N)" line. The "How this piece was checked" panel (facts last
// checked, contacted, response, corrections) is shown here, under the list, not on the article (owner, 2 Nov 2026).
import type { ReactNode } from 'react';
import Link from 'next/link';
import OpenGovShell from './OpenGovShell';
import BackLink from './BackLink';
import { SourcesList, type EvidenceRecord } from './SourcesList';
import EvidencePanel, { type EvidencePanelProps } from './EvidencePanel';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export const backStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' } as const;
export const kickerStyle = { fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', color: ACCENT, fontWeight: 'bold', marginBottom: '10px' } as const;
export const h1Style = { fontFamily: MONO, fontSize: 'clamp(24px, 3.4vw, 40px)', fontWeight: 'bold', lineHeight: 1.12, letterSpacing: '0.01em', marginBottom: '20px' } as const;

export default function SourcesPage({ stamp, articleHref, headline, records, evidence, banner }: { banner?: ReactNode; 
  stamp: string; articleHref: string; headline: string; records: EvidenceRecord[]; evidence?: EvidencePanelProps;
}) {
  return (
    <OpenGovShell pageStamp={stamp}>
      {banner}
      <BackLink fallbackHref={articleHref} label="← Back to article" className="no-hover-scale" style={backStyle} />
      <header>
        <div style={kickerStyle}>Sources</div>
        <h1 style={h1Style}>
          <Link href={articleHref} style={{ color: INK, textDecoration: 'none' }}>{headline}</Link>
        </h1>
      </header>
      <div style={{ maxWidth: '760px', fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK }}>
        <SourcesList records={records} />
        {evidence && <EvidencePanel {...evidence} sourcesShownAbove />}
      </div>
    </OpenGovShell>
  );
}
