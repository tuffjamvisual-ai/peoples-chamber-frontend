// Server-rendered. Reads from agency_cache (populated nightly by
// /api/sync-agency-cache) directly — drops the previous client useEffect
// that fetched /api/govuk-agency after mount.

import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import Link from 'next/link';
import BackLink from '../../components/BackLink';

export const revalidate = 3600;

const INK = '#14100d';
const ACCENT = '#6b2417';

type Minister = { name: string; role: string; slug: string };
type BoardMember = { name: string; role: string; slug: string };
type FeaturedDoc = { title: string; url: string; summary: string; type: string };
type SocialMedia = { service: string; url: string };
type ParentOrg = { name: string; slug: string };

type AgencyData = {
  name: string;
  description: string;
  body: string;
  acronym: string;
  ministers: Minister[];
  boardMembers: BoardMember[];
  featuredDocs: FeaturedDoc[];
  socialMedia: SocialMedia[];
  parentOrgs: ParentOrg[];
};

// gov.uk → our dept slug. Used to link agency parent-organisation
// references back to /departments/<slug>.
const DEPT_SLUGS: Record<string, string> = {
  'hm-treasury': 'treasury',
  'home-office': 'home-office',
  'department-of-health-and-social-care': 'health',
  'department-for-energy-security-and-net-zero': 'energy',
  'department-for-education': 'education',
  'department-for-work-and-pensions': 'work-pensions',
  'department-for-transport': 'transport',
  'department-for-environment-food-and-rural-affairs': 'environment',
  'department-for-business-and-trade': 'business-trade',
  'department-for-science-innovation-and-technology': 'science-tech',
  'ministry-of-housing-communities-and-local-government': 'housing',
  'ministry-of-justice': 'justice',
  'ministry-of-defence': 'defence',
  'department-for-culture-media-and-sport': 'culture',
  'cabinet-office': 'cabinet-office',
  'foreign-commonwealth-and-development-office': 'foreign-office',
  'attorney-generals-office': 'attorney-general',
  'scotland-office': 'scotland-office',
  'wales-office': 'wales-office',
  'northern-ireland-office': 'northern-ireland-office',
  'uk-export-finance': 'ukef',
};

async function getAgency(slug: string): Promise<AgencyData | null> {
  const { data } = await supabase
    .from('agency_cache')
    .select('name, description, body, acronym, ministers, board_members, parent_orgs, featured_docs, social_media')
    .eq('slug', slug)
    .maybeSingle();

  if (!data) return null;

  return {
    name: data.name || '',
    description: data.description || '',
    body: data.body || '',
    acronym: data.acronym || '',
    ministers: (data.ministers as Minister[]) || [],
    boardMembers: (data.board_members as BoardMember[]) || [],
    parentOrgs: (data.parent_orgs as ParentOrg[]) || [],
    featuredDocs: (data.featured_docs as FeaturedDoc[]) || [],
    socialMedia: (data.social_media as SocialMedia[]) || [],
  };
}

export default async function AgencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agency = await getAgency(slug);

  // Back-link target: if we can map a parent organisation to one of our
  // department pages, go straight back there; otherwise fall back to the
  // full departments index.
  const parentDept = agency?.parentOrgs
    .map((org) => ({ name: org.name, slug: DEPT_SLUGS[org.slug] }))
    .find((d) => d.slug);
  const backHref = parentDept ? `/departments/${parentDept.slug}` : '/departments';
  const backLabel = parentDept ? `← Back to ${parentDept.name}` : '← Back to departments';

  // Only link a person through to /people/{slug} when a real person_cache
  // record exists for them. Agency ministers/board members arrive from gov.uk
  // as bare {name, role, slug} with no profile behind them, so linking every
  // one generated hundreds of dead /people pages (404s in Search Console).
  // People with no record render as plain text (name + role) instead.
  const peopleSlugs = agency
    ? Array.from(new Set([...agency.ministers, ...agency.boardMembers].map((m) => m.slug).filter(Boolean)))
    : [];
  const { data: pcRows } = peopleSlugs.length
    ? await supabase.from('person_cache').select('slug').in('slug', peopleSlugs)
    : { data: [] as { slug: string }[] };
  const linkablePeople = new Set((pcRows || []).map((r: { slug: string }) => r.slug));

  return (
    <OpenGovShell pageStamp="Agency">
      <BackLink
        fallbackHref={backHref}
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      {!agency && <div className="text-[#14100d] text-sm">Agency not found.</div>}

      {agency && (
        <>
          <header style={{ marginBottom: '5%' }}>
            <div className="flex items-center gap-3 mb-2">
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
                {agency.name}
              </h1>
              {agency.acronym && (
                <span className="text-sm px-2 py-1 text-[#14100d] border border-[#14100d]/20 rounded font-mono">{agency.acronym}</span>
              )}
            </div>
            {agency.parentOrgs.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#14100d] text-sm">Part of:</span>
                {agency.parentOrgs.map((org, i) => {
                  const deptSlug = DEPT_SLUGS[org.slug];
                  return deptSlug ? (
                    <Link key={i} href={`/departments/${deptSlug}`} className="text-sm hover:underline" style={{ color: ACCENT }}>{org.name}</Link>
                  ) : (
                    <span key={i} className="text-[#14100d] text-sm">{org.name}</span>
                  );
                })}
              </div>
            )}
            <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>{agency.description}</p>
          </header>

          {agency.body && (
            <div className="mb-6 pb-6 border-b border-[#14100d]/20">
              <p className="text-[#14100d] text-sm leading-relaxed">{agency.body}</p>
            </div>
          )}

          {agency.ministers.length > 0 && (
            <div className="mb-6 pb-6 border-b border-[#14100d]/20">
              <h2 className="text-sm font-semibold text-[#14100d] mb-3">Ministers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {agency.ministers.map((m, i) => (
                  <div key={i} className="py-2 border-b border-[#14100d]/10">
                    {linkablePeople.has(m.slug) ? (
                      <Link href={`/people/${m.slug}`} className="text-[#14100d] text-sm font-medium hover:text-[#14100d] transition-colors">{m.name}</Link>
                    ) : (
                      <span className="text-[#14100d] text-sm font-medium">{m.name}</span>
                    )}
                    <div className="text-[#14100d] text-sm mt-0.5">{m.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {agency.boardMembers.length > 0 && (
            <div className="mb-6 pb-6 border-b border-[#14100d]/20">
              <h2 className="text-sm font-semibold text-[#14100d] mb-3">Senior Staff</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {agency.boardMembers.map((m, i) => (
                  <div key={i} className="py-2 border-b border-[#14100d]/10">
                    {linkablePeople.has(m.slug) ? (
                      <Link href={`/people/${m.slug}`} className="text-[#14100d] text-sm font-medium hover:text-[#14100d] transition-colors">{m.name}</Link>
                    ) : (
                      <span className="text-[#14100d] text-sm font-medium">{m.name}</span>
                    )}
                    <div className="text-[#14100d] text-sm mt-0.5">{m.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {agency.featuredDocs.length > 0 && (
            <div className="mb-6 pb-6 border-b border-[#14100d]/20">
              <h2 className="text-sm font-semibold text-[#14100d] mb-3">Latest Publications</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {agency.featuredDocs.map((doc, i) => (
                  <div key={i} className="py-2 border-b border-[#14100d]/10">
                    <div className="text-[#14100d] text-sm">{doc.title}</div>
                    <div className="text-[#14100d] text-sm mt-0.5">{doc.type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </OpenGovShell>
  );
}
