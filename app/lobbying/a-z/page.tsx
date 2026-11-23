import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import LetterLinks from './LetterLinks';
import { lobbyingByLetter } from '@/lib/lobbying-az';

// /lobbying/a-z (owner approved 23 Nov 2026, Cowork ENTRY 536 item 2): the A to Z of every organisation with a lobbying
// page, one page per letter, so every lobbying page is a plain link from an indexable page (/lobbying shows a ranking of
// 30). Static: rebuilt only when the rankings' tag is refreshed or on a deploy; no new reads (lib/lobbying-az.ts).
export const revalidate = false;

const INK = '#14100d';
const ACCENT = '#7a1612';

export const metadata: Metadata = {
  title: 'Lobbying: every organisation, A to Z',
  description: 'Every organisation in the ministerial meetings and consultant lobbying registers, A to Z; open a letter to see each one.',
  alternates: { canonical: '/lobbying/a-z' },
};

export default async function LobbyingAZ() {
  const byLetter = await lobbyingByLetter();
  const counts = new Map([...byLetter].map(([l, list]) => [l, list.length]));
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  return (
    <OpenGovShell pageStamp="Lobbying">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Lobbying', path: '/lobbying' }, { name: 'A to Z', path: '/lobbying/a-z' }])} />
      <BackLink fallbackHref="/lobbying" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>Lobbying: every organisation, A to Z</h1>
      <p style={{ fontSize: '16px', color: INK, margin: '0 0 8px', maxWidth: '720px', lineHeight: 1.6 }}>
        {total.toLocaleString('en-GB')} organisations in the ministerial meetings and consultant lobbying registers. Choose a letter.{' '}
        <Link href="/lobbying" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>The rankings</Link>
      </p>
      <LetterLinks counts={counts} />
    </OpenGovShell>
  );
}
