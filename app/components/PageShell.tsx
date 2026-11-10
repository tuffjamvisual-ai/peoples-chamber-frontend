// PageShell (QA6 A7, owner, 10 Nov 2026): the order every page should open in on a phone. See app/components/README.md.
//   1. title       the page's h1
//   2. note        one line saying what the page is (optional)
//   3. main action the one thing a reader came to do: a search field, a postcode box, the first question or the first
//                  record. Its wrapper carries data-main-action, which the QA1 rendered checks (A6) measure: it must
//                  start above 700px at 390 x 844, above 520px at 320 x 568, and within 390px at 844 x 390.
//   4. sections    everything else, each a native <details> fold (works with JavaScript off), closed unless `open`.
// A server component with no state and no script. Not yet used by any page (A7 adds it; UX2 moves pages onto it).
import type { ReactNode } from 'react';

export type PageShellSection = {
  /** Unique on the page: letters, numbers and hyphens; the fold's id, so a link can point at it. */
  id: string;
  /** The fold's label, in sentence case. */
  label: string;
  /** One line after the label from figures already in the page; leave out when there is no honest count. */
  summary?: string | null;
  /** Open when the page loads (for a section most readers want). */
  open?: boolean;
  children: ReactNode;
};

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.35)';

export default function PageShell({ title, note, mainAction, sections = [], children }: {
  title: ReactNode;
  note?: ReactNode;
  mainAction?: ReactNode;
  sections?: PageShellSection[];
  /** Anything that must sit between the main action and the folds (rare: prefer a section). */
  children?: ReactNode;
}) {
  return (
    <>
      <header style={{ marginBottom: '12px' }}>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 'bold', lineHeight: 1.15, margin: '0 0 6px', color: INK }}>{title}</h1>
        {note && <p style={{ fontSize: '16px', lineHeight: 1.5, margin: 0, color: INK }}>{note}</p>}
      </header>
      {mainAction && <div data-main-action="" style={{ margin: '0 0 16px' }}>{mainAction}</div>}
      {children}
      {sections.map((s) => (
        <details key={s.id} id={s.id} open={s.open} style={{ borderTop: `1px solid ${HAIRLINE}` }}>
          <summary style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 8px', minHeight: '44px', padding: '10px 0', cursor: 'pointer', fontSize: '17px', fontWeight: 'bold', color: INK }}>
            <span>{s.label}</span>
            {s.summary && <span style={{ fontSize: '15px', fontWeight: 'normal' }}>{s.summary}</span>}
          </summary>
          <div style={{ padding: '0 0 16px' }}>{s.children}</div>
        </details>
      ))}
    </>
  );
}
