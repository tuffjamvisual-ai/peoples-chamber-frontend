// A fold for phones only (owner, 5 Nov 2026, the 10,000px rule). Under 640px a tappable line, open or closed, then its
// content; from 640px up the line is not there and the content sits as if this were not here. Native details, so it opens
// without JavaScript. The content is beside the details, not in it, because from 640px up it must always show. Styles are
// in globals.css (.pg-d, .pg-b). No state and no browser APIs, so it renders on the server.
import type { ReactNode } from 'react';

// tablets (T1-GUARD, owner approved 13 Nov 2026): the fold on tablets as well, up to 1,023px (globals.css .pg-t), for a page
// too long for the 3,000px tablet length. From 1,024px up nothing changes.
export default function PhoneGroup({ summary, open = false, tablets = false, children }: { summary: string; open?: boolean; tablets?: boolean; children: ReactNode }) {
  return (
    <>
      <details className={tablets ? 'pg-d pg-t' : 'pg-d'} open={open}><summary>{summary}</summary></details>
      <div className={tablets ? 'pg-b pg-t' : 'pg-b'}>{children}</div>
    </>
  );
}
