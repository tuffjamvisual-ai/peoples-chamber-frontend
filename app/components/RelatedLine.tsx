// The compact "Related" block (owner's rule, 3 Nov 2026: keep pages compact, no clutter): one per page, at the very
// end of the main content, a "Related" label then one line of up to four plain links separated by " · ". The same
// look as the "Sources (N)" link on reports: no cards, images or boxes, 15px, ink. Renders nothing without links.
// The links are chosen in lib/related-links.ts.
import Link from 'next/link';
import type { RelatedLink } from '@/lib/related-links';

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.18)';

export default function RelatedLine({ links }: { links: RelatedLink[] }) {
  const shown = links.slice(0, 4);
  if (!shown.length) return null;
  return (
    <nav aria-label="Related" style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: '16px', margin: '8px 0 24px', fontSize: '15px', lineHeight: 1.7, color: INK }}>
      <span style={{ fontWeight: 'bold', marginRight: '8px' }}>Related</span>
      {shown.map((l, i) => (
        <span key={l.href}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <Link href={l.href} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{l.label}</Link>
        </span>
      ))}
    </nav>
  );
}
