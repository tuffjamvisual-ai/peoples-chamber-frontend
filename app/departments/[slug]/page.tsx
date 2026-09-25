import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { departments } from '@/lib/departments';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import DepartmentMasthead from './DepartmentMasthead';
import DepartmentStaff from './DepartmentStaff';
import DepartmentTabs from './DepartmentTabs';
import { BudgetSlot, AgenciesSlot, ContactSlot, ReleasesSlot, InvestigationsSlot, ProgrammesSlot, type PressReleaseItem, type InvestigationItem, type ProgrammeItem } from './DepartmentSlots';
import { DEPARTMENT_BUDGETS } from '@/lib/department-budgets';
import OpenGovShell from '../../components/OpenGovShell';
import { getGovukDept } from '../../api/govuk-dept/route';
import { supabase } from '@/lib/supabase';
import { getDeptContext } from '../../api/department-context/route';
import BackLink from '../../components/BackLink';
import JsonLd, { buildDepartmentOrg } from '@/lib/JsonLd';
import { DEPT_SLUG_TO_ORGS } from '@/lib/govOrgSlug';
import { govUrlToSlug } from '@/lib/govUrlSlug';
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
  // Old council URLs (e.g. /departments/leeds-city-council) are 308'd to
  // /councils/[slug] at the platform level — see redirects() in
  // next.config.ts. Anything that reaches here and isn't a real
  // department is a genuine 404.
  if (!dept) notFound();

  // Inline the previously-client-side fetches so the prerendered HTML
  // ships with every section's data already populated.
  // B2: org names for this slug, used for the press releases tab query.
  const orgNames = DEPT_SLUG_TO_ORGS[slug] ?? [];

  const [govukData, contextData, rawReleases, rawInvestigations, rawProgrammes] = await Promise.all([
    getGovukDept(slug),
    getDeptContext(slug),
    // B2 — press releases tab: top 20 by published_at DESC across all
    // historical org names for this department (handles renames like
    // BEIS → DBT). Returns [] when orgNames is empty (HMRC/DSIT gap
    // handled automatically — neither slug is in DEPT_SLUG_TO_ORGS).
    (async () => {
      if (orgNames.length === 0) return [];
      const { data } = await supabase
        .from('press_releases')
        .select('title, organisation, published_at, gov_url')
        .in('organisation', orgNames)
        .not('removed_upstream', 'is', true)
        .not('gov_url', 'is', null)
        .order('published_at', { ascending: false })
        .limit(20);
      return data ?? [];
    })(),
    // B3 — investigations tab: editorials where related_dept_slugs contains
    // this slug. GIN index on related_dept_slugs makes this fast. kind IS NULL
    // filters to investigations only (briefings have kind = 'briefing').
    (async () => {
      const { data } = await supabase
        .from('editorials')
        .select('slug, headline, standfirst, published_at, kicker')
        .contains('related_dept_slugs', [slug])
        .is('kind', null)
        .order('published_at', { ascending: false });
      return data ?? [];
    })(),
    // B4 — programmes tab: live policy_programmes tagged with this dept slug.
    // GIN index on dept_slugs (policy_programmes_dept_slugs_idx) makes the
    // @> containment fast. RLS enforces is_live=true for the anon client.
    supabase
      .from('policy_programmes')
      .select('id, slug, name, status, summary')
      .contains('dept_slugs', [slug])
      .eq('is_live', true)
      .order('name')
      .then(({ data }) => (data ?? []) as ProgrammeItem[]),
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
  const childOrgsRaw = govukData.childOrgs || [];
  // Enrich each agency with a short description from agency_cache (keyed by
  // the gov.uk org slug) so the Agencies tab shows the full name + summary.
  const agencySlugs = childOrgsRaw.map((o) => o.url.split('/government/organisations/')[1] || '').filter(Boolean);
  const { data: agencyDescRows } = agencySlugs.length
    ? await supabase.from('agency_cache').select('slug, description').in('slug', agencySlugs)
    : { data: [] as { slug: string; description: string | null }[] };
  const descBySlug = new Map((agencyDescRows || []).map((r) => [r.slug, (r.description || '').trim()]));
  const agencies = childOrgsRaw.map((o) => {
    const agSlug = o.url.split('/government/organisations/')[1] || '';
    return { name: o.name, acronym: o.acronym, slug: agSlug, description: descBySlug.get(agSlug) || '' };
  });
  const socialMedia = govukData.socialMedia || [];
  const pressPhone = govukData.pressPhone || '';
  const reportText = (contextData.street_context || dept.streetContext) ?? '';

  const tabs: { id: string; label: string; rotate: string }[] = [];
  const slots: Record<string, ReactNode> = {};
  if (reportText.trim()) {
    tabs.push({ id: 'assessment', label: 'About', rotate: '0.1deg' });
    const aboutParas = reportText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    slots.assessment = (
      <section>
        {/* Lead paragraph sits beside the sidebar menu; everything after it
            breaks out to the full page width. The lead reserves ~16rem on
            large screens so the full-width remainder clears the menu. */}
        <style>{`@media (min-width: 1024px){ .pca-about-lead { min-height: 16rem; } .pca-about-rest { margin-left: calc(-200px - 28px); } }`}</style>
        {aboutParas.length > 0 && (
          <div className="pca-about-lead">
            <p className="text-[#14100d] text-[16px] leading-[1.7] mb-3" style={{ whiteSpace: 'pre-wrap' }}>{aboutParas[0]}</p>
          </div>
        )}
        {aboutParas.length > 1 && (
          <div className="pca-about-rest">
            {aboutParas.slice(1).map((para, idx) => (
              <p key={idx} className="text-[#14100d] text-[16px] leading-[1.7] mb-3" style={{ whiteSpace: 'pre-wrap' }}>{para}</p>
            ))}
          </div>
        )}
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
  if (agencies.length > 0) {
    tabs.push({ id: 'agencies', label: 'Agencies', rotate: '-0.15deg' });
    slots.agencies = <AgenciesSlot agencies={agencies} />;
  }
  // B2 — derive /news/[slug] route params from gov_url for each release.
  const pressReleases: PressReleaseItem[] = (
    rawReleases as Array<{ title: string; organisation: string | null; published_at: string | null; gov_url: string | null }>
  ).flatMap((r) => {
    if (!r.gov_url) return [];
    const newsSlug = govUrlToSlug(r.gov_url);
    if (!newsSlug) return [];
    return [{ title: r.title, organisation: r.organisation, published_at: r.published_at, newsSlug }];
  });
  if (pressReleases.length > 0) {
    tabs.push({ id: 'releases', label: 'Releases', rotate: '-0.08deg' });
    slots.releases = <ReleasesSlot releases={pressReleases} />;
  }
  // B3 — investigations tab: only shown when at least one tagged investigation exists.
  const investigations = rawInvestigations as InvestigationItem[];
  if (investigations.length > 0) {
    tabs.push({ id: 'investigations', label: 'Investigations', rotate: '0.05deg' });
    slots.investigations = <InvestigationsSlot investigations={investigations} />;
  }
  // B4 — programmes tab: only shown when at least one live programme is tagged.
  if (rawProgrammes.length > 0) {
    tabs.push({ id: 'programmes', label: 'Programmes', rotate: '-0.06deg' });
    slots.programmes = <ProgrammesSlot programmes={rawProgrammes} />;
  }

  if (pressPhone || socialMedia.length > 0) {
    tabs.push({ id: 'contact', label: 'Contact', rotate: '-0.1deg' });
    slots.contact = <ContactSlot socialMedia={socialMedia} pressPhone={pressPhone} />;
  }

  return (
    <OpenGovShell pageStamp="Departments">
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
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(9px, 1.1vw, 14px)', transform: 'rotate(-0.2deg)' }}
      />

      <h1 style={{ fontSize: 'clamp(21px, 3vw, 33px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '6px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.1 }}>
        {dept.name}
      </h1>
      <p style={{ fontFamily: "'Special Elite', monospace", fontSize: '12px', color: 'rgba(20,16,13,0.5)', margin: '0 0 14px', letterSpacing: '0.04em' }}>
        <Link href={`/search?dept=${slug}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          Search releases and investigations →
        </Link>
      </p>

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
    </OpenGovShell>
  );
}
