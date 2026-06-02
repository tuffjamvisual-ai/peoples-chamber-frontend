import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { departments } from '@/lib/departments';
import { DEPARTMENT_BUDGETS, fmtBn, totalSpend } from '@/lib/department-budgets';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import DepartmentClient from './DepartmentClient';
import DossierShell from '../../components/DossierShell';
import { getGovukDept } from '../../api/govuk-dept/route';
import { getDeptContext } from '../../api/department-context/route';
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
    <DossierShell>
      <a
        href="/departments"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(9px, 1.1vw, 14px)', transform: 'rotate(-0.2deg)' }}
      >
        ← Back to all departments
      </a>

      <h1 style={{ fontSize: 'clamp(21px, 3vw, 33px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.1 }}>
        {dept.name}
      </h1>

      {/* Body scaled to match the MP profile text size (16px base x zoom 1.18). */}
      <div style={{ zoom: 1.18 }}>
        <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '720px', marginBottom: '5%' }}>
          {dept.description}
        </p>

        {/* Budget panel — under the description, above the rest of the
            dossier. Pulled from lib/department-budgets.ts. Headline total
            + the Resource/Capital/AME split + a paragraph explaining what
            the money actually pays for. Only renders when we have budget
            data for this slug. */}
        {DEPARTMENT_BUDGETS[slug] && (
          <section
            aria-label="Department budget"
            style={{
              marginBottom: '5%',
              padding: '4px 0 4px 18px',
              borderLeft: '4px solid #6b2417',
              maxWidth: '760px',
            }}
          >
            <div
              style={{
                fontFamily: 'Special Elite, monospace',
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginBottom: '8px',
              }}
            >
              Budget · {DEPARTMENT_BUDGETS[slug].year}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '18px',
                flexWrap: 'wrap',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  fontFamily: 'Special Elite, monospace',
                  fontSize: '30px',
                  fontWeight: 'bold',
                  color: '#6b2417',
                  lineHeight: 1,
                }}
              >
                {fmtBn(totalSpend(DEPARTMENT_BUDGETS[slug]))}
              </div>
              <div
                style={{
                  fontFamily: 'Special Elite, monospace',
                  fontSize: '13px',
                  opacity: 0.75,
                }}
              >
                Resource DEL {fmtBn(DEPARTMENT_BUDGETS[slug].resourceDel)} · Capital DEL {fmtBn(DEPARTMENT_BUDGETS[slug].capitalDel)}
                {DEPARTMENT_BUDGETS[slug].ame !== undefined && ` · AME ${fmtBn(DEPARTMENT_BUDGETS[slug].ame!)}`}
              </div>
            </div>
            <p
              style={{
                fontFamily: 'Special Elite, monospace',
                fontSize: '15px',
                lineHeight: 1.65,
                color: '#14100d',
                margin: 0,
              }}
            >
              {DEPARTMENT_BUDGETS[slug].prose}
            </p>
            <div
              style={{
                fontFamily: 'Special Elite, monospace',
                fontSize: '11px',
                opacity: 0.55,
                marginTop: '12px',
              }}
            >
              Source: HM Treasury Main Estimates {DEPARTMENT_BUDGETS[slug].year}
            </div>
          </section>
        )}

        <Suspense fallback={<div style={{ minHeight: '300px' }} />}>
          <DepartmentClient
            slug={slug}
            govukData={govukData}
            streetContext={contextData.street_context}
          />
        </Suspense>
      </div>

      <ScrollToTopButton />
    </DossierShell>
  );
}
