import NoJsPager from '@/app/components/NoJsPager';
import { SubFold } from '@/app/components/PhoneFolds';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { cache } from 'react';
import Link from 'next/link';
import PageSources from '@/app/components/PageSources';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import ConstituencyPetitions from '../../mps/[id]/ConstituencyPetitions';
import { PetitionCredit } from '../../petitions/PetitionCredit';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { titleWithin } from '@/lib/seo-title';
import { displayMpName } from '@/lib/mp-name';
import { getSeat, seatDetail, type Candidate } from '@/lib/constituency-pages';
import { petitionDate, topPetitionsInConstituency } from '@/lib/petition-pages';

import BackLink from '@/app/components/BackLink';
// One constituency (owner, backlog item 15d, 6 Nov 2026), this Parliament only: its MP and every MP since 2024 with official dates
// and Parliament's own end reason, the 2024 result and any byelection, its most signed petitions, and the councils overlapping it.
// No commentary on why anyone left, and no local party donations in this version. Kept for a day.
export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const LINE = '1px solid rgba(20,16,13,0.25)';
const h2: CSSProperties = { fontSize: '22px', fontWeight: 'bold', color: INK, margin: '28px 0 8px' };
const para: CSSProperties = { fontSize: '16px', lineHeight: 1.6, color: INK, margin: '0 0 10px' };
const link: CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: INK, fontSize: '16px', textDecoration: 'underline' };
const n0 = (n: number) => n.toLocaleString('en-GB');
const pct = (n: number) => `${Number(n).toFixed(2)}%`;
const load = cache(getSeat);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const seat = await load((await params).slug);
  if (!seat) return { title: 'Constituency', robots: { index: false, follow: true } };
  return {
    title: titleWithin(`${seat.name} constituency`),
    description: `${seat.name}: its MP, the 2024 general election result, any byelection, the most signed petitions and the councils covering the seat.`.slice(0, 160),
    alternates: { canonical: `/constituencies/${seat.slug}` },
  };
}

