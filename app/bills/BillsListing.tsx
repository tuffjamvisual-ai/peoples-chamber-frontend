import { notFound } from 'next/navigation';
import { getBillsPage } from '@/lib/data';
import Pagination from '../components/Pagination';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import SectionLinks from '../components/SectionLinks';
import VotingIntegrity from '../components/VotingIntegrity';
import Link from 'next/link';
import { getParliamentSessions, getSessionBills, sessionBillGroup, sessionTitle, type SessionBillGroup } from '@/lib/parliament-sessions';

export const BILLS_PER_PAGE = 60;

// The /bills listing, shared by /bills (page 1) and /bills/page/[page] (page 2 onwards). The page number is in the
// path, not ?page=, so every page is cached (reading searchParams would render it on every request).
// 31 Oct 2026 (owner): a plain A to Z list of links in two columns (one on phones), 60 a page, in place of the bill
// cards (BillsGrid, BillsGridMobile), so a reader can find a bill by name. Each item is the title, linking to the
// bill's page, and one line: the current stage and the house it is in.
export default async function BillsListing({ page }: { page: number }) {
  const [{ bills, totalCount }, sessions] = await Promise.all([
    getBillsPage(page, BILLS_PER_PAGE, 'title'),
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
      <SectionLinks section="Parliament" />

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
      </header>

      <VotingIntegrity />

      <style>{`
        .bills-az { list-style: none; margin: 0; padding: 0; columns: 1; column-gap: 48px; }
        @media (min-width: 768px) { .bills-az { columns: 2; } }
        .bills-az li { break-inside: avoid; page-break-inside: avoid; padding: 0 0 14px; }
        .bills-az a { color: #7a1612; text-decoration: none; font-size: 17px; line-height: 1.35; font-weight: bold; }
        .bills-az a:hover, .bills-az a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
      `}</style>
      {totalCount > 0 && (
        <p style={{ fontSize: '15px', color: '#14100d', margin: '24px 0 14px' }}>
          Showing {((page - 1) * BILLS_PER_PAGE + 1).toLocaleString()} to {Math.min(page * BILLS_PER_PAGE, totalCount).toLocaleString()} of {totalCount.toLocaleString()}
        </p>
      )}
      <ol className="bills-az" aria-label="Bills going through Parliament, A to Z">
        {bills.map((b) => {
          const line = [b.current_stage?.trim(), b.current_house].filter(Boolean).join(', ');
          return (
            <li key={b.id}>
              <Link href={`/bills/${b.id}`}>{b.title}</Link>
              {line && <span style={{ display: 'block', fontSize: '15px', color: '#14100d', marginTop: '2px' }}>{line}</span>}
            </li>
          );
        })}
      </ol>
      <Pagination currentPage={page} totalPages={totalPages} baseUrl="/bills" />

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
