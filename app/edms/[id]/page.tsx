import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { cache } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import MoreChain from '../../components/MoreChain';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { namedTitle } from '@/lib/seo-title';
import { metaDescription } from '@/lib/meta-description';
import { displayMpName } from '@/lib/mp-name';
import { allEdms, edmDetail, edmState, getEdm, type EdmSignature, type LinkedEdm } from '@/lib/edm-pages';
import { petitionDate } from '@/lib/petition-pages';

// One early day motion (owner, backlog item 15b, 6 Nov 2026): its title and text as tabled, number, date, sponsors, every signature
// with date and party, withdrawn signatures marked, and amendments. Addressed by Parliament's motion id, because numbers repeat
// across sessions; /edms/<number> goes to the list of motions with that number. Kept for a day and refreshed by /api/sync-edms.
// Signature dates are the date part of Parliament's time, which carries no time zone, so no conversion can move one to another day.
export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const LINE = '1px solid rgba(20,16,13,0.25)';
const h2: CSSProperties = { fontSize: '22px', fontWeight: 'bold', color: INK, margin: '28px 0 8px' };
const para: CSSProperties = { fontSize: '16px', lineHeight: 1.65, color: INK, margin: '0 0 12px', whiteSpace: 'pre-line', overflowWrap: 'anywhere' };
const link: CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: INK, fontSize: '16px', textDecoration: 'underline', overflowWrap: 'anywhere' };
const n0 = (n: number) => n.toLocaleString('en-GB');
const load = cache(async (raw: string) => (/^\d{1,9}$/.test(raw) ? getEdm(Number(raw)) : null));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = await load((await params).id);
  if (!m) return { title: 'Early day motion', robots: { index: false, follow: true } };
  return {
    // The number always stays, so motions with the same title never share one (owner, 7 Nov 2026); the title is never cut.
    title: namedTitle(m.title, (n) => [`EDM ${m.uin_with_suffix}: ${n}`]),
    description: metaDescription(`${m.title}. Early day motion ${m.uin_with_suffix}, tabled ${petitionDate(m.date_tabled)}, with ${n0(m.signature_count)} signatures.`),
    alternates: { canonical: `/edms/${m.id}` },
  };
}

const Name = ({ s }: { s: Pick<EdmSignature, 'member_id' | 'member_name' | 'has_page'> }) => (s.has_page
  ? <Link href={`/mps/${s.member_id}`} prefetch={false} style={link}>{displayMpName(s.member_name)}</Link>
  : <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontSize: '16px' }}>{displayMpName(s.member_name)}</span>);

const Motion = ({ m }: { m: LinkedEdm }) => <Link href={`/edms/${m.id}`} prefetch={false} style={link}>EDM {m.uin_with_suffix}: {m.title}</Link>;

export default async function EdmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await load(id);
  // Numbers are far below Parliament's ids and repeat across sessions, so a number goes to the list of motions with it.
  if (!m && /^\d{1,5}([A-Za-z]\d*)?$/.test(id)) redirect(`/edms?q=${encodeURIComponent(id)}`);
  if (!m) notFound();
  const [{ signatures, amendments, parent }, { sessionStart }] = await Promise.all([edmDetail(m), allEdms()]);
  const live = signatures.filter((s) => !s.is_withdrawn);
  const primary = live.find((s) => s.member_id === m.primary_sponsor_id) ?? signatures.find((s) => s.member_id === m.primary_sponsor_id);
  const sponsors = live.filter((s) => s.sponsoring_order != null && s.sponsoring_order <= 6 && s.member_id !== m.primary_sponsor_id);
  const withdrawn = signatures.length - live.length;
  const facts: [string, string][] = [
    ['Number', `EDM ${m.uin_with_suffix}`],
    ['Tabled', petitionDate(m.date_tabled)!],
    ['State', edmState(m, sessionStart)],
    ['Signatures', withdrawn ? `${n0(m.signature_count)}, and ${n0(withdrawn)} withdrawn` : n0(m.signature_count)],
  ];

  return (
    <OpenGovShell pageStamp="Motion">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Early day motions', path: '/edms' }, { name: m.title, path: `/edms/${m.id}` }])} />
      <Link href="/edms" prefetch={false} className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: '15px' }}>← All early day motions</Link>
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 'bold', lineHeight: 1.2, color: INK, margin: '0 0 14px', overflowWrap: 'anywhere' }}>{m.title}</h1>
      <dl style={{ margin: '0 0 18px', fontSize: '16px', color: INK }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexWrap: 'wrap', gap: '0 8px', padding: '6px 0', borderBottom: LINE }}>
            <dt style={{ fontWeight: 'bold', minWidth: '96px' }}>{k}</dt>
            <dd style={{ margin: 0 }}>{v}</dd>
          </div>
        ))}
      </dl>

      {m.is_prayer && <p style={para}>Prayer against a statutory instrument{m.statutory_instrument_title ? `: ${m.statutory_instrument_title}` : ''}.</p>}
      {parent && <><h2 style={h2}>Amends</h2><Motion m={parent} /></>}

      <h2 style={h2}>Motion</h2>
      <p style={para}>{m.motion_text}</p>

      {primary && (
        <>
          <h2 style={h2}>Primary sponsor</h2>
          <Name s={primary} />
        </>
      )}
      {sponsors.length > 0 && (
        <>
          <h2 style={h2}>Sponsors</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{sponsors.map((s) => <li key={s.member_id}><Name s={s} /></li>)}</ul>
        </>
      )}

      {amendments.length > 0 && (
        <>
          <h2 style={h2}>Amendments</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{amendments.map((a) => <li key={a.id}><Motion m={a} /></li>)}</ul>
        </>
      )}

      {signatures.length > 0 && (
        <>
          <h2 style={h2}>Signatures</h2>
          <MoreChain
            step={25}
            items={signatures.map((s) => (
              <li key={s.member_id} style={{ padding: '4px 0 8px', borderBottom: LINE, color: INK }}>
                <Name s={s} />
                <span style={{ display: 'block', fontSize: '15px' }}>
                  {s.party}
                  {s.signed_at ? ` · Signed ${petitionDate(s.signed_at.slice(0, 10))}` : ''}
                  {s.is_withdrawn ? ` · Withdrawn${s.withdrawn_at ? ` ${petitionDate(s.withdrawn_at.slice(0, 10))}` : ''}` : ''}
                </span>
              </li>
            ))}
          />
        </>
      )}

      <p style={{ fontSize: '16px', margin: '24px 0 0' }}><a href={`https://edm.parliament.uk/early-day-motion/${m.id}`} target="_blank" rel="noopener noreferrer" style={link}>The official motion on edm.parliament.uk</a></p>
    </OpenGovShell>
  );
}
