// The one Related list at the foot of every report and briefing (T1-5x S6, owner 10 Nov 2026): at most three links, one
// link per destination, chosen in this order: the piece's own related links (reports) or Read next (briefings), then the
// data pages behind the story, then more reports on the same subject (lib/explore-next.ts). No "All reports" link (the back
// link goes there) and no cards: each report is one link, its title. It replaced "Explore the data and more reports" (15 Oct
// 2026), the Related line and the Read next box, which together could list a page three times.
import Link from 'next/link';
import type { EditorialEntry } from '@/lib/editorials/types';
import { exploreNextSelection } from '@/lib/explore-next';

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.18)';
export const RELATED_MAX = 3;

export default async function ExploreNext({ piece, lead = [] }: { piece: EditorialEntry; lead?: { href: string; label: string }[] }) {
  const { base, data, next, latest } = await exploreNextSelection(piece);
  const seen = new Set<string>();
  const links: { href: string; label: string }[] = [];
  const add = (href: string, label: string) => { if (links.length < RELATED_MAX && !seen.has(href)) { seen.add(href); links.push({ href, label }); } };
  for (const l of lead) add(l.href, l.label);
  for (const d of data) add(d.href, d.label);
  for (const e of [...next, ...latest]) add(`${base}/${e.slug}`, e.headline);
  if (!links.length) return null;
  return (
    <nav aria-label="Related" style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: '16px', margin: '8px 0 24px', fontSize: '15px', lineHeight: 1.7, color: INK }}>
      <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 6px' }}>Related</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {links.map((l) => (
          <li key={l.href} style={{ margin: '0 0 6px', overflowWrap: 'anywhere' }}>
            <Link href={l.href} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
