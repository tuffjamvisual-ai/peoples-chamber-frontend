import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { cache } from 'react';
import Link from 'next/link';
import PageSources from '@/app/components/PageSources';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { markedCutTitle } from '@/lib/seo-title';
import { asSentence, wholeSentences } from '@/lib/meta-description';
import { getPetition, isRevisedResponse, ourDebateGuid, petitionConstituencies, petitionDate, type PetitionConstituency } from '@/lib/petition-pages';
import { PetitionCredit } from '../PetitionCredit';
import { ShowAll } from '../../components/NoJsPager';
import { SubFold } from '../../components/PhoneFolds';

import BackLink from '@/app/components/BackLink';
// One petition (owner, backlog item 15a, 6 Nov 2026): the title, background and details as written, its dates and count, the
// government response in full, any debate, and signatures by constituency. Kept for a day and refreshed by /api/sync-petitions
// when the petition changes. A petition that crosses 10,000 gets a row from the sync, and so this page, on its first visit.
export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const load = cache(async (raw: string) => {
  const id = Number(raw);
  return /^\d{1,9}$/.test(raw) && id > 0 ? getPetition(id) : null;
});
const n0 = (n: number) => n.toLocaleString('en-GB');

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  if (!p) return { title: 'Petition', robots: { index: false, follow: true } };
  return {
    title: markedCutTitle(p.action, (n) => [`Petition: ${n}`, n]),
    // Whole sentences (owner, 7 Nov 2026, L6): the petition's own words, its signatures, and the government response and
    // debate dates the page shows, each sentence kept only where it fits in 160 characters.
    description: wholeSentences([
      asSentence(p.action),
      `This UK Parliament petition has ${n0(p.signature_count)} ${p.signature_count === 1 ? 'signature' : 'signatures'}.`,
      p.government_response_on && `The government responded on ${petitionDate(p.government_response_on)}.`,
      p.debated_on && `Parliament debated it on ${petitionDate(p.debated_on)}.`,
    ]),
    alternates: { canonical: `/petitions/${p.id}` },
  };
}

const h2: CSSProperties = { fontSize: '22px', fontWeight: 'bold', color: INK, margin: '28px 0 8px' };
const para: CSSProperties = { fontSize: '16px', lineHeight: 1.65, color: INK, margin: '0 0 12px', whiteSpace: 'pre-line', overflowWrap: 'anywhere' };
const link: CSSProperties = { display: 'inline-block', padding: '10px 0', color: INK, textDecoration: 'underline', overflowWrap: 'anywhere' };

// Text as written: its blank lines make paragraphs, its line breaks stay, and a web address in it can be followed.
function AsWritten({ text }: { text: string }) {
  return (
    <>
      {text.split(/\r?\n\s*\r?\n/).map((block, i) => (
        <p key={i} data-og-citations="" style={para}>
          {block.split(/(https?:\/\/[^\s<>]+)/g).map((part, j): ReactNode => (/^https?:\/\//.test(part)
            ? <a key={j} href={part} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>{part}</a>
            : part.replace(/\r/g, '')))}
        </p>
      ))}
    </>
  );
}

