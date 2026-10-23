// "Explore next" block at the foot of every editorial (Investigations and Briefings), so a
// reader who finishes a piece always has somewhere sensible to go: the data pages behind
// the story and more pieces on the same subject.
//
// Sources, all static (no database reads):
//   - piece.explore: hand-picked links for this piece (shown first)
//   - lib/topics.ts: topics that list this piece contribute their data pages and topic page
//   - lib/editorials: up to three more pieces of the same kind on the same subject, then
//     the newest under a separate "Latest" heading (lib/editorials/subjects.ts)
// Added 15 Oct 2026 after analytics showed most search visitors read one page and left.

import Link from 'next/link';
import type { EditorialEntry } from '@/lib/editorials/types';
import { exploreNextSelection } from '@/lib/explore-next';
import { listSummary } from '@/lib/editorials/list-summary';
import ContinueToArticle from './ContinueToArticle';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.18)';
const FONT = '"Special Elite", monospace';


export default function ExploreNext({ piece }: { piece: EditorialEntry }) {
  const { base, data, next, latest } = exploreNextSelection(piece);
  if (!data.length && !next.length && !latest.length) return null;

  return (
    <aside aria-label="Explore next" style={{ marginTop: '36px', paddingTop: '22px', borderTop: `1.5px solid ${INK}`, fontFamily: FONT, color: INK }}>
      <style>{`
        .xn-link { display: block; padding: 10px 0; color: ${INK}; text-decoration: none; border-bottom: 1px dotted rgba(20,16,13,0.25); }
        .xn-link:hover .xn-title { color: ${ACCENT}; text-decoration: underline; }
        .xn-title { font-size: 16px; font-weight: bold; overflow-wrap: anywhere; }
        .xn-note { display: block; font-size: 14px; line-height: 1.5; margin-top: 2px; }
      `}</style>
      {data.length > 0 && (
        <section style={{ marginBottom: '26px' }}>
          <h2 style={heading}>Explore the data</h2>
          {data.map((d) => (
            <Link key={d.href} href={d.href} className="xn-link no-hover-scale">
              <span className="xn-title">{d.label} →</span>
              {d.note && <span className="xn-note">{d.note}</span>}
            </Link>
          ))}
        </section>
      )}
      {next.length > 0 && (
        <section style={{ marginBottom: latest.length ? '26px' : 0 }}>
          <h2 style={heading}>More reports</h2>
          {next.map((e) => <PieceLink key={e.slug} e={e} base={base} />)}
        </section>
      )}
      {latest.length > 0 && (
        <section>
          <h2 style={heading}>Latest reports</h2>
          {latest.map((e) => <PieceLink key={e.slug} e={e} base={base} />)}
        </section>
      )}
      {(next.length > 0 || latest.length > 0) && (
        <Link href="/reports" className="xn-link no-hover-scale" style={{ borderBottom: 0 }}>
          <span className="xn-title">All reports →</span>
        </Link>
      )}
    </aside>
  );
}

const heading = { fontFamily: FONT, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: ACCENT, fontWeight: 'bold', margin: '0 0 6px' };

function PieceLink({ e, base }: { e: EditorialEntry; base: string }) {
  return (
    <Link href={`${base}/${e.slug}`} className="xn-link no-hover-scale">
      <span className="xn-title">{e.headline}</span>
      {listSummary(e) && <span className="xn-note">{listSummary(e)}</span>}
      <ContinueToArticle style={{ fontSize: '14px', marginTop: '4px' }} />
    </Link>
  );
}
