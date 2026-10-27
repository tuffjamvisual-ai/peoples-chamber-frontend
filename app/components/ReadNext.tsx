// "Read next" block, placed once at the end of news, editorial, debate and secretariat pages, after the last of the
// text (owner's request, 25 Oct 2026; it used to sit part way through). lib/read-next.ts chooses the links. Server
// component; renders nothing when there are no links.
import Link from 'next/link';
import type { ReadNextLink } from '@/lib/read-next';
import ContinueToArticle from './ContinueToArticle';

const INK = '#14100d';
const ACCENT = '#7a1612';
// Items that are articles get the "Continue to full article" line; MPs, departments and topics do not.

export default function ReadNext({ links }: { links: ReadNextLink[] }) {
  if (!links.length) return null;
  return (
    <aside aria-label="Read next" style={{ margin: '28px 0', padding: '14px 16px 6px', border: `1.5px solid ${ACCENT}`, borderLeft: `5px solid ${ACCENT}`, background: 'rgba(107,36,23,0.05)', maxWidth: '680px', fontFamily: 'var(--font-special-elite), monospace' }}>
      <p style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: ACCENT, margin: '0 0 6px' }}>Read next</p>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="no-hover-scale" style={{ display: 'block', padding: '7px 0', borderTop: '1px dotted rgba(20,16,13,0.25)', color: INK, textDecoration: 'none' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px', overflowWrap: 'anywhere' }}>{l.label}</span>
          {l.note && <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '2px' }}>{l.note}</span>}
          {/^\/(news|editorials|briefings)\//.test(l.href) && <ContinueToArticle style={{ fontSize: '15px', marginTop: '4px' }} />}
        </Link>
      ))}
    </aside>
  );
}