function Result({ heading, date, summary, figures, candidates, fold = false }: { heading: string; date: string; url?: string; summary: string; figures: { electorate: number; valid: number; invalid: number; turnout: number; majority: number }; candidates: Candidate[]; fold?: boolean }) {
  const winner = candidates.find((c) => c.position === 1);
  const body = (
    <>
      <h2 style={h2}>{heading}</h2>
      <p style={para}>{petitionDate(date)}. {summary}.</p>
      <NoJsPager id={`cand-${candidates[0]?.election_id ?? heading.replace(/[^a-zA-Z0-9]+/g, '-')}`} count={candidates.length} rows="> li" size={25} first={3}>
      <ol style={{ listStyle: 'none', margin: '0 0 12px', padding: 0 }}>
        {candidates.map((c) => (
          <li key={`${c.election_id}-${c.position}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: LINE, color: INK }}>
            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <span style={{ display: 'block', fontSize: '16px', fontWeight: c.position === 1 ? 'bold' : 'normal' }}>{[c.given_name, c.family_name].filter(Boolean).join(' ')}</span>
              <span style={{ display: 'block', fontSize: '15px' }}>{c.party}{c.adjunct_party ? ` and ${c.adjunct_party}` : ''}</span>
            </span>
            <span style={{ flex: 'none', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ display: 'block', fontSize: '16px', fontWeight: c.position === 1 ? 'bold' : 'normal' }}>{n0(c.votes)}</span>
              <span style={{ display: 'block', fontSize: '15px' }}>{pct(c.share_pct)}</span>
            </span>
          </li>
        ))}
      </ol>
      </NoJsPager>
      <SubFold label="Majority, turnout and electorate">
      <dl style={{ margin: '0 0 8px', fontSize: '16px', color: INK }}>
        {([['Majority', n0(figures.majority)], ['Turnout', pct(figures.turnout)], ['Electorate', n0(figures.electorate)], ['Valid votes', n0(figures.valid)], ['Rejected ballots', n0(figures.invalid)]] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '4px 0' }}><dt style={{ fontWeight: 'bold' }}>{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>
        ))}
      </dl>
      </SubFold>
    </>
  );
  // UX5 (T1-6, 11 Nov 2026): on phones an earlier election is a closed fold, the latest stays open; from 640px up, as before.
  if (!fold) return body;
  return <SubFold label={heading} summary={winner ? [winner.given_name, winner.family_name].filter(Boolean).join(' ') : null}>{body}</SubFold>;
}

export default async function ConstituencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const seat = await load((await params).slug);
  if (!seat) notFound();
  const [{ candidates, byelections, terms, current }, petitions] = await Promise.all([seatDetail(seat.ons_code), topPetitionsInConstituency(seat.ons_code)]);
  const general = candidates.filter((c) => c.election_kind === 'general');
  const resigned = terms.some((t) => t.end_reason && /chiltern|northstead/i.test(t.end_reason));
  const allCouncils = [...seat.councils, ...(seat.county ? [seat.county] : [])];

  return (
    <OpenGovShell pageStamp="Constituency">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Constituencies', path: '/constituencies' }, { name: seat.name, path: `/constituencies/${seat.slug}` }])} />
      <BackLink fallbackHref="/constituencies" />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 'bold', lineHeight: 1.2, color: INK, margin: '0 0 6px', overflowWrap: 'anywhere' }}>{seat.name}</h1>
      <p style={{ ...para, margin: '0 0 14px' }}>{seat.region ? `${seat.region}, ${seat.nation}` : seat.nation}</p>

      {current && (
        <>
          <h2 data-main-action style={h2}>Current MP</h2>
          <p style={{ ...para, margin: '0 0 2px', fontWeight: 'bold' }}><Link href={`/mps/${current.member_id}`} prefetch={false} style={{ ...link, fontWeight: 'bold' }}>{displayMpName(current.name)}</Link></p>
          {current.party && <p style={para}>{current.party}</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {current.questions > 0 && <li><Link href={`/mps/${current.member_id}/questions`} prefetch={false} style={link}>Written questions</Link></li>}
            {current.motions > 0 && <li><Link href={`/edms?member=${current.member_id}`} prefetch={false} style={link}>Early day motions</Link></li>}
          </ul>
        </>
      )}

      <h2 style={h2}>MPs since 2024</h2>
      <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0 }}>
        {terms.map((t) => (
          <li key={`${t.member_id}-${t.start_date}`} style={{ padding: '8px 0', borderBottom: LINE, fontSize: '16px', color: INK }}>
            {/* The current MP is linked once, in the card above (T1-5x). */}
            {t.has_page && t.member_id !== current?.member_id ? <Link href={`/mps/${t.member_id}`} prefetch={false} style={link}>{displayMpName(t.name)}</Link> : <span style={{ fontWeight: 'bold' }}>{displayMpName(t.name)}</span>}
            <span style={{ display: 'block', fontSize: '15px' }}>
              {t.end_date ? `${petitionDate(t.start_date)} to ${petitionDate(t.end_date)}` : `Since ${petitionDate(t.start_date)}`}
              {t.end_reason ? `. ${t.end_reason}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {resigned && <p style={{ ...para, fontSize: '15px' }}>Taking the Chiltern Hundreds (or the Manor of Northstead) is the formal way an MP resigns.</p>}

      <Result fold={byelections.length > 0} heading="2024 general election" date="2024-07-04" url={seat.result_url} summary={seat.result_summary} candidates={general}
        figures={{ electorate: seat.electorate, valid: seat.valid_votes, invalid: seat.invalid_votes, turnout: seat.turnout_pct, majority: seat.majority }} />
      {byelections.map((b, bi) => (
        <Result fold={bi < byelections.length - 1} key={b.election_id} heading={`${petitionDate(b.election_date)!.replace(/^\d+ /, '')} byelection`} date={b.election_date} url={b.url} summary={b.result_summary} candidates={candidates.filter((c) => c.election_id === b.election_id)}
          figures={{ electorate: b.electorate, valid: b.valid_votes, invalid: b.invalid_votes, turnout: b.turnout_pct, majority: b.majority }} />
      ))}

      {/* UX5 (T1-6): on phones the petitions are a closed fold; from 640px up, as before. */}
      {petitions.petitions.length > 0 && <div style={{ marginTop: '28px' }}><SubFold label="Petitions in this constituency"><ConstituencyPetitions top={petitions} gss={seat.ons_code} /></SubFold></div>}

      <h2 style={h2}>{allCouncils.length === 1 ? 'Council' : 'Councils'}</h2>
      <p style={{ ...para, fontSize: '15px' }}>Councils with wards in this seat, from the ONS lookup of May 2025. Some may cover only a small part of it.</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {allCouncils.map((c) => <li key={c.slug}><Link href={`/councils/${c.slug}`} prefetch={false} style={link}>{c.name}</Link></li>)}
      </ul>

      <PetitionCredit />
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside; each result on the Commons Library’s site is in the page's one Sources fold. */}
      <PageSources sources={[
        seat.result_url && { label: '2024 general election result, House of Commons Library', href: seat.result_url },
        ...byelections.map((b) => b.url && { label: `${petitionDate(b.election_date)!.replace(/^\d+ /, '')} byelection result, House of Commons Library`, href: b.url }),
      ]} />
    </OpenGovShell>
  );
}
