'use client';

import { departments } from '@/lib/departments';
import { parties } from '@/lib/parties';
import Navigation from '../../components/Navigation';
import Link from 'next/link';
import { useState, use, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type GovukMinister = {
  name: string;
  photo: string;
  role: string;
  responsibilities: string;
  url: string;
};

type GovukData = {
  title: string;
  description: string;
  ministers: GovukMinister[];
  boardMembers: { name: string; photo: string; role: string; url: string }[];
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
  const filteredZones = dept ? dept.controlZones.filter(z => z.toLowerCase().includes(zoneSearch.toLowerCase())) : [];
  const [stats, setStats] = useState<EconomicStats | null>(null);
  const [streetContext, setStreetContext] = useState<string | null>(null);
  const [govukData, setGovukData] = useState<GovukData | null>(null);

  useEffect(() => {
    if (slug === 'treasury') {
      fetch('/api/economic-stats')
        .then(r => r.json())
        .then(d => setStats(d))
        .catch(() => {});
    }
    fetch(`/api/govuk-dept?slug=${slug}`)
      .then(r => r.json())
      .then(d => { if (d.ministers) setGovukData(d); })
      .catch(() => {});
    fetch(`/api/department-context?slug=${slug}`)
      .then(r => r.json())
      .then(d => { if (d.street_context) setStreetContext(d.street_context); })
      .catch(() => {});
  }, [slug]);

  if (!dept) return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="text-white">Department not found</div>
    </div>
  );

  const activeZoneData = dept.controlZonePositions?.find(z => z.zone === activeZone);

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">

        <Link href="/departments" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          ← Back to Departments
        </Link>

        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6" style={{ borderLeftColor: '#d4af37', borderLeftWidth: '4px' }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{dept.name}</h1>
              <p className="text-gray-300 text-sm">{dept.description}</p>
            </div>
            {/* Social media */}
            {govukData?.socialMedia && govukData.socialMedia.length > 0 && (
              <div className="flex gap-2 flex-shrink-0">
                {govukData.socialMedia.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:text-white transition-colors">
                    {s.service === 'twitter' ? 'X' : s.service === 'youtube' ? 'YT' : s.service.charAt(0).toUpperCase() + s.service.slice(1, 3)}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Ministers grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {(govukData?.ministers || [{ name: dept.minister, photo: dept.ministerPhoto, role: 'Secretary of State', responsibilities: '', url: '' }]).map((minister, i) => (
              <a key={i} href={minister.url || '#'} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center text-center p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors group">
                {minister.photo ? (
                  <img src={minister.photo} alt={minister.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-600/40 group-hover:border-yellow-500 transition-colors mb-2" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-400 border-2 border-yellow-600/40 mb-2">
                    {minister.name.charAt(0)}
                  </div>
                )}
                <div className="text-white text-xs font-medium leading-tight">{minister.name}</div>
                <div className="text-gray-400 text-xs mt-0.5 leading-tight">{minister.role}</div>
              </a>
            ))}
          </div>

          {/* Permanent Secretary */}
          {govukData?.boardMembers && govukData.boardMembers.length > 0 && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
              {govukData.boardMembers[0].photo ? (
                <img src={govukData.boardMembers[0].photo} alt={govukData.boardMembers[0].name}
                  className="w-10 h-10 rounded-full object-cover border border-gray-600" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-400">
                  {govukData.boardMembers[0].name.charAt(0)}
                </div>
              )}
              <div>
                <div className="text-gray-400 text-xs">Permanent Secretary</div>
                <div className="text-white text-sm font-medium">{govukData.boardMembers[0].name}</div>
              </div>
            </div>
          )}

          {/* Agencies */}
          {govukData?.childOrgs && govukData.childOrgs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Agencies & arm's length bodies ({govukData.childOrgs.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {govukData.childOrgs.map((org, i) => (
                  <a key={i} href={org.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded hover:text-white hover:bg-gray-700 transition-colors">
                    {org.acronym || org.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Latest publications */}
          {govukData?.featuredDocs && govukData.featuredDocs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Latest publications</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {govukData.featuredDocs.slice(0, 4).map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex gap-2 p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group">
                    {doc.image && (
                      <img src={doc.image} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium line-clamp-2 group-hover:text-yellow-300 transition-colors">{doc.title}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{doc.type}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* FOI and Press contacts */}
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-800">
            {govukData?.foiEmail && (
              <a href={`mailto:${govukData.foiEmail}`}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                FOI Request
              </a>
            )}
            {govukData?.pressPhone && (
              <span className="text-xs text-gray-500">Press: {govukData.pressPhone}</span>
            )}
            {govukData?.featuredLinks && govukData.featuredLinks.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-yellow-500 hover:text-yellow-300">
                {l.title} →
              </a>
            ))}
          </div>
        </div>

        {/* Two column row — stats + search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          {/* Left — Live Stats (Treasury only) or placeholder */}
          {slug === 'treasury' ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Live Economic Data</h2>
                {stats && <span className="text-xs text-gray-500">Updated {stats.cpiDate}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'CPI Inflation', value: stats ? stats.cpi + '%' : '...', color: 'text-amber-400', live: true },
                  { label: 'Bank Rate', value: stats ? stats.bankRate + '%' : '3.75%', color: 'text-blue-400', live: false },
                  { label: 'Nat. Debt', value: stats ? stats.nationalDebt : '93% GDP', color: 'text-red-400', live: false },
                  { label: 'Borrowing', value: stats ? stats.annualBorrowing : '£133bn', color: 'text-orange-400', live: false },
                  { label: 'GDP Growth', value: stats ? stats.gdpGrowth : '1.1%', color: 'text-green-400', live: false },
                  { label: 'Debt/GDP', value: stats ? stats.debtGDP : '95%', color: 'text-purple-400', live: false },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-800/50 rounded-lg p-2 text-center">
                    <div className={`text-base font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                    {stat.live && <div className="text-xs text-green-600">● live</div>}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                <a href="https://www.ons.gov.uk" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ONS</a> · <a href="https://obr.uk" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OBR</a>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-center">
              <p className="text-gray-600 text-sm">Live data coming soon</p>
            </div>
          )}

          {/* Right — Zone Search */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-1">Search Topics</h2>
            <p className="text-gray-500 text-xs mb-3">Type any issue to find what every party says about it</p>
            <div className="relative">
              <input
                type="text"
                value={zoneSearch}
                onChange={(e) => setZoneSearch(e.target.value)}
                placeholder={`Search ${dept.controlZones.length} topics...`}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
              {zoneSearch && (
                <button onClick={() => setZoneSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>
              )}
            </div>
            {zoneSearch && filteredZones.length === 0 && (
              <p className="text-gray-500 text-xs mt-2">No topics match "{zoneSearch}" — try a different term</p>
            )}
          </div>
        </div>

        {/* Street Context */}
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-blue-300 mb-2">The Street View — March 2026</h2>
          <p className="text-gray-200 text-sm leading-relaxed">{streetContext || dept.streetContext}</p>
        </div>

        {/* Control Zones */}
        {/* Topic List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">All Topics A-Z</h2>
            <span className="text-xs text-gray-500">{dept.controlZones.length} topics</span>
          </div>

          {zoneSearch && filteredZones.length === 0 && (
            <div className="text-center py-4 mb-4">
              <p className="text-gray-300 text-sm">No topics match "{zoneSearch}"</p>
              <button onClick={() => setZoneSearch('')} className="text-yellow-400 text-xs mt-1 hover:underline">Clear search</button>
            </div>
          )}

          <div className="columns-2 sm:columns-3 lg:columns-4 gap-x-6">
            {(zoneSearch ? filteredZones : [...dept.controlZones].sort()).map((zone) => {
              const hasDetail = dept.controlZonePositions?.some(z => z.zone === zone);
              return (
                <button
                  key={zone}
                  onClick={() => { setActiveZone(activeZone === zone ? null : zone); setZoneSearch(''); }}
                  className={`block w-full text-left py-1.5 text-sm border-b border-gray-800/50 transition-colors ${
                    activeZone === zone
                      ? 'text-yellow-400 font-medium'
                      : hasDetail
                      ? 'text-gray-200 hover:text-yellow-300'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {zone}{hasDetail && <span className="text-yellow-600 ml-1 text-xs">●</span>}
                </button>
              );
            })}
          </div>
          <p className="text-gray-600 text-xs mt-4">● = full party analysis available</p>
        </div>

        {/* Control Zone Detail */}
        {activeZone && activeZoneData && (
          <div className="bg-gray-900 border border-yellow-700/40 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-yellow-300">{activeZone}</h2>
              <button onClick={() => setActiveZone(null)} className="text-gray-400 hover:text-white text-sm">✕ Close</button>
            </div>
            <p className="text-gray-200 text-sm leading-relaxed mb-6">{activeZoneData.context}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeZoneData.positions.map((pos) => {
                const party = parties.find(p => p.id === pos.partyId);
                if (!party) return null;
                return (
                  <div key={pos.partyId} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4" style={{ borderLeftColor: party.colour, borderLeftWidth: '4px' }}>
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

      </main>
    </div>
  );
}
