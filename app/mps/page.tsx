import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 3600 // Revalidate every hour

export default async function MPsPage() {
  const supabase = createClient()
  
  // Fetch all current MPs
  const { data: mps, error } = await supabase
    .from('mps')
    .select('*')
    .eq('current_member', true)
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching MPs:', error)
    return <div className="p-8">Error loading MPs</div>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Members of Parliament</h1>
          <p className="text-gray-600">
            All current MPs in the House of Commons
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {mps?.length || 0} MPs • {parties.length} parties
          </p>
        </div>
      </div>

      {/* MPs List */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!mps || mps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No MPs found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {parties.map((party) => (
              <div key={party}>
                {/* Party Header */}
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: mpsByParty[party][0].party_colour }}
                    />
                    {party}
                    <span className="text-lg text-gray-500 font-normal">
                      ({mpsByParty[party].length} {mpsByParty[party].length === 1 ? 'MP' : 'MPs'})
                    </span>
                  </h2>
                </div>

                {/* MPs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {mpsByParty[party].map((mp: any) => (
                    <div
                      key={mp.id}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200"
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
                          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 text-xl font-bold">
                              {mp.name?.charAt(0)}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                            {mp.display_name || mp.name}
                          </h3>
                          
                          {mp.constituency && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {mp.constituency}
                            </p>
                          )}

                          {mp.party_abbreviation && (
                            <span
                              className="inline-block px-2 py-0.5 text-xs font-medium rounded"
                              style={{
                                backgroundColor: mp.party_colour + '20',
                                color: mp.party_colour
                              }}
                            >
                              {mp.party_abbreviation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
