// "Explore next" block at the foot of every editorial (Investigations and Briefings), so a
// reader who finishes a piece always has somewhere sensible to go: the data pages behind
// the story and more pieces on the same subject.
//
// Sources, all static (no database reads):
//   - piece.explore: hand-picked links for this piece (shown first)
//   - lib/topics.ts: topics that list this piece contribute their data pages and topic page
//   - lib/editorials: up to three more pieces of the same kind, same topic first, then newest
// Added 15 Oct 2026 after analytics showed most search visitors read one page and left.

import Link from 'next/link';
import { editorials } from '@/lib/editorials';
import { topics } from '@/lib/topics';
import type { EditorialEntry } from '@/lib/editorials/types';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.18)';
const FONT = '"Special Elite", monospace';

type Item = { href: string; label: string; note?: string };

export default function ExploreNext({ piece }: { piece: EditorialEntry }) {
  const isBriefing = piece.kind === 'briefing';
  const pieceTopics = topics.filter((t) => t.editorialSlugs.includes(piece.slug));

  // Explore the data: hand-picked first, then each topic's data pages and topic page.
  const data: Item[] = [];
  const seen = new Set<string>();
  const add = (it: Item) => { if (!seen.has(it.href)) { seen.add(it.href); data.push(it); } };
  for (const it of piece.explore || []) add(it);
  for (const t of pieceTopics) for (const d of t.dataPages || []) add({ href: d.href, label: d.title, note: d.description });
  data.splice(8);
  // Each topic's own page always shows, after the hand-picked and data links.
  for (const t of pieceTopics) add({ href: `/topics/${t.slug}`, label: `Everything on ${t.title}`, note: 'Departments, votes, bills, MPs and reporting on this subject' });

  // Read next: same kind of piece, same topic first, then the newest.
  const all = Object.values(editorials).filter((e) => e.slug !== piece.slug && (e.kind === 'briefing') === isBriefing);
  const topicSlugs = new Set(pieceTopics.flatMap((t) => t.editorialSlugs));
  const byDate = (a: EditorialEntry, b: EditorialEntry) => (b.publishedAt || '').localeCompare(a.publishedAt || '');
  const picked = (piece.readNext || []).map((s) => editorials[s]).filter((e): e is EditorialEntry => !!e && e.slug !== piece.slug);
  const pickedSlugs = new Set(picked.map((e) => e.slug));
  const sameTopic = all.filter((e) => topicSlugs.has(e.slug) && !pickedSlugs.has(e.slug)).sort(byDate);
  // Then the pieces whose headline and standfirst share the most subject words with this one
  // (so a piece on tagging finds the earlier tagging investigation, audit E2), then the newest.
  const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'what', 'when', 'who', 'how', 'why', 'are', 'was', 'were', 'has', 'have', 'its', 'their', 'they', 'but', 'not', 'more', 'than', 'after', 'about', 'which', 'will', 'been', 'government', 'minister', 'ministers', 'uk', 'britain', 'british']);
  const words = (e: EditorialEntry) => new Set(`${e.headline} ${e.standfirst || ''}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, '')));
  const mine = words(piece);
  const overlap = (e: EditorialEntry) => { let n = 0; for (const w of words(e)) if (mine.has(w)) n++; return n; };
  const rest = all
    .filter((e) => !topicSlugs.has(e.slug) && !pickedSlugs.has(e.slug))
    .map((e) => ({ e, n: overlap(e) }))
    .sort((a, b) => (b.n >= 2 ? b.n : 0) - (a.n >= 2 ? a.n : 0) || byDate(a.e, b.e))
    .map((x) => x.e);
  const next = [...picked, ...sameTopic, ...rest].slice(0, 3);
  const base = isBriefing ? '/briefings' : '/editorials';

  if (!data.length && !next.length) return null;

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
        <section>
          <h2 style={heading}>{isBriefing ? 'More briefings' : 'More investigations'}</h2>
          {next.map((e) => (
            <Link key={e.slug} href={`${base}/${e.slug}`} className="xn-link no-hover-scale">
              <span className="xn-title">{e.headline}</span>
              {e.standfirst && <span className="xn-note">{e.standfirst.length > 160 ? `${e.standfirst.slice(0, 157).trimEnd()}…` : e.standfirst}</span>}
            </Link>
          ))}
          <Link href={base} className="xn-link no-hover-scale" style={{ borderBottom: 0 }}>
            <span className="xn-title">All {isBriefing ? 'briefings' : 'investigations'} →</span>
          </Link>
        </section>
      )}
    </aside>
  );
}

const heading = { fontFamily: FONT, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: ACCENT, fontWeight: 'bold', margin: '0 0 6px' };
