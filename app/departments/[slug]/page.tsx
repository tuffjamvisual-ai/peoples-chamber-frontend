'use client';

import { departments } from '@/lib/departments';
import { parties } from '@/lib/parties';
import Navigation from '../../components/Navigation';
import Link from 'next/link';
import { useState, use, useEffect } from 'react';

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
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [stats, setStats] = useState<EconomicStats | null>(null);
  const [streetContext, setStreetContext] = useState<string | null>(null);

  useEffect(() => {
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
          <div className="flex items-start gap-6">
            {dept.ministerPhoto ? (
              <img src={dept.ministerPhoto} alt={dept.minister} className="w-24 h-24 rounded-full object-cover flex-shrink-0 border-2 border-yellow-600" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-400 flex-shrink-0">
                {dept.minister.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{dept.name}</h1>
              <p className="text-gray-200 text-sm mb-3">{dept.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-300 text-sm">Secretary of State:</span>
                <span className="text-white font-medium text-sm">{dept.minister}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Stats — Treasury only */}
        {slug === 'treasury' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Live Economic Data</h2>
              {stats && (
                <span className="text-xs text-gray-500">
                  CPI from ONS · Updated {stats.cpiDate}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'CPI Inflation', value: stats ? stats.cpi + '%' : '...', color: 'text-amber-400', live: true },
                { label: 'Bank Rate', value: stats ? stats.bankRate + '%' : '3.75%', color: 'text-blue-400', live: false },
                { label: 'National Debt', value: stats ? stats.nationalDebt : '93% of GDP', color: 'text-red-400', live: false },
                { label: 'Annual Borrowing', value: stats ? stats.annualBorrowing : '£133bn', color: 'text-orange-400', live: false },
                { label: 'GDP Growth', value: stats ? stats.gdpGrowth : '1.1%', color: 'text-green-400', live: false },
                { label: 'Debt/GDP', value: stats ? stats.debtGDP : '95%', color: 'text-purple-400', live: false },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                  {stat.live && <div className="text-xs text-green-600 mt-0.5">● live</div>}
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              CPI: <a href="https://www.ons.gov.uk" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ONS</a> · Other figures: <a href="https://obr.uk/efo/economic-and-fiscal-outlook-march-2026/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OBR March 2026</a>
            </div>
          </div>
        )}

        {/* Street Context */}
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-blue-300 mb-2">The Street View — March 2026</h2>
          <p className="text-gray-200 text-sm leading-relaxed">{streetContext || dept.streetContext}</p>
        </div>

        {/* Control Zones */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">What This Department Controls</h2>
          <p className="text-gray-300 text-xs mb-4">Click any topic to see every party's position on it</p>
          <div className="flex flex-wrap gap-2">
            {dept.controlZones.map((zone) => {
              const hasDetail = dept.controlZonePositions?.some(z => z.zone === zone);
              return (
                <button
                  key={zone}
                  onClick={() => setActiveZone(activeZone === zone ? null : zone)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    activeZone === zone
                      ? 'bg-yellow-600 text-white border-yellow-500'
                      : hasDetail
                      ? 'bg-yellow-900/20 text-yellow-300 border-yellow-800/30 hover:bg-yellow-900/40 cursor-pointer'
                      : 'bg-gray-800/40 text-gray-500 border-gray-700/30 cursor-default'
                  }`}
                >
                  {zone} {hasDetail && activeZone !== zone && <span className="text-xs opacity-60">↓</span>}
                </button>
              );
            })}
          </div>
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

        {/* Current Issues */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Current Issues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dept.currentIssues.map((issue) => (
              <div key={issue.title} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white font-medium text-sm">{issue.title}</h3>
                  {issue.hot && <span className="text-xs px-1.5 py-0.5 bg-red-900/40 text-red-400 rounded border border-red-800/40">Hot</span>}
                </div>
                <p className="text-gray-200 text-xs leading-relaxed">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
