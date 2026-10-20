import type { Metadata } from 'next';
import { getBillsPage } from '@/lib/data';
import BillsGrid from '../components/BillsGrid';
import BillsGridMobile from '../components/BillsGridMobile';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import AllBillsIndex from './AllBillsIndex';
import VotingIntegrity from '../components/VotingIntegrity';
import Link from 'next/link';
import { getCurrentBillSessions, getParliamentSessions, sessionTitle } from '@/lib/parliament-sessions';

const BILLS_PER_PAGE = 20;

// /bills lists the bills going through Parliament now (lib/data.ts getBillsPage, from the bill_current view), 20 a
// page; Acts, withdrawn bills and earlier sessions are in the archive at /bills/sessions. Rendered on demand so the
// page and its count follow the nightly bill sync.
export const dynamic = 'force-dynamic'
export const revalidate = 600;

export const metadata: Metadata = {
  title: "UK Parliament Bills Tracker, Live Stages, Votes & Acts",
  description:
    "The bills going through UK Parliament now: current stage, sponsor, how MPs voted and the public verdict. Every earlier bill, Act and withdrawn bill is in the archive by session.",
  alternates: { canonical: '/bills' },
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BillsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const [{ bills, totalCount }, filterSessions, sessions] = await Promise.all([
    getBillsPage(page, BILLS_PER_PAGE),
    getCurrentBillSessions(),
    getParliamentSessions(),
  ]);
  const current = sessions.find((s) => s.is_current);
  const totalPages = Math.max(1, Math.ceil(totalCount / BILLS_PER_PAGE));

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

      <AllBillsIndex />

    </OpenGovShell>
  );
}
