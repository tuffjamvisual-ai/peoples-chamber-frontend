// "Read next" block placed after the opening of news, editorial and debate pages (lib/read-next.ts chooses the
// links; owner's approval, 21 Oct 2026). Server component; renders nothing when there are no links.
import Link from 'next/link';
import type { ReadNextLink } from '@/lib/read-next';
import ContinueToArticle from './ContinueToArticle';

const INK = '#14100d';
const ACCENT = '#7a1612';
// Items that are articles get the "Continue to full article" line; MPs, departments and topics do not.

export default function ReadNext({ links }: { links: ReadNextLink[] }) {
  if (!links.length) return null;
  return (
    <aside aria-label="Read next" style={{ margin: '28px 0', padding: '14px 16px 6px', border: `1.5px solid ${ACCENT}`, borderLeft: `5px solid ${ACCENT}`, background: 'rgba(107,36,23,0.05)', maxWidth: '680px', fontFamily: '"Special Elite", monospace' }}>
      <p style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: ACCENT, margin: '0 0 6px' }}>Read next</p>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="no-hover-scale" style={{ display: 'block', padding: '7px 0', borderTop: '1px dotted rgba(20,16,13,0.25)', color: INK, textDecoration: 'none' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px', overflowWrap: 'anywhere' }}>{l.label}</span>
          {l.note && <span style={{ display: 'block', fontSize: '14px', lineHeight: 1.5, marginTop: '2px' }}>{l.note}</span>}
          {/^\/(news|editorials|briefings)\//.test(l.href) && <ContinueToArticle style={{ fontSize: '14px', marginTop: '4px' }} />}
        </Link>
      ))}
    </aside>
  );
}

// Split article HTML after its nth body paragraph: one at the shallowest depth paragraphs appear at (GOV.UK wraps the
// whole body in one div), so the block never lands inside a list, quote or table. The block goes inside that
// wrapper's level by closing and reopening nothing: the cut is between two sibling paragraphs. Returns null when
// there are fewer than `min` such paragraphs.
export function splitAfterParagraph(html: string, n: number, min: number): [string, string] | null {
  const CONTAINERS = new Set(['div', 'blockquote', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'section', 'figure', 'aside', 'details']);
  const ends: { depth: number; at: number }[] = [];
  const re = /<(\/?)([a-zA-Z0-9]+)\b[^>]*>/g;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const closing = m[1] === '/', tag = m[2].toLowerCase();
    if (CONTAINERS.has(tag)) { depth += closing ? -1 : 1; if (depth < 0) depth = 0; continue; }
    if (tag === 'p' && closing) ends.push({ depth, at: m.index + m[0].length });
  }
  if (!ends.length) return null;
  const top = Math.min(...ends.map((e) => e.depth));
  const body = ends.filter((e) => e.depth === top);
  if (body.length < min) return null;
  const cut = body[n - 1].at;
  return [html.slice(0, cut), html.slice(cut)];
}
