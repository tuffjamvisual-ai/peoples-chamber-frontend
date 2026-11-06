import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { LookupError, POSTCODE_RE, cleanPostcode, codesForPostcode } from '@/lib/area-lookup';
import { allConstituencies, type SeatListRow } from '@/lib/constituency-pages';
import { PetitionCredit } from '../petitions/PetitionCredit';

// All 650 constituencies by nation and region (owner, backlog item 15d, 6 Nov 2026). Search is a plain form, so it works with
// JavaScript off: a postcode goes through the site's existing lookup (lib/area-lookup.ts) to its seat, and anything else filters
// the names on a cached list. The nations and regions are native folds, so the page stays short at any width.
export const dynamic = 'force-dynamic';

type Search = { q?: string };
const INK = '#14100d';
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('en-GB');

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: 'UK constituencies: MPs and election results',
    description: 'All 650 UK parliamentary constituencies by nation and region: the MP, the 2024 result, byelections, petitions and councils.',
    alternates: { canonical: '/constituencies' },
    ...(q ? { robots: { index: false, follow: true } } : {}),
  };
}

function SeatLinks({ seats }: { seats: SeatListRow[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {seats.map((s) => (
        <li key={s.ons_code} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
          <Link href={`/constituencies/${s.slug}`} prefetch={false} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '16px', color: INK, textDecoration: 'underline', overflowWrap: 'anywhere' }}>{s.name}</Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ConstituenciesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const q = ((await searchParams).q ?? '').trim().slice(0, 100);
  const seats = await allConstituencies();
  let message: string | null = null;
  let target: string | null = null;
  const isPostcode = POSTCODE_RE.test(cleanPostcode(q));
  if (isPostcode) {
    try {
      const codes = await codesForPostcode(q);
      const seat = seats.find((s) => s.ons_code === codes.constituencyCode);
      if (seat) target = `/constituencies/${seat.slug}`;
      else message = 'We could not find a constituency for that postcode.';
    } catch (e) {
      if (!(e instanceof LookupError)) throw e;
      message = e.message;
    }
  }
  if (target) redirect(target); // outside the try: a redirect works by throwing
  const matches = q && !isPostcode ? seats.filter((s) => fold(s.name).includes(fold(q))) : null;
  const nations = ['England', 'Scotland', 'Wales', 'Northern Ireland'];

  return (
    <OpenGovShell pageStamp="Constituencies">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Constituencies', path: '/constituencies' }])} />
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: '15px' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>Constituencies</h1>
      <p style={{ fontSize: '16px', color: INK, margin: '0 0 16px', maxWidth: '720px', lineHeight: 1.6 }}>
        All {seats.length} UK parliamentary constituencies on the boundaries used since the 2024 general election, with each seat&rsquo;s MP,
        results in this Parliament, petitions and councils.
      </p>
      <form action="/constituencies" method="get" role="search" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0 0 16px', maxWidth: '720px' }}>
        <label htmlFor="constituency-search" style={{ flex: '1 0 100%', fontSize: '15px', fontWeight: 'bold', color: INK }}>Search by name or postcode</label>
        <input id="constituency-search" type="search" name="q" defaultValue={q} style={{ flex: '1 1 200px', minWidth: 0, minHeight: '44px', padding: '8px 10px', fontSize: '16px', color: INK, background: '#fbf4e6', border: `1px solid ${INK}`, borderRadius: 0, boxSizing: 'border-box' }} />
        <button type="submit" style={{ minHeight: '44px', padding: '8px 16px', fontSize: '15px', fontWeight: 'bold', color: '#fbf4e6', background: INK, border: `1px solid ${INK}`, borderRadius: 0, cursor: 'pointer' }}>Search</button>
      </form>
      {message && <p role="status" style={{ fontSize: '16px', color: INK, margin: '0 0 16px' }}>{message}</p>}
      {matches ? (
        <>
          <p role="status" style={{ fontSize: '15px', color: INK, margin: '0 0 8px' }}>
            {matches.length} {matches.length === 1 ? 'constituency' : 'constituencies'} · <Link href="/constituencies" prefetch={false} style={{ display: 'inline-block', padding: '12px 0', color: INK, textDecoration: 'underline' }}>All constituencies</Link>
          </p>
          {matches.length ? <SeatLinks seats={matches} /> : <p style={{ fontSize: '16px', color: INK }}>No constituency has that name.</p>}
        </>
      ) : nations.map((nation) => {
        const here = seats.filter((s) => s.nation === nation);
        const regions = [...new Set(here.map((s) => s.region).filter((r): r is string => !!r))].sort();
        return (
          <details key={nation} className="pa-fold" open={nation === 'England'}>
            <summary>{nation} ({here.length})</summary>
            {regions.length ? regions.map((region) => {
              const inRegion = here.filter((s) => s.region === region);
              return (
                <details key={region} className="pa-fold pa-year">
                  <summary>{region} ({inRegion.length})</summary>
                  <SeatLinks seats={inRegion} />
                </details>
              );
            }) : <SeatLinks seats={here} />}
          </details>
        );
      })}
      <PetitionCredit />
    </OpenGovShell>
  );
}
