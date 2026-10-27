// /bills/sessions/[id]: every bill in one parliamentary session, Acts, withdrawn and defeated bills included, grouped
// by what became of it in that session (lib/parliament-sessions.ts sessionBillGroup). A bill carried over appears in
// each session it sat in. [id] is Parliament's session ID (e.g. 39 = 2024-26).
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import {
  getParliamentSession, getParliamentSessions, getSessionBills, sessionBillGroup, sessionDates, sessionTitle,
  SESSION_GROUPS, type SessionBill, type SessionBillGroup,
} from '@/lib/parliament-sessions';

export const revalidate = 3600;
export async function generateStaticParams() { return []; }

type Props = { params: Promise<{ id: string }> };

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.18)';

const parseId = (id: string) => (/^\d{1,3}$/.test(id) ? Number(id) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const s = id == null ? null : await getParliamentSession(id);
  if (!s) return { title: 'Session not found' };
  return {
    title: `Bills in the ${sessionTitle(s)} of UK Parliament`,
    description: `All ${s.bills_listed.toLocaleString()} bills in the ${sessionTitle(s)} (${sessionDates(s)}): which became law, which were carried over, withdrawn or ran out of time.`,
    alternates: { canonical: `/bills/sessions/${s.id}` },
  };
}

const fmt = (d: string | null) => {
  if (!d) return '';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export default async function BillSessionPage({ params }: Props) {
  const id = parseId((await params).id);
  if (id == null) notFound();
  const [session, all, bills] = await Promise.all([getParliamentSession(id), getParliamentSessions(), getSessionBills(id)]);
  if (!session) notFound();
  const names = new Map(all.map((s) => [s.id, s]));
  const nameOf = (sid: number | null) => (sid == null ? '' : sessionTitle({ id: sid, name: names.get(sid)?.name }));

  const groups = new Map<SessionBillGroup, SessionBill[]>();
  for (const b of bills) {
    const g = sessionBillGroup(b, id, session.is_current);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(b);
  }
  const older = all.find((s) => s.id < id);
  const newer = [...all].reverse().find((s) => s.id > id);

  return (
    <OpenGovShell pageStamp="Bills">
      <BackLink fallbackHref="/bills/sessions" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
          <Link href="/bills/sessions" style={{ color: INK }}>Bills by session</Link>
          {session.parliament_number && session.session_number ? <> · Parliament {session.parliament_number}, session {session.session_number}</> : null}
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)' }}>
          {sessionTitle(session)}
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          {sessionDates(session).replace(/^since/, 'Since')}. {session.bills_introduced.toLocaleString()} {session.bills_introduced === 1 ? 'bill was' : 'bills were'} introduced
          {session.bills_carried_in > 0 && <>, and {session.bills_carried_in} carried over into it from an earlier session</>}.
          {session.is_current && <> The bills still going through Parliament are also on <Link href="/bills" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Bills in Parliament</Link>, with votes.</>}
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexWrap: 'wrap', gap: '8px 18px', fontSize: '15px' }}>
          {SESSION_GROUPS.filter((g) => groups.has(g.key)).map((g) => (
            <li key={g.key}><a href={`#${g.key}`} style={{ color: INK }}>{g.heading}: {groups.get(g.key)!.length.toLocaleString()}</a></li>
          ))}
        </ul>
      </header>

      {SESSION_GROUPS.filter((g) => groups.has(g.key)).map((g) => (
        <section key={g.key} id={g.key} style={{ marginBottom: '32px', scrollMarginTop: '120px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: ACCENT, borderBottom: `1px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '6px' }}>
            {g.heading} <span style={{ fontWeight: 'normal', color: INK }}>({groups.get(g.key)!.length.toLocaleString()})</span>
          </h2>
          <p style={{ fontSize: '15px', marginBottom: '8px' }}>{g.note}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {groups.get(g.key)!.map((b) => {
              const meta = [
                g.key === 'carried' && b.latest_session_id ? `continued in the ${nameOf(b.latest_session_id)}` : '',
                !b.introduced_here ? `carried over from the ${nameOf(b.introduced_session_id)}` : '',
                g.key !== 'law' && b.current_stage ? `last stage: ${b.current_stage}${b.stage_date ? `, ${fmt(b.stage_date)}` : ''}` : '',
                g.key === 'law' && b.current_stage === 'Royal Assent' && b.stage_date ? `Royal Assent ${fmt(b.stage_date)}` : '',
                b.sponsor_name ? b.sponsor_name : '',
              ].filter(Boolean);
              return (
                <li key={b.bill_id} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '9px 0' }}>
                  <Link href={`/bills/${b.bill_id}`} style={{ color: INK, fontSize: '16px', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: HAIRLINE }}>
                    {b.title}
                  </Link>
                  {meta.length > 0 && <div style={{ fontSize: '15px', marginTop: '2px' }}>{meta.join(' · ')}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <nav style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginTop: '12px', fontSize: '16px' }}>
        {older ? <Link href={`/bills/sessions/${older.id}`} style={{ color: INK }}>← {sessionTitle(older)}</Link> : <span />}
        {newer ? <Link href={`/bills/sessions/${newer.id}`} style={{ color: INK }}>{sessionTitle(newer)} →</Link> : <span />}
      </nav>
    </OpenGovShell>
  );
}
