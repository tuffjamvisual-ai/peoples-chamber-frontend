import { departments } from '@/lib/departments';
import { parties } from '@/lib/parties';
import Navigation from '../../components/Navigation';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  return departments.map((d) => ({ slug: d.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DepartmentPage({ params }: PageProps) {
  const { slug } = await params;
  const dept = departments.find((d) => d.slug === slug);
  if (!dept) notFound();

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
              <p className="text-gray-400 text-sm mb-3">{dept.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-500 text-sm">Secretary of State:</span>
                <span className="text-white font-medium text-sm">{dept.minister}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Street Context */}
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-blue-300 mb-2">The Street View — March 2026</h2>
          <p className="text-gray-300 text-sm leading-relaxed">{dept.streetContext}</p>
        </div>

        {/* Control Zones */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">What This Department Controls</h2>
          <div className="flex flex-wrap gap-2">
            {dept.controlZones.map((zone) => (
              <span key={zone} className="px-3 py-1.5 bg-yellow-900/20 text-yellow-300 rounded-lg text-sm border border-yellow-800/30">{zone}</span>
            ))}
          </div>
        </div>

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
                <p className="text-gray-400 text-xs leading-relaxed">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Party Positions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Where Every Party Stands</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dept.partyPositions.map((pos) => {
              const party = parties.find(p => p.id === pos.partyId);
              if (!party) return null;
              return (
                <div key={pos.partyId} className="bg-gray-900 border border-gray-800 rounded-xl p-5" style={{ borderLeftColor: party.colour, borderLeftWidth: '4px' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: party.colour, color: party.textColour }}>{party.name}</span>
                    {!party.hasMP && <span className="text-xs text-gray-500">No MPs</span>}
                  </div>
                  <p className="text-white font-medium text-sm mb-2">{pos.headline}</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{pos.position}</p>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
