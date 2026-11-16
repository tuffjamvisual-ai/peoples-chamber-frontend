// Text folds for phones and tablets (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 135 H2 and 141 N3): native details, so they
// work without JavaScript, shown up to 1,023px wide and on a phone held sideways (globals.css .rf-d, .rf-b, .rf-h). From
// 1,024px up the folds are not there and the text reads straight through, as before. Nothing is removed.
import type { CSSProperties, ReactNode } from 'react';

/** After an opening (the first 3 paragraphs): the rest of the text behind one "Continue reading" fold. */
export function ContinueReading({ children, label = 'Continue reading' }: { children: ReactNode; label?: string }) {
  return (
    <>
      <details className="rf-d rf-more"><summary>{label}</summary></details>
      <div className="rf-b">{children}</div>
    </>
  );
}

/** A headed section: on phones and tablets a closed fold labelled with the heading; from 1,024px up the heading and text. */
export function SectionFold({ title, label, headingId, headingStyle, children, open = false }: { title: ReactNode; label?: ReactNode; headingId?: string; headingStyle?: CSSProperties; children: ReactNode; open?: boolean }) {
  return (
    <>
      <div className="rf-h"><h2 id={headingId} style={headingStyle}>{title}</h2></div>
      <details className="rf-d" open={open}><summary>{label ?? title}</summary></details>
      <div className="rf-b">{children}</div>
    </>
  );
}
