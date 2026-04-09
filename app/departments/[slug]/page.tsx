'use client';

import { useState, use, useEffect, useRef } from 'react';
import Navigation from '../../components/Navigation';
import Link from 'next/link';
import { departments } from '@/lib/departments';
import { parties } from '@/lib/parties';
import { useSearchParams } from 'next/navigation';

type GovukMinister = {
  name: string;
  photo: string;
  role: string;
  responsibilities: string;
  url: string;
  slug: string;
  is_secretary_of_state?: boolean;
};

type GovukData = {
  title: string;
  description: string;
  ministers: GovukMinister[];
  boardMembers: { name: string; photo: string; role: string; url: string; slug: string; category?: string }[];
  childOrgs: { name: string; url: string; acronym: string }[];
  featuredDocs: { title: string; url: string; summary: string; type: string; date: string; image: string }[];
  featuredLinks: { title: string; url: string }[];
  socialMedia: { service: string; url: string; title: string }[];
  foiEmail: string;
  pressPhone: string;
};

type EconomicStats = {
  cpi: string;
  cpiDate: string;
  bankRate: string;
  nationalDebt: string;
  annualBorrowing: string;
  gdpGrowth: string;
  debtGDP: string;
  lastUpdated: string;
};

export default function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const dept = departments.find((d) => d.slug === slug);
  const searchParams = useSearchParams();
  const zoneParam = searchParams.get('zone');
  const [activeZone, setActiveZone] = useState<string | null>(zoneParam || null);
  const [zoneSearch, setZoneSearch] = useState('');
  const [showTopics, setShowTopics] = useState(false);
  const [stats, setStats] = useState<EconomicStats | null>(null);
  const [streetContext, setStreetContext] = useState<string | null>(null);
  const [govukData, setGovukData] = useState<GovukData | null>(null);
  const [sosPhoto, setSosPhoto] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const filteredZones = dept ? dept.controlZones.filter(z => z.toLowerCase().includes(zoneSearch.toLowerCase())) : [];

  useEffect(() => {
    if (!dept) return;

    if (slug === 'treasury') {
      fetch('/api/economic-stats')
        .then(r => r.json())
        .then(d => setStats(d))
        .catch(() => {});
    }

    fetch(`/api/department-context?slug=${slug}`)
      .then(r => r.json())
      .then(d => { if (d.street_context) setStreetContext(d.street_context); })
      .catch(() => {});

    fetch(`/api/govuk-dept?slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.ministers) {
          setGovukData(d);
          // Fetch SoS photo separately from GOV.UK
          const sosSlug = d.ministers[0]?.slug;
          if (sosSlug) {
            fetch(`/api/person?slug=${sosSlug}`)
              .then(r => r.json())
              .then(p => { if (p.photo) setSosPhoto(p.photo); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [slug]);

  // Close topics dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowTopics(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!dept) return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="text-white">Department not found</div>
    </div>
  );

  const activeZoneData = dept.controlZonePositions?.find(z => z.zone === activeZone);
  const sos = govukData?.ministers?.[0] || { name: dept.minister, photo: '', role: 'Secretary of State', responsibilities: '', url: '', slug: '' };
  const juniorMinisters = govukData?.ministers?.slice(1) || [];
  const seniorOfficials = govukData?.boardMembers?.filter(m => {
    const r = m.role.toLowerCase();
    return r.includes('permanent') || r.includes('director general') || r.includes('chief');
  }) || [];
  const boardMembers = govukData?.boardMembers?.filter(m => {
    const r = m.role.toLowerCase();
    return r.includes('non-executive') || r.includes('board member');
  }) || [];

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">

        <Link href="/departments" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          ← Back to Departments
        </Link>

        {/* 1. HEADER */}
        <div className="mb-6" style={{ borderLeft: '4px solid #d4af37', paddingLeft: '1rem' }}>
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{dept.name}</h1>
            {govukData?.socialMedia && govukData.socialMedia.length > 0 && (
              <div className="flex gap-2 flex-shrink-0">
                {govukData.socialMedia.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:text-white transition-colors">
                    {s.service === 'twitter' ? 'X' : s.service === 'youtube' ? 'YT' : s.service.slice(0,3)}
                  </a>
                ))}
              </div>
            )}
          </div>
          <p className="text-gray-300 text-sm">{dept.description}</p>
        </div>

        {/* 2. SECRETARY OF STATE */}
        <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-800">
          {sosPhoto ? (
            <img src={sosPhoto} alt={sos.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-yellow-500 flex-shrink-0" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center text-4xl font-bold text-yellow-500 border-4 border-yellow-500 flex-shrink-0">
              {sos.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-yellow-400 text-sm font-medium mb-1">Secretary of State</div>
            <div className="text-white text-2xl font-bold mb-1">{sos.name}</div>
            <div className="text-gray-300 text-base mb-3">{sos.role}</div>
            {sos.slug && (
              <Link href={`/people/${sos.slug}`} className="text-blue-400 text-sm hover:underline">
                View bio →
              </Link>
            )}
          </div>
        </div>

        {/* 3. LIVE STATS + SEARCH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {slug === 'treasury' ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Live Economic Data</h2>
                {stats && <span className="text-xs text-gray-500">CPI from ONS · {stats.cpiDate}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'CPI Inflation', value: stats ? stats.cpi + '%' : '...', color: 'text-amber-400', live: true },
                  { label: 'Bank Rate', value: stats ? stats.bankRate + '%' : '3.75%', color: 'text-blue-400' },
                  { label: 'Nat. Debt', value: stats ? stats.nationalDebt : '93% GDP', color: 'text-red-400' },
                  { label: 'Borrowing', value: stats ? stats.annualBorrowing : '£133bn', color: 'text-orange-400' },
                  { label: 'GDP Growth', value: stats ? stats.gdpGrowth : '1.1%', color: 'text-green-400' },
                  { label: 'Debt/GDP', value: stats ? stats.debtGDP : '95%', color: 'text-purple-400' },
                ].map((stat: any) => (
                  <div key={stat.label} className="text-center py-2 border-b border-gray-800">
                    <div className={`text-base font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                    {stat.live && <div className="text-xs text-green-600">● live</div>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <p className="text-gray-600 text-sm">Live data coming soon for this department</p>
            </div>
          )}

          {/* Search with topic popout */}
          <div ref={searchRef} className="relative">
            <h2 className="text-sm font-semibold text-white mb-1">Search Topics</h2>
            <p className="text-gray-500 text-xs mb-3">Type any issue to see what every party says about it</p>
            <div className="relative">
              <input
                type="text"
                value={zoneSearch}
                onChange={(e) => { setZoneSearch(e.target.value); setShowTopics(true); }}
                onFocus={() => setShowTopics(true)}
                placeholder={`Search ${dept.controlZones.length} topics...`}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
              {zoneSearch && (
                <button onClick={() => { setZoneSearch(''); setShowTopics(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>
              )}
            </div>

            {/* Topic dropdown */}
            {showTopics && (
              <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {(zoneSearch ? filteredZones : [...dept.controlZones].sort()).map((zone) => {
                  const hasDetail = dept.controlZonePositions?.some(z => z.zone === zone);
                  return (
                    <button
                      key={zone}
                      onClick={() => { setActiveZone(activeZone === zone ? null : zone); setZoneSearch(''); setShowTopics(false); }}
                      className={`block w-full text-left px-4 py-2.5 text-sm border-b border-gray-800 last:border-0 transition-colors ${
                        activeZone === zone ? 'text-yellow-400 bg-gray-800' : 'text-gray-200 hover:bg-gray-800 hover:text-yellow-300'
                      }`}
                    >
                      {zone}
                      {hasDetail && <span className="text-yellow-600 ml-2 text-xs">●</span>}
                    </button>
                  );
                })}
                {zoneSearch && filteredZones.length === 0 && (
                  <div className="px-4 py-3 text-gray-500 text-sm">No topics match "{zoneSearch}"</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. STREET VIEW */}
        <div className="mb-6 pb-6 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-blue-300 mb-2">The Street View</h2>
          <p className="text-gray-200 text-sm leading-relaxed">{streetContext || dept.streetContext}</p>
        </div>

        {/* 5. TOPIC DETAIL — shows when zone selected */}
        {activeZone && activeZoneData && (
          <div className="mb-6 pb-6 border-b border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-yellow-300">{activeZone}</h2>
              <button onClick={() => setActiveZone(null)} className="text-gray-400 hover:text-white text-sm">✕ Close</button>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">{activeZoneData.context}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeZoneData.positions.map((pos) => {
                const party = parties.find(p => p.id === pos.partyId);
                if (!party) return null;
                return (
                  <div key={pos.partyId} style={{ borderLeft: `4px solid ${party.colour}`, paddingLeft: '1rem' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: party.colour, color: party.textColour }}>{party.name}</span>
                    </div>
                    <p className="text-white font-medium text-xs mb-1">{pos.headline}</p>
                    <p className="text-gray-200 text-xs leading-relaxed">{pos.position}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7. AGENCIES */}
        {govukData?.childOrgs && govukData.childOrgs.length > 0 && (
          <div className="mb-6 pb-6 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Agencies & Arm's Length Bodies ({govukData.childOrgs.length})</h2>
            <div className="flex flex-wrap gap-2">
              {govukData.childOrgs.map((org, i) => {
                const agencySlug = org.url.replace('https://www.gov.uk/government/organisations/', '');
                return (
                  <Link key={i} href={'/agencies/' + agencySlug}
                    className="text-xs text-gray-300 hover:text-white transition-colors">
                    {org.acronym || org.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. STAFF — at the bottom */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Department Staff</h2>

          {/* Junior Ministers */}
          {juniorMinisters.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Ministers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {juniorMinisters.map((minister, i) => (
                  <div key={i} className="py-2 border-b border-gray-800/50">
                    <Link href={`/people/${minister.slug}`} className="text-white text-sm font-medium hover:text-yellow-300 transition-colors">
                      {minister.name}
                    </Link>
                    <div className="text-gray-400 text-xs mt-0.5">{minister.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Senior Officials */}
          {seniorOfficials.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Senior Officials</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {seniorOfficials.map((member, i) => (
                  <div key={i} className="py-2 border-b border-gray-800/50">
                    <Link href={`/people/${member.slug}`} className="text-white text-sm font-medium hover:text-yellow-300 transition-colors">
                      {member.name}
                    </Link>
                    <div className="text-gray-400 text-xs mt-0.5">{member.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Board Members */}
          {boardMembers.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Board Members</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {boardMembers.map((member, i) => (
                  <div key={i} className="py-2 border-b border-gray-800/50">
                    <Link href={`/people/${member.slug}`} className="text-white text-sm font-medium hover:text-yellow-300 transition-colors">
                      {member.name}
                    </Link>
                    <div className="text-gray-400 text-xs mt-0.5">{member.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOI and Press */}
          {(govukData?.foiEmail || govukData?.pressPhone) && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-800">
              {govukData.foiEmail && (
                <a href={`mailto:${govukData.foiEmail}`} className="text-xs text-blue-400 hover:text-blue-300">
                  FOI Request: {govukData.foiEmail}
                </a>
              )}
              {govukData.pressPhone && (
                <span className="text-xs text-gray-500">Press: {govukData.pressPhone}</span>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}        {/* 7. AGENCIES */}
        {govukData?.childOrgs && govukData.childOrgs.length > 0 && (
          <div className="mb-6 pb-6 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Agencies & Arm's Length Bodies ({govukData.childOrgs.length})</h2>
            <div className="flex flex-wrap gap-2">
              {govukData.childOrgs.map((org, i) => {
                const agencySlug = org.url.replace('https://www.gov.uk/government/organisations/', '');
                return (
                  <Link key={i} href={'/agencies/' + agencySlug}
                    className="text-xs text-gray-300 hover:text-white transition-colors">
                    {org.acronym || org.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. STAFF — at the bottom */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Department Staff</h2>

          {/* Junior Ministers */}
          {juniorMinisters.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Ministers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {juniorMinisters.map((minister, i) => (
                  <div key={i} className="py-2 border-b border-gray-800/50">
                    <Link href={`/people/${minister.slug}`} className="text-white text-sm font-medium hover:text-yellow-300 transition-colors">
                      {minister.name}
                    </Link>
                    <div className="text-gray-400 text-xs mt-0.5">{minister.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Senior Officials */}
          {seniorOfficials.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Senior Officials</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {seniorOfficials.map((member, i) => (
                  <div key={i} className="py-2 border-b border-gray-800/50">
                    <Link href={`/people/${member.slug}`} className="text-white text-sm font-medium hover:text-yellow-300 transition-colors">
                      {member.name}
                    </Link>
                    <div className="text-gray-400 text-xs mt-0.5">{member.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Board Members */}
          {boardMembers.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Board Members</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {boardMembers.map((member, i) => (
                  <div key={i} className="py-2 border-b border-gray-800/50">
                    <Link href={`/people/${member.slug}`} className="text-white text-sm font-medium hover:text-yellow-300 transition-colors">
                      {member.name}
                    </Link>
                    <div className="text-gray-400 text-xs mt-0.5">{member.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOI and Press */}
          {(govukData?.foiEmail || govukData?.pressPhone) && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-800">
              {govukData.foiEmail && (
                <a href={`mailto:${govukData.foiEmail}`} className="text-xs text-blue-400 hover:text-blue-300">
                  FOI Request: {govukData.foiEmail}
                </a>
              )}
              {govukData.pressPhone && (
                <span className="text-xs text-gray-500">Press: {govukData.pressPhone}</span>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
