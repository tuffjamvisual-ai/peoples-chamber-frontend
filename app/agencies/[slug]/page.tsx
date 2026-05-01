'use client';

import { useState, use, useEffect } from 'react';
import Navigation from '../../components/Navigation';
import Link from 'next/link';

type AgencyData = {
  name: string;
  description: string;
  body: string;
  acronym: string;
  status: string;
  ministers: { name: string; role: string; slug: string }[];
  boardMembers: { name: string; role: string; slug: string }[];
  featuredDocs: { title: string; url: string; summary: string; type: string }[];
  socialMedia: { service: string; url: string }[];
  parentOrgs: { name: string; slug: string }[];
};

export default function AgencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [agency, setAgency] = useState<AgencyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/govuk-agency?slug=${slug}`)
      .then(r => r.json())
      .then(d => { setAgency(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#0a140a]">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">

        <Link href="/departments" className="inline-flex items-center gap-2 text-gray-200 hover:text-white mb-6 text-sm">
          ← Back to Departments
        </Link>

        {loading && <div className="text-gray-200 text-sm">Loading...</div>}

        {!loading && !agency && <div className="text-gray-200 text-sm">Agency not found.</div>}

        {agency && (
          <>
            {/* Header */}
            <div className="mb-6" style={{ borderLeft: '4px solid #4a7a3a', paddingLeft: '1rem' }}>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{agency.name}</h1>
                {agency.acronym && (
                  <span className="text-xs px-2 py-1 bg-gray-800 text-yellow-400 rounded font-mono">{agency.acronym}</span>
                )}
              </div>
              {agency.parentOrgs.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-200 text-xs">Part of:</span>
                  {agency.parentOrgs.map((org, i) => {
                    const deptSlugs: Record<string, string> = {
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
                    const deptSlug = deptSlugs[org.slug];
                    return deptSlug ? (
                      <Link key={i} href={`/departments/${deptSlug}`} className="text-yellow-400 text-xs hover:underline">{org.name}</Link>
                    ) : (
                      <span key={i} className="text-gray-200 text-xs">{org.name}</span>
                    );
                  })}
                </div>
              )}
              <p className="text-gray-300 text-sm">{agency.description}</p>
            </div>

            {/* Body */}
            {agency.body && (
              <div className="mb-6 pb-6 border-b border-gray-800">
                <p className="text-gray-300 text-sm leading-relaxed">{agency.body}</p>
              </div>
            )}

            {/* Ministers */}
            {agency.ministers.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-200 mb-3">Ministers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  {agency.ministers.map((m, i) => (
                    <div key={i} className="py-2 border-b border-gray-800/50">
                      <Link href={`/people/${m.slug}`} className="text-white text-sm font-medium hover:text-yellow-300 transition-colors">{m.name}</Link>
                      <div className="text-gray-200 text-xs mt-0.5">{m.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Board Members */}
            {agency.boardMembers.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-200 mb-3">Senior Staff</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  {agency.boardMembers.map((m, i) => (
                    <div key={i} className="py-2 border-b border-gray-800/50">
                      <Link href={`/people/${m.slug}`} className="text-white text-sm font-medium hover:text-yellow-300 transition-colors">{m.name}</Link>
                      <div className="text-gray-200 text-xs mt-0.5">{m.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Latest Publications */}
            {agency.featuredDocs.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-200 mb-3">Latest Publications</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  {agency.featuredDocs.map((doc, i) => (
                    <div key={i} className="py-2 border-b border-gray-800/50">
                      <div className="text-white text-sm">{doc.title}</div>
                      <div className="text-gray-200 text-xs mt-0.5">{doc.type}</div>
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
