import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import { notFound } from 'next/navigation'

export const revalidate = 3600

export default async function MPProfilePage({ params }: { params: { id: string } }) {
  const memberId = parseInt(params.id)
  
  // Fetch MP data
  const { data: mp, error: mpError } = await supabase
    .from('mps')
    .select('*')
    .eq('member_id', memberId)
    .single()
  
  if (mpError || !mp) {
    notFound()
  }

  // Fetch bills sponsored by this MP
  const { data: sponsoredBills } = await supabase
    .from('bill')
    .select('*')
    .eq('sponsor_name', mp.name)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* MP Header */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Photo */}
            {mp.photo_url ? (
              <img
                src={mp.photo_url}
                alt={mp.name}
                className="w-32 h-32 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-400 text-4xl font-bold">
                  {mp.name?.charAt(0)}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">
                {mp.display_name || mp.name}
              </h1>
              
              {mp.constituency && (
                <p className="text-xl text-gray-300 mb-3">
                  MP for {mp.constituency}
                </p>
              )}

              {/* Party Badge */}
              {mp.party && (
                <div className="mb-4">
                  <span
                    className="inline-block px-4 py-2 text-sm font-semibold rounded-lg"
                    style={{
                      backgroundColor: mp.party_colour + '20',
                      color: mp.party_colour,
                      borderColor: mp.party_colour + '40',
                      borderWidth: '2px'
                    }}
                  >
                    {mp.party}
                  </span>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {mp.gender && (
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <span className="text-gray-300 ml-2">{mp.gender}</span>
                  </div>
                )}
                {mp.start_date && (
                  <div>
                    <span className="text-gray-500">MP Since:</span>
                    <span className="text-gray-300 ml-2">
                      {new Date(mp.start_date).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <div className="text-3xl font-bold text-white mb-1">
              {sponsoredBills?.length || 0}
            </div>
            <div className="text-gray-400">Bills Sponsored</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <div className="text-3xl font-bold text-white mb-1">
              {mp.votes_cast_count || 0}
            </div>
            <div className="text-gray-400">Votes Cast</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <div className="text-3xl font-bold text-white mb-1">
              {mp.constituency || 'N/A'}
            </div>
            <div className="text-gray-400">Constituency</div>
          </div>
        </div>

        {/* Sponsored Bills */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Bills Sponsored</h2>
          
          {!sponsoredBills || sponsoredBills.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8 text-center">
              <p className="text-gray-400">No bills sponsored by this MP</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sponsoredBills.map((bill) => (
                <Link
                  key={bill.id}
                  href={`/bills/${bill.id}`}
                  className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:border-white/20 transition-all p-4"
                >
                  <h3 className="font-semibold text-white mb-2 line-clamp-2">
                    {bill.title}
                  </h3>
                  
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded border border-blue-500/30">
                      {bill.category}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                    {bill.description}
                  </p>
                  
                  {bill.current_stage && (
                    <p className="text-xs text-gray-500">
                      Stage: {bill.current_stage}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
