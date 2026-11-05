// A fold for phones only (owner, 5 Nov 2026, the 10,000px rule). Under 640px a tappable line, open or closed, then its
// content; from 640px up the line is not there and the content sits as if this were not here. Native details, so it opens
// without JavaScript. The content is beside the details, not in it, because from 640px up it must always show. Styles are
// in globals.css (.pg-d, .pg-b). No state and no browser APIs, so it renders on the server.
import type { ReactNode } from 'react';

export default function PhoneGroup({ summary, open = false, children }: { summary: string; open?: boolean; children: ReactNode }) {
  return (
    <>
      <details className="pg-d" open={open}><summary>{summary}</summary></details>
      <div className="pg-b">{children}</div>
    </>
  );
}
