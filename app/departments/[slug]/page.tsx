'use client';

import { useState, use, useEffect, useRef } from 'react';
import Navigation from '../../components/Navigation';
import Link from 'next/link';
import { departments } from '@/lib/departments';
import { parties } from '@/lib/parties';
import { useSearchParams } from 'next/navigation';

const ACCENT = '#6b9e3e';
const ACCENT_2 = '#818cf8';
const SUCCESS = '#34d399';
const WARN = '#fbbf24';
const DANGER = '#f87171';

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

  const filteredZones = dept ? dept.controlZones.filter((z) => z.toLowerCase().includes(zoneSearch.toLowerCase())) : [];

  useEffect(() => {
    if (!dept) return;

    if (slug === 'treasury') {
      fetch('/api/economic-stats').then((r) => r.json()).then((d) => setStats(d)).catch(() => {});
    }

    fetch(`/api/department-context?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => { if (d.street_context) setStreetContext(d.street_context); })
      .catch(() => {});

    fetch(`/api/govuk-dept?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ministers) {
          setGovukData(d);
          const sosSlug = d.ministers[0]?.slug;
          if (sosSlug) {
            fetch(`/api/person?slug=${sosSlug}`)
              .then((r) => r.json())
              .then((p) => { if (p.photo) setSosPhoto(p.photo); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [slug, dept]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowTopics(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!dept)
    return (
      <div className="min-h-screen bg-[#0a140a] flex items-center justify-center">
        <p className="text-gray-200 text-sm">Department not found</p>
      </div>
    );

  const activeZoneData = dept.controlZonePositions?.find((z) => z.zone === activeZone);
  const sos = govukData?.ministers?.[0] || { name: dept.minister, photo: '', role: 'Secretary of State', responsibilities: '', url: '', slug: '' };
  const juniorMinisters = govukData?.ministers?.slice(1) || [];
  const seniorOfficials = govukData?.boardMembers?.filter((m) => {
    const r = m.role.toLowerCase();
    return r.includes('permanent') || r.includes('director general') || r.includes('chief');
  }) || [];
  const boardMembers = govukData?.boardMembers?.filter((m) => {
    const r = m.role.toLowerCase();
    return r.includes('non-executive') || r.includes('board member');
  }) || [];

  return (
    <div className="min-h-screen bg-[#0a140a] text-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link href="/departments" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-gray-200 hover:text-white mb-8 transition-colors">
          ← Back to Departments
        </Link>

        {/* Header */}
        <header className="border-b border-[#1a2e1a] pb-8 mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-3" style={{ color: ACCENT }}>
            UK Government · Department
          </p>
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="text-3xl sm:text-5xl font-black leading-[1.05] tracking-tight text-white">{dept.name}</h1>
            {govukData?.socialMedia && govukData.socialMedia.length > 0 && (
              <div className="flex gap-1.5 flex-shrink-0 mt-2">
                {govukData.socialMedia.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] uppercase tracking-[0.15em] px-2 py-1 bg-[#0f1a0f] text-gray-200 rounded-sm border border-[#1a2e1a] hover:text-white hover:border-[#6b9e3e] transition-colors"
                  >
                    {s.service === 'twitter' ? 'X' : s.service === 'youtube' ? 'YT' : s.service.slice(0, 3)}
                  </a>
                ))}
              </div>
            )}
          </div>
          <p className="text-gray-200 text-[14px] leading-[1.7] max-w-3xl">{dept.description}</p>
        </header>

        {/* Secretary of State */}
        <section className="border-b border-[#1a2e1a] pb-8 mb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: ACCENT }}>Secretary of State</p>
          <div className="flex items-center gap-6">
            {sosPhoto ? (
              <img
                src={sosPhoto}
                alt={sos.name}
                className="w-28 h-28 rounded-full object-cover flex-shrink-0"
                style={{ border: `2px solid ${ACCENT}` }}
              />
            ) : (
              <div
                className="w-28 h-28 rounded-full bg-[#0f1a0f] flex items-center justify-center text-4xl font-black flex-shrink-0"
                style={{ border: `2px solid ${ACCENT}`, color: ACCENT }}
              >
                {sos.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-white text-2xl sm:text-3xl font-black tracking-tight mb-1">{sos.name}</h2>
              <p className="text-gray-200 text-[13px] leading-[1.7] mb-2">{sos.role}</p>
              {sos.slug && (
                <Link
                  href={`/people/${sos.slug}`}
                  className="inline-block text-[10px] uppercase tracking-[0.2em] hover:underline font-semibold"
                  style={{ color: ACCENT }}
                >
                  View bio →
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Stats + Search */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#1a2e1a] border border-[#1a2e1a] mb-8">
          {slug === 'treasury' ? (
            <div className="bg-[#0f1a0f] p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-[10px] uppercase tracking-[0.25em] font-semibold text-white">Live Economic Data</h3>
                {stats && <span className="text-[10px] uppercase tracking-[0.15em] text-gray-200 font-mono">CPI · ONS · {stats.cpiDate}</span>}
              </div>
              <div className="grid grid-cols-3 gap-px bg-[#1a2e1a] border border-[#1a2e1a]">
                {[
                  { label: 'CPI Inflation', value: stats ? stats.cpi + '%' : '...', colour: WARN, live: true },
                  { label: 'Bank Rate', value: stats ? stats.bankRate + '%' : '3.75%', colour: ACCENT },
                  { label: 'Nat. Debt', value: stats ? stats.nationalDebt : '93% GDP', colour: DANGER },
                  { label: 'Borrowing', value: stats ? stats.annualBorrowing : '£133bn', colour: '#fb923c' },
                  { label: 'GDP Growth', value: stats ? stats.gdpGrowth : '1.1%', colour: SUCCESS },
                  { label: 'Debt/GDP', value: stats ? stats.debtGDP : '95%', colour: ACCENT_2 },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#0f1a0f] px-3 py-3">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-gray-200 mb-1">{stat.label}</p>
                    <p className="text-base font-black tracking-tight" style={{ color: stat.colour }}>
                      {stat.value}
                    </p>
                    {stat.live && (
                      <p className="text-[9px] uppercase tracking-[0.2em] mt-0.5 font-semibold" style={{ color: SUCCESS }}>● live</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#0f1a0f] p-5 flex items-center justify-center">
              <p className="text-gray-200 text-[13px] leading-[1.7]">Live data coming soon for this department</p>
            </div>
          )}

          <div ref={searchRef} className="bg-[#0f1a0f] p-5 relative">
            <h3 className="text-[10px] uppercase tracking-[0.25em] mb-1 font-semibold text-white">Search Topics</h3>
            <p className="text-gray-200 text-[12px] mb-3 leading-[1.7]">Type any issue to see what every party says about it</p>
            <div className="relative">
              <input
                type="text"
                value={zoneSearch}
                onChange={(e) => { setZoneSearch(e.target.value); setShowTopics(true); }}
                onFocus={() => setShowTopics(true)}
                placeholder={`Search ${dept.controlZones.length} topics…`}
                className="w-full bg-[#0a140a] border border-[#1a2e1a] rounded-sm px-4 py-2.5 text-white text-[13px] placeholder:text-gray-200 focus:outline-none focus:border-[#6b9e3e] transition-colors"
              />
              {zoneSearch && (
                <button
                  onClick={() => { setZoneSearch(''); setShowTopics(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-200 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            {showTopics && (
              <div className="absolute z-50 left-5 right-5 mt-1 bg-[#0f1a0f] border border-[#1a2e1a] rounded-sm shadow-xl max-h-64 overflow-y-auto">
                {(zoneSearch ? filteredZones : [...dept.controlZones].sort()).map((zone) => {
                  const hasDetail = dept.controlZonePositions?.some((z) => z.zone === zone);
                  return (
                    <button
                      key={zone}
                      onClick={() => { setActiveZone(activeZone === zone ? null : zone); setZoneSearch(''); setShowTopics(false); }}
                      className={
                        'block w-full text-left px-4 py-2.5 text-[13px] border-b border-[#1a2e1a] last:border-0 transition-colors ' +
                        (activeZone === zone ? 'text-[#6b9e3e] bg-[#111827]' : 'text-gray-200 hover:bg-[#111827] hover:text-white')
                      }
                    >
                      {zone}
                      {hasDetail && <span className="ml-2 text-[10px]" style={{ color: ACCENT }}>●</span>}
                    </button>
                  );
                })}
                {zoneSearch && filteredZones.length === 0 && (
                  <div className="px-4 py-3 text-gray-200 text-[13px]">No topics match &ldquo;{zoneSearch}&rdquo;</div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Street View */}
        <section className="border-b border-[#1a2e1a] pb-8 mb-8">
          <h2 className="text-[10px] uppercase tracking-[0.25em] mb-3 font-semibold" style={{ color: ACCENT }}>The Street View</h2>
          <p className="text-white text-[14px] leading-[1.7]">{streetContext || dept.streetContext}</p>
        </section>

        {/* Topic detail */}
        {activeZone && activeZoneData && (
          <section className="border-b border-[#1a2e1a] pb-8 mb-8">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-2xl font-black tracking-tight text-white">{activeZone}</h2>
              <button
                onClick={() => setActiveZone(null)}
                className="text-[10px] uppercase tracking-[0.25em] text-gray-200 hover:text-white transition-colors"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-gray-200 text-[14px] leading-[1.7] mb-6">{activeZoneData.context}</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1a2e1a] border border-[#1a2e1a]">
              {activeZoneData.positions.map((pos) => {
                const party = parties.find((p) => p.id === pos.partyId);
                if (!party) return null;
                return (
                  <li key={pos.partyId} className="bg-[#0f1a0f] p-4 border-l-2" style={{ borderLeftColor: party.colour }}>
                    <span
                      className="inline-block text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-sm mb-2"
                      style={{ backgroundColor: party.colour, color: party.textColour }}
                    >
                      {party.name}
                    </span>
                    <p className="text-white font-semibold text-[13px] mb-1 leading-snug">{pos.headline}</p>
                    <p className="text-gray-200 text-[12px] leading-[1.7]">{pos.position}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Agencies */}
        {govukData?.childOrgs && govukData.childOrgs.length > 0 && (
          <section className="border-b border-[#1a2e1a] pb-8 mb-8">
            <h2 className="text-[10px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: ACCENT }}>
              Agencies & Arm&apos;s Length Bodies ({govukData.childOrgs.length})
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {govukData.childOrgs.map((org, i) => {
                const agencySlug = org.url.split('/government/organisations/')[1] || '';
                return (
                  <Link
                    key={i}
                    href={'/agencies/' + agencySlug}
                    className="text-[12px] uppercase tracking-[0.15em] text-gray-200 hover:text-[#6b9e3e] transition-colors"
                  >
                    {org.acronym || org.name}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Staff */}
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.25em] mb-6 font-semibold" style={{ color: ACCENT }}>Department Staff</h2>

          {juniorMinisters.length > 0 && <StaffGroup label="Ministers" people={juniorMinisters} />}
          {seniorOfficials.length > 0 && <StaffGroup label="Senior Officials" people={seniorOfficials} />}
          {boardMembers.length > 0 && <StaffGroup label="Board Members" people={boardMembers} />}

          {(govukData?.foiEmail || govukData?.pressPhone) && (
            <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-[#1a2e1a]">
              {govukData.foiEmail && (
                <a
                  href={`mailto:${govukData.foiEmail}`}
                  className="text-[11px] uppercase tracking-[0.15em] hover:underline"
                  style={{ color: ACCENT }}
                >
                  FOI Request: {govukData.foiEmail}
                </a>
              )}
              {govukData.pressPhone && (
                <span className="text-[11px] uppercase tracking-[0.15em] text-gray-200 font-mono">Press: {govukData.pressPhone}</span>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StaffGroup({ label, people }: { label: string; people: { name: string; role: string; slug: string }[] }) {
  return (
    <div className="mb-8">
      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-200 mb-3 font-semibold">{label}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#1a2e1a] border border-[#1a2e1a]">
        {people.map((person, i) => (
          <li key={i} className="bg-[#0f1a0f] p-3 border-l-2 border-l-transparent hover:border-l-[#6b9e3e] hover:bg-[#111827] transition-colors">
            <Link href={`/people/${person.slug}`} className="block">
              <p className="text-white text-[13px] font-semibold hover:text-[#6b9e3e] transition-colors">{person.name}</p>
              <p className="text-gray-200 text-[11px] mt-0.5 leading-[1.7]">{person.role}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
