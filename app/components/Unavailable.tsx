// Something a reader cannot use right now: a "Next" with no next page, a letter with no entries (owner's black ink
// rule, 27 Oct 2026). It stays in full black ink and shows its state another way: struck through, not a link, marked
// aria-disabled, with a note for screen readers. Never greyed out.
import type { CSSProperties, ReactNode } from 'react';

const VISUALLY_HIDDEN: CSSProperties = { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 };

export default function Unavailable({ children, note = 'not available', style }: { children: ReactNode; note?: string; style?: CSSProperties }) {
  return (
    <span aria-disabled="true" style={{ color: '#14100d', textDecoration: 'line-through', cursor: 'default', ...style }}>
      {children}
      <span style={VISUALLY_HIDDEN}> ({note})</span>
    </span>
  );
}
