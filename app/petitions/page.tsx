import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import MoreChain from '../components/MoreChain';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { allPetitions, petitionDate, petitionsInConstituency } from '@/lib/petition-pages';
import { PetitionCredit } from './PetitionCredit';

// Every petition this Parliament that reached 10,000 signatures (owner, backlog item 15a, 6 Nov 2026), newest first, 25 at a
// time. The filters and search are links and a plain form, so they work with JavaScript off; they filter a cached list, so
// they cost no database read. /petitions?constituency=<code> is the MP page's "more" link.
export const dynamic = 'force-dynamic';

type Search = { state?: string; responded?: string; debated?: string; q?: string; constituency?: string };

const INK = '#14100d';
const ACCENT = '#7a1612';
const filtered = (s: Search) => !!(s.state || s.responded || s.debated || s.q || s.constituency);

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const s = await searchParams;
  return {
    title: 'Petitions that reached 10,000 signatures',
    description: 'Every UK Parliament petition since the July 2024 general election with 10,000 signatures or more: the government response, any debate, and signatures by constituency.',
    alternates: { canonical: '/petitions' },
    ...(filtered(s) ? { robots: { index: false, follow: true } } : {}),
  };
}

const n0 = (n: number) => n.toLocaleString('en-GB');

export default async function PetitionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const state = s.state === 'open' || s.state === 'closed' ? s.state : null;
  const responded = s.responded === '1';
  const debated = s.debated === '1';
  const q = (s.q ?? '').trim().slice(0, 100);
  const gss = /^[A-Z][0-9]{8}$/.test(s.constituency ?? '') ? s.constituency! : null;

  const [all, place] = await Promise.all([allPetitions(), gss ? petitionsInConstituency(gss) : null]);
  const needle = q.toLocaleLowerCase('en-GB');
  let rows = all.filter((p) => (!state || p.state === state) && (!responded || p.government_response_at) && (!debated || p.debated_on) && (!needle || p.action.toLocaleLowerCase('en-GB').includes(needle)));
  if (place) rows = rows.filter((p) => place.counts[p.id]).sort((a, b) => place.counts[b.id] - place.counts[a.id]);

  // A filter's link: the current choices with this one changed. Keeps the others, so filters combine.
  const href = (over: Partial<Record<keyof Search, string | null>>) => {
    const p = new URLSearchParams();
    const pick = { state, responded: responded ? '1' : null, debated: debated ? '1' : null, q: q || null, constituency: gss, ...over };
    for (const [k, v] of Object.entries(pick)) if (v) p.set(k, v);
    const text = p.toString();
    return text ? `/petitions?${text}` : '/petitions';
  };
  const chips: { label: string; on: boolean; to: string }[] = [
    { label: 'Open', on: state === 'open', to: href({ state: state === 'open' ? null : 'open' }) },
    { label: 'Closed', on: state === 'closed', to: href({ state: state === 'closed' ? null : 'closed' }) },
    { label: 'Government responded', on: responded, to: href({ responded: responded ? null : '1' }) },
    { label: 'Debated', on: debated, to: href({ debated: debated ? null : '1' }) },
  ];

  const items = rows.map((p) => (
    <li key={p.id} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
      <Link href={`/petitions/${p.id}`} prefetch={false} className="no-hover-scale" style={{ display: 'block', minHeight: '44px', padding: '12px 0', color: INK, textDecoration: 'none' }}>
        <span style={{ display: 'block', fontSize: '17px', fontWeight: 'bold', lineHeight: 1.35, textDecoration: 'underline', overflowWrap: 'anywhere' }}>{p.action}</span>
        <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '4px' }}>
          {place ? <>{n0(place.counts[p.id])} here, {n0(p.signature_count)} in total</> : <>{n0(p.signature_count)} signatures</>}
          {' · '}{p.state === 'open' ? 'Open' : 'Closed'}
          {p.opened_at && <> · Opened {petitionDate(p.opened_at)}</>}
          {p.government_response_at && <> · Government responded</>}
          {p.debated_on && <> · Debated</>}
        </span>
      </Link>
    </li>
  ));

  return (
    <OpenGovShell>
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Petitions', path: '/petitions' }])} />
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: '15px' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>{place?.name ? `Petitions most signed in ${place.name}` : 'Petitions'}</h1>
      <p style={{ fontSize: '16px', color: INK, margin: '0 0 16px', maxWidth: '720px', lineHeight: 1.6 }}>
        Petitions on Parliament&rsquo;s petitions site since the July 2024 general election that reached 10,000 signatures, the point at which the
        government must respond. Petitions with fewer signatures are not included.
      </p>

      <form action="/petitions" method="get" role="search" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0 0 12px', maxWidth: '720px' }}>
        <label htmlFor="petition-search" style={{ flex: '1 0 100%', fontSize: '15px', fontWeight: 'bold', color: INK }}>Search by title</label>
        <input id="petition-search" type="search" name="q" defaultValue={q} style={{ flex: '1 1 200px', minWidth: 0, minHeight: '44px', padding: '8px 10px', fontSize: '16px', color: INK, background: '#fbf4e6', border: `1px solid ${INK}`, borderRadius: 0, boxSizing: 'border-box' }} />
        {state && <input type="hidden" name="state" value={state} />}
        {responded && <input type="hidden" name="responded" value="1" />}
        {debated && <input type="hidden" name="debated" value="1" />}
        {gss && <input type="hidden" name="constituency" value={gss} />}
        <button type="submit" style={{ minHeight: '44px', padding: '8px 16px', fontSize: '15px', fontWeight: 'bold', color: '#fbf4e6', background: INK, border: `1px solid ${INK}`, borderRadius: 0, cursor: 'pointer' }}>Search</button>
      </form>

      <ul aria-label="Filters" style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0 0 12px', padding: 0 }}>
        {chips.map((c) => (
          <li key={c.label}>
            <Link href={c.to} prefetch={false} aria-current={c.on ? 'true' : undefined} className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '6px 12px', fontSize: '15px', boxSizing: 'border-box', textDecoration: 'none', border: `1px solid ${INK}`, color: c.on ? '#fbf4e6' : INK, background: c.on ? ACCENT : 'transparent' }}>{c.label}</Link>
          </li>
        ))}
      </ul>

      <p role="status" style={{ fontSize: '15px', color: INK, margin: '0 0 8px' }}>
        {n0(rows.length)} {rows.length === 1 ? 'petition' : 'petitions'}{place ? ', most signed first' : ', newest first'}
        {filtered(s) && <> · <Link href="/petitions" prefetch={false} style={{ display: 'inline-block', padding: '12px 0', color: INK, textDecoration: 'underline' }}>Clear filters</Link></>}
      </p>

      {rows.length === 0 ? <p style={{ fontSize: '16px', color: INK, margin: '16px 0' }}>No petitions match.</p> : <MoreChain items={items} step={25} />}

      <PetitionCredit />
    </OpenGovShell>
  );
}
