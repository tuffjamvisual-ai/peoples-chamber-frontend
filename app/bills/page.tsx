import type { Metadata } from 'next';
import { getBillsPage } from '@/lib/data';
import BillsGrid from '../components/BillsGrid';
import BillsGridMobile from '../components/BillsGridMobile';
import ScrollToTopButton from '../components/ScrollToTopButton';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';

const BILLS_PER_PAGE = 20;

// /bills paginates 4000 bills across 4 parallel range queries. At Vercel
// build time, when other workers are also hammering Supabase for MP
// pages, this exceeds the 60s/page budget. Render on demand.
export const dynamic = 'force-dynamic';
export const revalidate = 600;

export const metadata: Metadata = {
  title: "UK Parliament Bills Tracker — Live Stages, Votes & Acts | The People's Chamber",
  description:
    "Every bill in UK Parliament. Current stage, how each MP voted, public verdict, and whether it became law. Track the route from Westminster paper to Act of Parliament.",
  alternates: { canonical: '/bills' },
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BillsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const { bills, totalCount } = await getBillsPage(page, BILLS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(totalCount / BILLS_PER_PAGE));

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back to home"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Bills in Parliament
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Every bill going through UK Parliament. How MPs voted. How you voted. The gap between the two.
        </p>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '16px', opacity: 0.7 }}>
          Showing bills {(page - 1) * BILLS_PER_PAGE + 1}–{Math.min(page * BILLS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} · page {page} of {totalPages}
        </p>
      </header>

      <div className="md:hidden">
        <BillsGridMobile initialBills={bills} currentPage={page} totalPages={totalPages} />
      </div>
      <div className="hidden md:block">
        <BillsGrid initialBills={bills} currentPage={page} totalPages={totalPages} />
      </div>

      <ScrollToTopButton />
    </DossierShell>
  );
}
