import type { Metadata } from 'next';
import Link from 'next/link';
import { getBillsPage } from '@/lib/data';
import BillsGrid from '../components/BillsGrid';
import BillsGridMobile from '../components/BillsGridMobile';
import '../components/magazine-layout.css';
import ScrollToTopButton from '../components/ScrollToTopButton';

import MagazineNav from '../components/MagazineNav';
const BILLS_PER_PAGE = 20;

// /bills paginates 4000 bills across 4 parallel range queries. At Vercel
// build time, when other workers are also hammering Supabase for MP
// pages, this exceeds the 60s/page budget. Render on demand.
export const dynamic = 'force-dynamic';
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Bills',
  description:
    'Every bill going through UK Parliament. How MPs voted. How you voted. The gap between the two.',
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
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '1086px',
      margin: '0 auto',
      background: '#2a1810',
      backgroundImage:
        'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
      backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
      backgroundPosition: 'top center, bottom center, top center',
      backgroundSize: '100% auto, 100% auto, 100% auto',
    }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
          pointerEvents: 'none',
        }}
      />

      <MagazineNav />
      <div className="magazine-content-spacing" style={{ position: 'relative', zIndex: 2, color: '#14100d', fontFamily: 'Special Elite, monospace' }}>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: '#14100d',
            textDecoration: 'none',
            fontSize: '16px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          ← Back to home
        </a>

        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
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
      </div>
    </div>
  );
}
