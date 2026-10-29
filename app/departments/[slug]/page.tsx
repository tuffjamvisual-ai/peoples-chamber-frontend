import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { departments } from '@/lib/departments';
import DepartmentMasthead from './DepartmentMasthead';
import DepartmentStaff from './DepartmentStaff';
import DepartmentTabs from './DepartmentTabs';
import { BudgetSlot, AgenciesSlot, ContactSlot, ReleasesSlot, InvestigationsSlot, ProgrammesSlot, type PressReleaseItem, type InvestigationItem, type ProgrammeItem } from './DepartmentSlots';
import { getDepartmentGrants, GrantsSlot } from './GrantsSlot';
import { DirectionsSlot } from './DirectionsSlot';
import { fetchDirections } from '@/lib/ministerial-directions';
import { MajorProjectsSlot } from './MajorProjectsSlot';
import { TransparencySlot } from './TransparencySlot';
import { getDeptFoi } from '@/lib/foi-statistics';
import { getMeetingsStatus } from '@/lib/ministers-meetings-status';
import { fetchMajorProjects } from '@/lib/major-projects';
import { DEPARTMENT_BUDGETS } from '@/lib/department-budgets';
import OpenGovShell from '../../components/OpenGovShell';
import { getGovukDept } from '../../api/govuk-dept/route';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { fetchWithoutEmDashes } from '@/lib/no-em-dash';
import { editorialsBySlug } from '@/lib/editorials-source';
import { topics, matchWords } from '@/lib/topics';
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
// Database reads on this page go through Next's data cache (25 Oct 2026, report 43). Every deploy empties the page
// cache, so the first visit after each deploy rendered the page from scratch; Supabase reads were never cached (754,130
// reads in 48 h, none from the cache). With this line they are kept for the page's revalidate period, and that cache
// survives deploys, so those renders read from it instead of the database. A stale entry is read again before the page
// is stored, so the page is never older than its revalidate period; revalidatePath and revalidateTag still refresh it.
export const fetchCache = 'default-cache';

