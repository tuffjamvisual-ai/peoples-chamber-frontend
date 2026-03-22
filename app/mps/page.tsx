import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navigation from '../components/Navigation'

export const revalidate = 3600 // Revalidate every hour

export default async function MPsPage() {
  // Fetch all current MPs
  const { data: mps, error } = await supabase
    .from('mps')
    .select('*')
    .eq('current_member', true)
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching MPs:', error)
  }

  // Group MPs by party
  const mpsByParty = mps?.reduce((acc: any, mp) => {
    const party = mp.party || 'Independent'
    if (!acc[party]) acc[party] = []
    acc[party].push(mp)
    return acc
  }, {})

  const parties = Object.keys(mpsByParty || {}).sort((a, b) => 
    mpsByParty[b].length - mpsByParty[a].length
  )

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Members of Parliament</h1>
          <p className="text-gray-400">
            All current MPs in the House of Commons
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {mps?.length || 0} MPs • {parties.length} parties
          </p>
        </div>

        {/* MPs List */}
        {!mps || mps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No MPs found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {parties.map((party) => (
              <div key={party}>
                {/* Party Header */}
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: mpsByParty[party][0].party_colour }}
                    />
                    {party}
                    <span className="text-lg text-gray-400 font-normal">
                      ({mpsByParty[party].length} {mpsByParty[party].length === 1 ? 'MP' : 'MPs'})
                    </span>
                  </h2>
                </div>

                {/* MPs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {mpsByParty[party].map((mp: any) => (
                    <Link
                      key={mp.id}
                      href={`/mps/${mp.member_id}`}
                      className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:border-white/20 transition-all p-4"
                    >
                      {/* MP Photo & Info */}
                      <div className="flex items-start gap-3">
                        {mp.photo_url ? (
                          <img
                            src={mp.photo_url}
                            alt={mp.name}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 text-xl font-bold">
                              {mp.name?.charAt(0)}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white mb-1 line-clamp-2">
                            {mp.display_name || mp.name}
                          </h3>
                          
                          {mp.constituency && (
                            <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                              {mp.constituency}
                            </p>
                          )}

                          {mp.party_abbreviation && (
                            <span
                              className="inline-block px-2 py-0.5 text-xs font-medium rounded"
                              style={{
                                backgroundColor: mp.party_colour + '20',
                                color: mp.party_colour,
                                borderColor: mp.party_colour + '40',
                                borderWidth: '1px'
                              }}
                            >
                              {mp.party_abbreviation}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
