import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import LetterLinks from '../LetterLinks';
import { LETTERS, lobbyingByLetter, lobbyingLetterHref } from '@/lib/lobbying-az';

// /lobbying/a-z/<letter> (owner approved 23 Nov 2026, Cowork ENTRY 536 item 2): every organisation with a lobbying page
// under one letter, A to Z, each a plain link. Indexable, canonical to itself; a letter with none, or not a letter, is a
// 404. Static: rebuilt only when the rankings' tag is refreshed or on a deploy; no new reads.
export const revalidate = false;
export function generateStaticParams() { return []; }

const INK = '#14100d';

type Params = { letter: string };

async function letterFor(params: Promise<Params>) {
  const letter = (await params).letter;
  if (!(LETTERS as readonly string[]).includes(letter)) return null;
  const byLetter = await lobbyingByLetter();
  const list = byLetter.get(letter) ?? [];
  return list.length ? { letter, list, counts: new Map([...byLetter].map(([l, x]) => [l, x.length])) } : null;
}

const label = (l: string) => (l === '0-9' ? 'numbers and symbols' : `the letter ${l.toUpperCase()}`);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const x = await letterFor(params);
  if (!x) notFound();
  return {
    title: `Lobbying: organisations under ${x.letter.toUpperCase()}`,
    description: `Every organisation under ${label(x.letter)} in the ministerial meetings and consultant lobbying registers, A to Z.`,
    alternates: { canonical: lobbyingLetterHref(x.letter) },
  };
}

export default async function LobbyingLetter({ params }: { params: Promise<Params> }) {
  const x = await letterFor(params);
  if (!x) notFound();
  const { letter, list, counts } = x;
  return (
    <OpenGovShell pageStamp="Lobbying">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Lobbying', path: '/lobbying' }, { name: 'A to Z', path: '/lobbying/a-z' }, { name: letter.toUpperCase(), path: lobbyingLetterHref(letter) }])} />
      <BackLink fallbackHref="/lobbying/a-z" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>Lobbying: organisations under {letter.toUpperCase()}</h1>
      <p style={{ fontSize: '16px', color: INK, margin: '0 0 8px', maxWidth: '720px', lineHeight: 1.6 }}>
        {list.length.toLocaleString('en-GB')} {list.length === 1 ? 'organisation' : 'organisations'} under {label(letter)}, A to Z.
      </p>
      <LetterLinks counts={counts} current={letter} />
      <ul aria-label={`Organisations under ${letter.toUpperCase()}`} style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '720px' }}>
        {list.map((o) => (
          <li key={o.slug} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
            <Link href={`/lobbying/${o.slug}`} prefetch={false} className="no-hover-scale" style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '8px 0', color: INK, textDecoration: 'underline', fontSize: '17px', overflowWrap: 'anywhere' }}>{o.name}</Link>
          </li>
        ))}
      </ul>
    </OpenGovShell>
  );
}
