import { notFound } from 'next/navigation';
import { getBillsPage } from '@/lib/data';
import BillsGrid from '../components/BillsGrid';
import BillsGridMobile from '../components/BillsGridMobile';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import VotingIntegrity from '../components/VotingIntegrity';
import Link from 'next/link';
import { getCurrentBillSessions, getParliamentSessions, getSessionBills, sessionBillGroup, sessionTitle, type SessionBillGroup } from '@/lib/parliament-sessions';

export const BILLS_PER_PAGE = 20;

// The /bills listing, shared by /bills (page 1) and /bills/page/[page] (page 2 onwards). The page number is in the
// path, not ?page=, so every page is cached (reading searchParams would render it on every request).
export default async function BillsListing({ page }: { page: number }) {
  const [{ bills, totalCount }, filterSessions, sessions] = await Promise.all([
    getBillsPage(page, BILLS_PER_PAGE),
    getCurrentBillSessions(),
    getParliamentSessions(),
  ]);
  const current = sessions.find((s) => s.is_current);
  // "The 2026-27 session has 188 bills: 183 going through Parliament, ...", counted exactly as /bills/sessions/<id>.
  const sessionCounts: Partial<Record<SessionBillGroup, number>> = {};
  let sessionTotal = 0;
  if (current) {
    for (const b of await getSessionBills(current.id)) {
      const g = sessionBillGroup(b, current.id, true);
      sessionCounts[g] = (sessionCounts[g] || 0) + 1;
      sessionTotal++;
    }
  }
  const sessionParts = [
    `${(sessionCounts.current || 0).toLocaleString()} going through Parliament`,
    sessionCounts.law ? `${sessionCounts.law.toLocaleString()} ${sessionCounts.law === 1 ? 'has' : 'have'} become law` : '',
    sessionCounts.withdrawn ? `${sessionCounts.withdrawn.toLocaleString()} withdrawn` : '',
    sessionCounts.defeated ? `${sessionCounts.defeated.toLocaleString()} defeated` : '',
    sessionCounts.carried ? `${sessionCounts.carried.toLocaleString()} carried over` : '',
  ].filter(Boolean);
  const totalPages = Math.max(1, Math.ceil(totalCount / BILLS_PER_PAGE));
  // A page past the end (bills became Acts since the link was made) is not a page.
  if (page > totalPages) notFound();

  return (
    <OpenGovShell pageStamp="Bills">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Bills in Parliament
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          The bills going through UK Parliament now: introduced in the {current ? sessionTitle(current) : 'current session'} or carried over into it. How MPs voted. How you voted. The gap between the two.
        </p>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', marginTop: '8px' }}>
          Acts, withdrawn bills and bills from earlier sessions are in the{' '}
          <Link href="/bills/sessions" style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>archive of bills by session</Link>.
        </p>
        {current && sessionTotal > 0 && (
          <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', marginTop: '8px' }}>
            The <Link href={`/bills/sessions/${current.id}`} style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{sessionTitle(current)}</Link> has {sessionTotal.toLocaleString()} bills: {sessionParts.join(', ')}.
          </p>
        )}
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '16px', opacity: 0.7 }}>
          {totalCount === 0
            ? 'No bills going through Parliament right now'
            : <>Showing bills {(page - 1) * BILLS_PER_PAGE + 1}-{Math.min(page * BILLS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} going through Parliament · page {page} of {totalPages}</>}
        </p>
      </header>

      <VotingIntegrity />

      <div className="md:hidden">
        <BillsGridMobile initialBills={bills} currentPage={page} totalPages={totalPages} />
      </div>
      <div className="hidden md:block">
        <BillsGrid initialBills={bills} currentPage={page} totalPages={totalPages} sessions={filterSessions} />
      </div>

      {/* Everything not going through Parliament now: the archive (every bill, by session) and the Acts. Replaces the
          old "Browse all bills" index, so this page has one going-through-Parliament figure. The archive links every
          bill page; the sitemap lists the indexable ones. */}
      <nav aria-label="More bills" style={{ borderTop: '1px solid rgba(20,16,13,0.18)', marginTop: '40px', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px 32px', fontSize: '17px' }}>
        <Link href="/bills/sessions" style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Every bill, by session (archive)</Link>
        <Link href="/laws" style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Acts of Parliament</Link>
      </nav>

    </OpenGovShell>
  );
}
