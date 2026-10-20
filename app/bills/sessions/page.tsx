// /bills/sessions: the archive of bills by parliamentary session (owner's decision, 20 Oct 2026). Each session links
// to /bills/sessions/[id], which lists every bill in it by what became of it. Names and dates: Parliament's calendar
// API (lib/parliament-sessions.ts).
import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { getParliamentSessions, sessionDates, sessionTitle, SESSIONS_SOURCE_URL } from '@/lib/parliament-sessions';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'UK Parliament Bills by Session, 2004 to Now',
  description:
    'Every bill in UK Parliament since the 2004-05 session, by session: which became law, which were withdrawn, carried over or ran out of time.',
  alternates: { canonical: '/bills/sessions' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.18)';

export default async function BillSessionsPage() {
  const sessions = await getParliamentSessions();
  const total = sessions.reduce((n, s) => n + s.bills_introduced, 0);

  return (
    <OpenGovShell pageStamp="Bills">
      <BackLink fallbackHref="/bills" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)' }}>
          Bills by session
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Parliament works in sessions, usually about a year long. A bill that has not passed when a session ends falls,
          unless Parliament agrees to carry it over. {total.toLocaleString()} bills across {sessions.length} sessions; each
          session lists every bill, including Acts and withdrawn bills.
        </p>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', marginTop: '8px' }}>
          The bills going through Parliament now are on <Link href="/bills" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Bills in Parliament</Link>.
        </p>
      </header>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: `1px solid ${HAIRLINE}` }}>
        {sessions.map((s) => (
          <li key={s.id} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '14px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '16px', rowGap: '4px' }}>
            <Link href={`/bills/sessions/${s.id}`} style={{ color: INK, fontSize: '19px', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationColor: HAIRLINE }}>
              {sessionTitle(s)}
            </Link>
            {s.is_current && (
              <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em', color: ACCENT, border: `1px solid ${ACCENT}`, padding: '1px 8px' }}>Current</span>
            )}
            <span style={{ fontSize: '15px', opacity: 0.75 }}>{sessionDates(s)}</span>
            <span style={{ fontSize: '15px', marginLeft: 'auto' }}>
              {s.bills_introduced.toLocaleString()} {s.bills_introduced === 1 ? 'bill' : 'bills'} introduced
              {s.bills_carried_in > 0 && <>, {s.bills_carried_in} carried over into it</>}
            </span>
          </li>
        ))}
      </ol>

      <p style={{ fontSize: '14px', lineHeight: 1.7, marginTop: '24px', opacity: 0.8, maxWidth: '720px' }}>
        Our bill records start in the 2004-05 session, but the two earliest sessions hold only five bills: ones that were
        carried over into later sessions and became Acts, such as the Crossrail Act 2008. Session names and dates:{' '}
        <a href={SESSIONS_SOURCE_URL} style={{ color: ACCENT }} rel="noopener">UK Parliament calendar</a>. Bills: UK Parliament Bills API.
      </p>
    </OpenGovShell>
  );
}
