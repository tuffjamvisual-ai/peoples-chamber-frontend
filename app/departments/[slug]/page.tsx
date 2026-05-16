import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { departments } from '@/lib/departments';
import '../../components/magazine-layout.css';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import DepartmentClient from './DepartmentClient';
import { getGovukDept } from '../../api/govuk-dept/route';
import { getDeptContext } from '../../api/department-context/route';

import MagazineNav from '../../components/MagazineNav';
interface PageProps {
  params: Promise<{ slug: string }>;
}

// REVERTED to on-demand. Even 24 departments × 3 govuk-dept queries + the
// external ONS fetch for treasury was failing the 60s/page Vercel build
// budget when /mps/[id] workers were also hammering Supabase. Pages
// render on first request and cache at the edge via `revalidate`.
export function generateStaticParams() {
  return [];
}

// ISR — refresh prerendered HTML hourly so any backend changes
// (dept_ministers, dept_agencies, etc.) propagate without a deploy.
export const revalidate = 3600;

export default async function DepartmentPage({ params }: PageProps) {
  const { slug } = await params;
  const dept = departments.find((d) => d.slug === slug);
  if (!dept) notFound();

  // Inline the previously-client-side fetches so the prerendered HTML
  // ships with every section's data already populated.
  const [govukData, contextData] = await Promise.all([
    getGovukDept(slug),
    getDeptContext(slug),
  ]);

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
          href="/departments"
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
          ← Back to all departments
        </a>

        {/* Magazine hero — cream/ink */}
        <header style={{ marginBottom: '8px' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.05 }}>
            {dept.name}
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '720px', marginBottom: '16px' }}>
            {dept.description}
          </p>
        </header>

        {/* Detail sections — keeps the existing client (still in dark theme for now) */}
        <Suspense fallback={<div style={{ minHeight: '300px' }} />}>
          <DepartmentClient
            slug={slug}
            govukData={govukData}
            streetContext={contextData.street_context}
          />
        </Suspense>

        <ScrollToTopButton />
      </div>
    </div>
  );
}
