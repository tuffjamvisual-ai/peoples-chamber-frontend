// "See also" block for the foot of data pages, so a visitor who arrives from search always
// has a next step. Same look as the editorial "Explore next" block (ExploreNext.tsx).
// Pass internal links only. Added 15 Oct 2026.

import Link from 'next/link';

const INK = '#14100d';
const ACCENT = '#7a1612';
const FONT = 'var(--font-special-elite), monospace';

export type SeeAlsoLink = { href: string; label: string; note?: string };

export default function SeeAlso({ links, heading = 'See also' }: { links: SeeAlsoLink[]; heading?: string }) {
  if (!links.length) return null;
  return (
    <aside aria-label={heading} style={{ marginTop: '36px', paddingTop: '22px', borderTop: `1.5px solid ${INK}`, fontFamily: FONT, color: INK }}>
      <style>{`
        .sa-link { display: block; padding: 10px 0; color: ${INK}; text-decoration: none; border-bottom: 1px dotted rgba(20,16,13,0.25); }
        .sa-link:hover .sa-title { color: ${ACCENT}; text-decoration: underline; }
        .sa-title { font-size: 16px; font-weight: bold; overflow-wrap: anywhere; }
        .sa-note { display: block; font-size: 15px; line-height: 1.5; margin-top: 2px; }
      `}</style>
      <h2 style={{ fontFamily: FONT, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 6px' }}>{heading}</h2>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="sa-link no-hover-scale">
          <span className="sa-title">{l.label} →</span>
          {l.note && <span className="sa-note">{l.note}</span>}
        </Link>
      ))}
    </aside>
  );
}