// The Reports tab's investigations are a tagged read (owner's approval, 29 Oct 2026, cache Stage 1): cached for a day
// under the 'editorials' tag, and refreshed as soon as an editorial is published, because the publish step runs
// node scripts/revalidate.js --tag editorials after its database sync. Every other read keeps its hour. Same server
// key and dash cleaning as lib/supabase.ts. (It replaced a 60 second read, which kept the whole page refreshing every
// minute.)
const editorialsTagged = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
  global: { fetch: (input, init) => fetchWithoutEmDashes(input, { ...init, next: { tags: ['editorials'], revalidate: 86400 } }) },
});

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

  const [govukData, contextData, rawReleases, rawInvestigations, rawProgrammes, directions, majorProjects, foi, meetings] = await Promise.all([
    getGovukDept(slug),
    getDeptContext(slug),
    // B2 — press releases tab: top 20 by published_at DESC across all
    // historical org names for this department (handles renames like
    // BEIS → DBT). Returns [] when orgNames is empty (HMRC/DSIT gap
    // handled automatically — neither slug is in DEPT_SLUG_TO_ORGS).
    (async () => {
      if (orgNames.length === 0) return [];
      const { data, error: dataErr2 } = await supabase
        .from('press_releases')
        .select('title, organisation, published_at, gov_url')
        .in('organisation', orgNames)
        .not('removed_upstream', 'is', true)
        .not('gov_url', 'is', null)
        .order('published_at', { ascending: false })
        .limit(20);
      if (dataErr2 && dataErr2.code !== 'PGRST116') throw new Error(`/departments/[slug] press_releases: ${dataErr2.message}`);
      return data ?? [];
    })(),
    // B3 — Reports tab (owner's approval, 23 Oct 2026): investigations and file briefings whose related_dept_slugs
    // contain this slug (GIN index on related_dept_slugs), plus published database briefings matched by the words of
    // the topics this department belongs to, as topic pages match them. Drafts stay out: the public key only reads
    // published briefings, and the filter says so too.
    (async (): Promise<InvestigationItem[]> => {
      const deptTopics = topics.filter((t) => t.departmentSlugs.includes(slug));
      const [edRes, brRes] = await Promise.all([
        editorialsTagged
          .from('editorials')
          .select('slug, headline, standfirst, summary, published_at, kicker, kind')
          .contains('related_dept_slugs', [slug])
          .order('published_at', { ascending: false }),
        deptTopics.length
          ? supabase.from('briefings').select('slug, headline, summary, body, published_at, created_at').eq('is_published', true)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (edRes.error && edRes.error.code !== 'PGRST116') throw new Error(`/departments/[slug] editorials: ${edRes.error.message}`);
      if (brRes.error && brRes.error.code !== 'PGRST116') throw new Error(`/departments/[slug] briefings: ${brRes.error.message}`);
      const codeEditorials = await editorialsBySlug();
      const fromEditorials: InvestigationItem[] = (edRes.data ?? []).map((r) => ({
        slug: r.slug, headline: r.headline, standfirst: r.standfirst, summary: r.summary, published_at: r.published_at, kicker: r.kicker,
        href: `/${r.kind === 'briefing' ? 'briefings' : 'editorials'}/${r.slug}`,
        type: codeEditorials[r.slug]?.opinion ? 'Commentary' : r.kind === 'briefing' ? 'Briefing' : 'Investigation',
      }));
      const fromBriefings: InvestigationItem[] = ((brRes.data ?? []) as { slug: string; headline: string; summary: string | null; body: string | null; published_at: string | null; created_at: string }[])
        .filter((b) => deptTopics.some((t) => matchWords(`${b.headline} ${b.summary ?? ''}`, t.words, t.exclude)))
        .map((b) => ({
          slug: b.slug, headline: b.headline, standfirst: String(b.body || '').replace(/\s+/g, ' ').slice(0, 180).trim() + '…', summary: b.summary,
          published_at: b.published_at || b.created_at, kicker: 'Daily Briefing', href: `/briefings/${b.slug}`, type: 'Briefing',
        }));
      return [...fromEditorials, ...fromBriefings].sort((a, b) => (a.published_at < b.published_at ? 1 : a.published_at > b.published_at ? -1 : 0));
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
      .then(({ data, error }) => {
        if (error) throw new Error(`/departments/[slug] policy_programmes: ${error.message}`);
        return (data ?? []) as ProgrammeItem[];
      }),
    // The tabs below read ministerial directions, major projects, FOI statistics and the latest ministers' meetings
    // return. A failed read throws (owner's approval, 21 Oct 2026), so the last good department page stays up rather
    // than one with a tab missing.
    fetchDirections(slug),
    fetchMajorProjects(slug),
    getDeptFoi(slug),
    getMeetingsStatus(slug),
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
  // The same read says which bodies have an agency page (owner's approval, 24 Oct 2026): only those are linked.
  const agencySlugs = childOrgsRaw.map((o) => o.url.split('/government/organisations/')[1] || '').filter(Boolean);
  const { data: agencyDescRows, error: agencyDescErr } = agencySlugs.length
    ? await supabase.from('agency_cache').select('slug, description').in('slug', agencySlugs)
    : { data: [] as { slug: string; description: string | null }[], error: null };
  if (agencyDescErr) throw new Error(`/departments/[slug] agency_cache: ${agencyDescErr.message}`);
  const descBySlug = new Map((agencyDescRows || []).map((r) => [r.slug, (r.description || '').trim()]));
  const agencies = childOrgsRaw.map((o) => {
    const agSlug = o.url.split('/government/organisations/')[1] || '';
    return { name: o.name, acronym: o.acronym, slug: agSlug, description: descBySlug.get(agSlug) || '', hasPage: descBySlug.has(agSlug) };
  });
  const socialMedia = govukData.socialMedia || [];
  const pressPhone = govukData.pressPhone || '';
  const reportText = (contextData.street_context || dept.streetContext) ?? '';

  const tabs: { id: string; label: string; rotate: string }[] = [];
  const slots: Record<string, ReactNode> = {};
  // Open Govt data pages for a department, shown at the end of its About tab.
  const DATA_PAGES: Record<string, { href: string; title: string; description: string }[]> = {
    environment: [{ href: '/sewage', title: 'Sewage spills', description: 'How long storm overflows spilled sewage in every council area and constituency in England and Northern Ireland, and for each water company.' }],
  };
  const dataPages = DATA_PAGES[slug] ?? [];
  // The About tab (the written account of each department) is hidden for now, on the
  // owner's instruction (18 Oct 2026). Set to true to bring it back; the text is unchanged
  // in the database. The "Data on Open Govt" links it carried get their own small tab.
  const SHOW_DEPARTMENT_ABOUT = false;
  if (!SHOW_DEPARTMENT_ABOUT && dataPages.length > 0) {
    tabs.push({ id: 'data', label: 'Data', rotate: '0.1deg' });
    slots.data = (
      <section>
        {dataPages.map((d) => (
          <a key={d.href} href={d.href} className="block border-t border-[rgba(20,16,13,0.2)] py-3 mb-1 text-[#14100d] no-underline">
            <span className="block text-[18px] font-bold mb-1">{d.title} →</span>
            <span className="block text-[15px] leading-[1.6]">{d.description}</span>
          </a>
        ))}
      </section>
    );
  }
  if (SHOW_DEPARTMENT_ABOUT && reportText.trim()) {
    tabs.push({ id: 'assessment', label: 'About', rotate: '0.1deg' });
    const aboutParas = reportText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    slots.assessment = (
      <section>
        {aboutParas.map((para, idx) => (
          <p key={idx} className="text-[#14100d] text-[16px] leading-[1.7] mb-3" style={{ whiteSpace: 'pre-wrap' }}>{para}</p>
        ))}
        {dataPages.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[#14100d] text-[15px] uppercase tracking-[0.2em] font-bold mb-3">Data on Open Govt</h3>
            {dataPages.map((d) => (
              <a key={d.href} href={d.href} className="block border border-[rgba(20,16,13,0.2)] px-4 py-3 mb-3 text-[#14100d] no-underline">
                <span className="block text-[18px] font-bold mb-1">{d.title} →</span>
                <span className="block text-[15px] leading-[1.6]">{d.description}</span>
              </a>
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
  // Grants tab: Cabinet Office Government grants register, grouped under this
  // department with its agencies. Only shown when the department has rows.
  const grants = await getDepartmentGrants(slug);
  if (grants) {
    tabs.push({ id: 'grants', label: 'Grants', rotate: '-0.05deg' });
    slots.grants = <GrantsSlot grants={grants} />;
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
  const investigations = rawInvestigations;
  if (investigations.length > 0) {
    tabs.push({ id: 'investigations', label: 'Reports', rotate: '0.05deg' });
    slots.investigations = <InvestigationsSlot investigations={investigations} />;
  }
  // B4 — programmes tab: only shown when at least one live programme is tagged.
  if (rawProgrammes.length > 0) {
    tabs.push({ id: 'programmes', label: 'Programmes', rotate: '-0.06deg' });
    slots.programmes = <ProgrammesSlot programmes={rawProgrammes} />;
  }
  // Directions tab: only shown when GOV.UK has published at least one direction for this department.
  if (directions.length > 0) {
    tabs.push({ id: 'directions', label: 'Directions', rotate: '0.07deg' });
    slots.directions = <DirectionsSlot directions={directions} />;
  }
  // Major projects tab: only shown when the department has at least one project in the portfolio.
  if (majorProjects.projects.length > 0) {
    tabs.push({ id: 'major-projects', label: 'Major projects', rotate: '-0.04deg' });
    slots['major-projects'] = <MajorProjectsSlot projects={majorProjects.projects} latestYear={majorProjects.latestYear} />;
  }

  // Transparency tab: Freedom of Information statistics and ministers' meetings returns.
  if (foi.length > 0 || meetings.length > 0) {
    tabs.push({ id: 'transparency', label: 'Transparency', rotate: '0.06deg' });
    slots.transparency = <TransparencySlot foi={foi} meetings={meetings} />;
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
        description: (SHOW_DEPARTMENT_ABOUT ? contextData.street_context : null) || dept.description || null,
        sosName: sos?.name || dept.minister || null,
        sosMemberId: sos?.member_id ?? null,
        sosRole: sos?.role || 'Secretary of State',
      })} />
      <BackLink
        fallbackHref="/departments"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(15px, 1.1vw, 14px)', transform: 'rotate(-0.2deg)' }}
      />

      <h1 style={{ fontSize: 'clamp(21px, 3vw, 33px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '6px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.1 }}>
        {dept.name}
      </h1>
      <p style={{ fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#14100d', margin: '0 0 14px', letterSpacing: '0.04em' }}>
        <Link href={`/search?dept=${slug}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          Search releases and reports →
        </Link>
      </p>

      {/* Body scaled to match the MP profile text size (16px base x zoom 1.18). */}
      <div style={{ zoom: 1.18 }}>
        {/* Quip — the department's one-line characterisation, sits directly
            under the name (per-department, from meta.description). */}
        {dept.description && (
          <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontStyle: 'italic', fontSize: '17px', lineHeight: 1.55, maxWidth: '720px', marginTop: '-4px', marginBottom: '6%' }}>
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

    </OpenGovShell>
  );
}