function Row({ c }: { c: PetitionConstituency }) {
  const inner = <span style={{ overflowWrap: 'anywhere' }}>{c.name}</span>;
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', minHeight: '44px', borderBottom: '1px solid rgba(20,16,13,0.25)', fontSize: '16px', color: INK }}>
      {c.memberId
        ? <Link href={`/mps/${c.memberId}`} prefetch={false} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', color: INK, textDecoration: 'underline' }}>{inner}</Link>
        : inner}
      <span style={{ flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{n0(c.count)}</span>
    </li>
  );
}

export default async function PetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await load(id);
  if (!p) notFound();
  const [places, debateGuid] = await Promise.all([petitionConstituencies(p.id), ourDebateGuid(p.debate_transcript_url)]);
  const top = places.slice(0, 10);
  const rest = places.slice(10);
  const today = new Date().toISOString().slice(0, 10);
  const facts: [string, string][] = [
    ['State', p.state === 'open' ? 'Open' : p.state === 'closed' ? 'Closed' : p.state],
    ...(p.opened_at ? [['Opened', petitionDate(p.opened_at)!] as [string, string]] : []),
    ...(p.closed_at ? [['Closed', petitionDate(p.closed_at)!] as [string, string]] : []),
    ['Signatures', p.checked_at ? `${n0(p.signature_count)}, counted on ${petitionDate(p.checked_at)}` : n0(p.signature_count)],
  ];
  const revised = isRevisedResponse(p);

  return (
    <OpenGovShell pageStamp="Petition">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Petitions', path: '/petitions' }, { name: p.action, path: `/petitions/${p.id}` }])} />
      <BackLink fallbackHref="/petitions" />
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 'bold', lineHeight: 1.2, color: INK, margin: '0 0 14px', overflowWrap: 'anywhere' }}>{p.action}</h1>

      {/* The main action (UX3a, A6): the record's facts. */}
      <dl data-main-action style={{ margin: '0 0 18px', fontSize: '16px', color: INK }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexWrap: 'wrap', gap: '0 8px', padding: '6px 0', borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
            <dt style={{ fontWeight: 'bold', minWidth: '96px' }}>{k}</dt>
            <dd style={{ margin: 0 }}>{v}</dd>
          </div>
        ))}
      </dl>

      {p.background && <><h2 style={h2}>Background</h2><AsWritten text={p.background} /></>}
      {p.additional_details && <><h2 style={h2}>Details</h2><AsWritten text={p.additional_details} /></>}

      <h2 style={h2}>Government response</h2>
      {p.government_response_details || p.government_response_summary ? (
        <>
          <p style={{ ...para, fontWeight: 'bold' }}>
            {revised ? 'Revised response' : 'Response'}{p.government_response_on ? `, ${petitionDate(p.government_response_on)}` : ''}
          </p>
          {revised && (
            <p style={para}>
              Parliament&rsquo;s record of the response is on the <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>official petition</a>.
            </p>
          )}
          {p.government_response_summary && <div style={{ fontWeight: 'bold' }}><AsWritten text={p.government_response_summary} /></div>}
          {/* Phones (step 5, 10 Nov 2026; the page was 5,578px): the summary shows and the full response is folded. */}
          {p.government_response_details && <SubFold label="The full response"><AsWritten text={p.government_response_details} /></SubFold>}
        </>
      ) : <p style={para}>The government has not responded yet.</p>}

      {(p.debated_on || p.scheduled_debate_date || p.debate_overview) && (
        <>
          <h2 style={h2}>Debate</h2>
          {p.debated_on ? (
            <>
              <p style={para}>Debated on {petitionDate(p.debated_on)}.</p>
              <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, fontSize: '16px' }}>
                {debateGuid && <li><Link href={`/debates/${debateGuid}`} prefetch={false} style={link}>Read the debate</Link></li>}
              </ul>
            </>
          ) : p.scheduled_debate_date ? (
            <p style={para}>{p.scheduled_debate_date >= today ? 'Debate scheduled for' : 'A debate was scheduled for'} {petitionDate(p.scheduled_debate_date)}.</p>
          ) : null}
          {p.debate_overview && (
            <>
              {!p.debated_on && p.debate_outcome_at && <p style={{ ...para, fontWeight: 'bold' }}>Petitions Committee, {petitionDate(p.debate_outcome_at)}</p>}
              <SubFold label="The Committee's overview"><AsWritten text={p.debate_overview} /></SubFold>
            </>
          )}
        </>
      )}

      {places.length > 0 && (
        <>
          <h2 style={h2}>Signatures by constituency</h2>
          <p style={{ ...para, fontSize: '15px' }}>Each constituency links to its MP&rsquo;s page.</p>
          <ShowAll id="pet-top" count={top.length} rows="> li"><ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>{top.map((c) => <Row key={c.gss} c={c} />)}</ol></ShowAll>
          {rest.length > 0 && (
            <details className="mc-more">
              <summary>Show the other {n0(rest.length)} {rest.length === 1 ? 'constituency' : 'constituencies'}</summary>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>{rest.map((c) => <Row key={c.gss} c={c} />)}</ol>
            </details>
          )}
        </>
      )}

      <PetitionCredit />
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside; the official record is in the page's one Sources fold. */}
      <PageSources sources={[
        p.url && { label: 'The petition on UK Parliament\u2019s petitions website', href: p.url },
        p.debate_transcript_url && { label: 'The debate in Hansard', href: p.debate_transcript_url },
      ]} />
    </OpenGovShell>
  );
}
