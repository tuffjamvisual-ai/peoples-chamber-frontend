import { departments } from '@/lib/departments';
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-6">
            {dept.ministerPhoto ? (
              <img src={dept.ministerPhoto} alt={dept.minister} className="w-20 h-20 rounded-full object-cover flex-shrink-0 border-2 border-blue-600" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-400 flex-shrink-0 border-2 border-blue-600">
                {dept.minister.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{dept.name}</h1>
              </div>
              <p className="text-gray-400 text-sm mb-3">{dept.description}</p>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Current Secretary of State:</span>
                <span className="text-white font-medium text-sm">{dept.minister}</span>
                <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#d50000' }}>{dept.ministerParty}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Control Zones */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">What This Department Controls</h2>
          <div className="flex flex-wrap gap-2">
            {dept.controlZones.map((zone) => (
              <span key={zone} className="px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-lg text-sm border border-blue-800/40">{zone}</span>
            ))}
          </div>
        </div>

        {/* Party Positions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Where Every Party Stands</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dept.partyPositions.map((pos) => (
              <div key={pos.party} className="bg-gray-900 border border-gray-800 rounded-xl p-5" style={{ borderLeftColor: pos.colour, borderLeftWidth: '4px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-white px-3 py-1 rounded-full" style={{ backgroundColor: pos.colour }}>{pos.party}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{pos.position}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Bills */}
        {relatedBills && relatedBills.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Related Bills</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedBills.map((bill) => {
                const total = bill.vote_count_yes + bill.vote_count_no;
                const yesPercent = total > 0 ? Math.round((bill.vote_count_yes / total) * 100) : 0;
                return (
                  <Link key={bill.id} href={`/bills/${bill.id}`} className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500 transition-colors">
                    <h3 className="text-white text-sm font-medium mb-2 line-clamp-2">{bill.title}</h3>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex mb-1">
                      <div className="bg-green-600 h-full" style={{ width: `${yesPercent}%` }} />
                      <div className="bg-red-600 h-full" style={{ width: `${100 - yesPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{yesPercent}% support</span>
                      <span>{total.toLocaleString()} votes</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
