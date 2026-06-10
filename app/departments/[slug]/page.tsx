import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { departments } from '@/lib/departments';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import DepartmentClient from './DepartmentClient';
import DepartmentStaff from './DepartmentStaff';
import DepartmentSidebar, { type DeptNavItem } from './DepartmentSidebar';
import { DEPARTMENT_BUDGETS, fmtBn, totalSpend } from '@/lib/department-budgets';
import DossierShell from '../../components/DossierShell';
import { getGovukDept } from '../../api/govuk-dept/route';
import { getDeptContext } from '../../api/department-context/route';
import BackLink from '../../components/BackLink';
import JsonLd, { buildDepartmentOrg } from '@/lib/JsonLd';
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

  const sos = govukData.ministers?.[0];
  const sosName = sos?.name || dept.minister || '';
  const sosRole = sos?.role || 'Secretary of State';
  const sosPhoto = sos?.photo || '';
  const sosHref = sos?.member_id ? `/mps/${sos.member_id}` : sos?.slug ? `/people/${sos.slug}` : null;
  const budget = DEPARTMENT_BUDGETS[slug] || null;

  const navItems: DeptNavItem[] = [
    { label: 'Overview', href: '#overview', rotate: '0.12deg' },
    { label: 'Department Staff', href: '#staff', rotate: '-0.15deg' },
    ...(budget ? [{ label: 'Budget', href: '#budget', rotate: '0.1deg' } as DeptNavItem] : []),
  ];

  return (
    <DossierShell>
      <JsonLd data={buildDepartmentOrg({
        slug,
        name: dept.name,
        description: contextData.street_context || dept.description || null,
        sosName: sos?.name || dept.minister || null,
        sosMemberId: sos?.member_id ?? null,
        sosRole: sos?.role || 'Secretary of State',
      })} />
      <BackLink
        fallbackHref="/departments"
        label="← Back to all departments"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(9px, 1.1vw, 14px)', transform: 'rotate(-0.2deg)' }}
      />

      {/* Header — minister polaroid on the right, department name + quip +
          minister on the left, mirroring the MP-bio dossier layout. */}
      <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-start', gap: '5%', marginBottom: '6%' }}>
        <div
          style={{
            position: 'relative',
            flex: '0 0 auto',
            marginTop: '-2%',
            marginRight: '-6%',
            background: '#ebe5d8',
            padding: '12px 12px 48px 12px',
            transform: 'rotate(12deg)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
            filter: 'contrast(1.05) brightness(0.98)',
          }}
        >
          {sosPhoto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={sosPhoto} alt={sosName} style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }} />
          ) : (
            <div aria-hidden style={{ width: '260px', height: '260px', background: '#d6cdb8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', color: '#7a1612', fontFamily: 'Special Elite, monospace' }}>
              {(dept.shortName || dept.name).charAt(0)}
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paperclip.png" alt="" aria-hidden style={{ position: 'absolute', top: '-30px', right: '-5px', width: '65px', height: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center', pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }} />
          {sos?.resigned && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/resigned-stamp.png" alt="Resigned" aria-hidden style={{ position: 'absolute', bottom: '-70px', right: '-30px', width: '200px', height: 'auto', transform: 'rotate(-10deg)', opacity: 0.9, pointerEvents: 'none', zIndex: 3 }} />
          )}
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(21px, 3vw, 33px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.1 }}>
            {dept.name}
          </h1>
          {dept.description && (
            <p style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: '17px', lineHeight: 1.55, maxWidth: '52ch', marginBottom: '14px', opacity: 0.9 }}>
              {dept.description}
            </p>
          )}
          {sosName && (
            <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 'bold' }}>{sosName}</div>
              <div style={{ opacity: 0.8 }}>{sosRole}</div>
              {sosHref && (
                <Link href={sosHref} style={{ display: 'inline-block', marginTop: '4px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7a1612', fontWeight: 'bold' }}>View bio →</Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body — dossier sidebar + content (scaled to match MP profile text). */}
      <div style={{ zoom: 1.18 }}>
        <DepartmentSidebar items={navItems}>
          <section id="overview" className="pb-8 mb-8">
            {((contextData.street_context || dept.streetContext) ?? '')
              .split(/\n\n+/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((para, idx) => (
                <p
                  key={idx}
                  className="text-[#14100d] text-[16px] leading-[1.7] mb-3"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {para}
                </p>
              ))}
          </section>

          <div id="staff">
            <DepartmentStaff govukData={govukData} />
          </div>

          {budget && (
            <section id="budget" aria-label="Department budget" className="mb-8" style={{ padding: '4px 0 4px 18px', borderLeft: '4px solid #6b2417', maxWidth: '760px' }}>
              <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6, marginBottom: '8px' }}>Budget &middot; {budget.year}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '30px', fontWeight: 'bold', color: '#6b2417', lineHeight: 1 }}>{fmtBn(totalSpend(budget))}</div>
                <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '13px', opacity: 0.75 }}>Resource DEL {fmtBn(budget.resourceDel)} &middot; Capital DEL {fmtBn(budget.capitalDel)}{budget.ame !== undefined && ` · AME ${fmtBn(budget.ame)}`}</div>
              </div>
              <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '15px', lineHeight: 1.65, color: '#14100d', margin: 0 }}>{budget.prose}</p>
            </section>
          )}

          <Suspense fallback={<div style={{ minHeight: '300px' }} />}>
            <DepartmentClient
              slug={slug}
              govukData={govukData}
              streetContext={null}
              budget={null}
            />
          </Suspense>
        </DepartmentSidebar>
      </div>

      <ScrollToTopButton />
    </DossierShell>
  );
}
