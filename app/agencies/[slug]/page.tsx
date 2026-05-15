// Server-rendered. Reads from agency_cache (populated nightly by
// /api/sync-agency-cache) directly — drops the previous client useEffect
// that fetched /api/govuk-agency after mount.

import { supabase } from '@/lib/supabase';
import Navigation from '../../components/Navigation';
import Link from 'next/link';

export const revalidate = 3600;

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

  return (
    <div className="min-h-screen bg-[#606060]">
      <Navigation />
      <main className="bg-[#505050] shadow-[0_0_40px_rgba(0,0,0,0.4)] max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <Link href="/departments" className="inline-flex items-center gap-2 text-white hover:text-white mb-6 text-sm">
          ← Back to Departments
        </Link>

        {!agency && <div className="text-white text-sm">Agency not found.</div>}

        {agency && (
          <>
            {/* Header */}
            <div className="mb-6" style={{ borderLeft: '4px solid #ffffff', paddingLeft: '1rem' }}>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{agency.name}</h1>
                {agency.acronym && (
                  <span className="text-sm px-2 py-1 bg-[#404040] text-white rounded font-mono">{agency.acronym}</span>
                )}
              </div>
              {agency.parentOrgs.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white text-sm">Part of:</span>
                  {agency.parentOrgs.map((org, i) => {
                    const deptSlug = DEPT_SLUGS[org.slug];
                    return deptSlug ? (
                      <Link key={i} href={`/departments/${deptSlug}`} className="text-white text-sm hover:underline">{org.name}</Link>
                    ) : (
                      <span key={i} className="text-white text-sm">{org.name}</span>
                    );
                  })}
                </div>
              )}
              <p className="text-[#c9c9c9] text-sm">{agency.description}</p>
            </div>

            {agency.body && (
              <div className="mb-6 pb-6 border-b border-[#5a5a5a]">
                <p className="text-[#c9c9c9] text-sm leading-relaxed">{agency.body}</p>
              </div>
            )}

            {agency.ministers.length > 0 && (
              <div className="mb-6 pb-6 border-b border-[#5a5a5a]">
                <h2 className="text-sm font-semibold text-white mb-3">Ministers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  {agency.ministers.map((m, i) => (
                    <div key={i} className="py-2 border-b border-[#5a5a5a]/50">
                      <Link href={`/people/${m.slug}`} className="text-white text-sm font-medium hover:text-white transition-colors">{m.name}</Link>
                      <div className="text-white text-sm mt-0.5">{m.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agency.boardMembers.length > 0 && (
              <div className="mb-6 pb-6 border-b border-[#5a5a5a]">
                <h2 className="text-sm font-semibold text-white mb-3">Senior Staff</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  {agency.boardMembers.map((m, i) => (
                    <div key={i} className="py-2 border-b border-[#5a5a5a]/50">
                      <Link href={`/people/${m.slug}`} className="text-white text-sm font-medium hover:text-white transition-colors">{m.name}</Link>
                      <div className="text-white text-sm mt-0.5">{m.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agency.featuredDocs.length > 0 && (
              <div className="mb-6 pb-6 border-b border-[#5a5a5a]">
                <h2 className="text-sm font-semibold text-white mb-3">Latest Publications</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  {agency.featuredDocs.map((doc, i) => (
                    <div key={i} className="py-2 border-b border-[#5a5a5a]/50">
                      <div className="text-white text-sm">{doc.title}</div>
                      <div className="text-white text-sm mt-0.5">{doc.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
