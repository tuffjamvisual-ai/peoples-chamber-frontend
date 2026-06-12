import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { departments } from '@/lib/departments';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import DepartmentMasthead from './DepartmentMasthead';
import DepartmentStaff from './DepartmentStaff';
import DepartmentTabs from './DepartmentTabs';
import { BudgetSlot, AgenciesSlot, ContactSlot } from './DepartmentSlots';
import { DEPARTMENT_BUDGETS } from '@/lib/department-budgets';
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

  // ---- MP-bio-style tab set: Assessment, Staff, Budget, Agencies, Contact.
  // Each slot is server-rendered so it ships in the static HTML;
  // DepartmentTabs only toggles which is visible. Tabs with no data omitted.
  const boardMembers = govukData.boardMembers || [];
  const juniorMinisters = (govukData.ministers || []).slice(1);
  const staffRoles = (m: { role?: string }) => (m.role || '').toLowerCase();
  const hasStaff =
    juniorMinisters.length > 0 ||
    boardMembers.some((m) => {
      const r = staffRoles(m);
      return r.includes('permanent') || r.includes('director general') || r.includes('chief') || r.includes('non-executive') || r.includes('board member');
    });
  const budget = DEPARTMENT_BUDGETS[slug] || null;
  const childOrgs = govukData.childOrgs || [];
  const socialMedia = govukData.socialMedia || [];
  const pressPhone = govukData.pressPhone || '';
  const reportText = (contextData.street_context || dept.streetContext) ?? '';

  const tabs: { id: string; label: string; rotate: string }[] = [];
  const slots: Record<string, ReactNode> = {};
  if (reportText.trim()) {
    tabs.push({ id: 'assessment', label: 'Assessment', rotate: '0.1deg' });
    slots.assessment = (
      <section>
        {reportText
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((para, idx) => (
            <p key={idx} className="text-[#14100d] text-[16px] leading-[1.7] mb-3" style={{ whiteSpace: 'pre-wrap' }}>
              {para}
            </p>
          ))}
      </section>
    );
  }
  if (hasStaff) {
    tabs.push({ id: 'staff', label: 'Staff', rotate: '-0.12deg' });
    slots.staff = <DepartmentStaff govukData={govukData} />;
  }
  if (budget) {
    tabs.push({ id: 'budget', label: 'Budget', rotate: '0.1deg' });
    slots.budget = <BudgetSlot budget={budget} />;
  }
  if (childOrgs.length > 0) {
    tabs.push({ id: 'agencies', label: 'Agencies', rotate: '-0.15deg' });
    slots.agencies = <AgenciesSlot childOrgs={childOrgs} />;
  }
  if (pressPhone || socialMedia.length > 0) {
    tabs.push({ id: 'contact', label: 'Contact', rotate: '-0.1deg' });
    slots.contact = <ContactSlot socialMedia={socialMedia} pressPhone={pressPhone} />;
  }

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

      <h1 style={{ fontSize: 'clamp(21px, 3vw, 33px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.1 }}>
        {dept.name}
      </h1>

      {/* Body scaled to match the MP profile text size (16px base x zoom 1.18). */}
      <div style={{ zoom: 1.18 }}>
        {/* Quip — the department's one-line characterisation, sits directly
            under the name (per-department, from meta.description). */}
        {dept.description && (
          <p style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: '17px', lineHeight: 1.55, maxWidth: '720px', marginTop: '-4px', marginBottom: '6%', opacity: 0.9 }}>
            {dept.description}
          </p>
        )}

        {/* Masthead — Secretary of State photo + name + role + budget panel.
            Sits above the descriptive content so the reader's eye lands on
            the person + spend envelope first, then drops into the
            description label and the Institutional Performance Report.
            Reordered 2026-06-04 at user request. */}
        <DepartmentMasthead
          sos={
            govukData.ministers?.[0]
              ? {
                  name: govukData.ministers[0].name,
                  photo: govukData.ministers[0].photo,
                  role: govukData.ministers[0].role || 'Secretary of State',
                  slug: govukData.ministers[0].slug,
                  member_id: govukData.ministers[0].member_id ?? null,
                  resigned: govukData.ministers[0].resigned,
                }
              : { name: dept.minister, photo: '', role: 'Secretary of State', slug: '' }
          }
          budget={null}
        />

        {/* MP-bio-style tabbed sections: Assessment, Staff, Budget, Agencies,
            Contact. Slots are server-rendered (built above) so all content
            ships in the static HTML; DepartmentTabs only toggles visibility,
            which preserves the GSC Soft 404 fix for the report text. */}
        <DepartmentTabs tabs={tabs} slots={slots} />
      </div>

      <ScrollToTopButton />
    </DossierShell>
  );
}
