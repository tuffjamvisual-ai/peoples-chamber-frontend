// T1-5x S7 (owner, 10 Nov 2026): one closed "About this data" block per page, after the main content, at every width.
// Method notes, explanations and how-to-read lines go inside it; caveats the owner keeps visible (register of interests,
// second jobs "lower bound", division totals and tellers) stay outside as one short line. A native <details>, so it works
// without JavaScript, and a link to a target inside it opens it (browsers open a closed <details> for a #fragment).
import type { ReactNode } from 'react';

export default function AboutThisData({ children, label = 'About this data', id = 'about-this-data' }: { children: ReactNode; label?: string; id?: string }) {
  return (
    <details className="og-about" id={id}>
      <summary className="og-about-sum"><span>{label}</span><span className="og-about-mark" aria-hidden="true" /></summary>
      <div className="og-about-body">{children}</div>
    </details>
  );
}
