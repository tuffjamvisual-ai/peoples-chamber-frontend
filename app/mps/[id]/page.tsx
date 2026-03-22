import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import { notFound } from 'next/navigation'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MPProfilePage({ params }: PageProps) {
  const resolvedParams = await params
  const memberId = parseInt(resolvedParams.id)
  
  // Fetch MP data
  const { data: mp } = await supabase
    .from('mps')
    .select('*')
    .eq('member_id', memberId)
    .single()
  
  if (!mp) notFound()

  // Fetch contact info
  const { data: contact } = await supabase
    .from('mp_contact')
    .select('*')
    .eq('member_id', memberId)
    .single()

  // Fetch biography
  const { data: bio } = await supabase
    .from('mp_biography')
    .select('*')
    .eq('member_id', memberId)
    .single()

  // Fetch sponsored bills
  const { data: sponsoredBills } = await supabase
    .from('bill')
    .select('*')
    .eq('sponsor_name', mp.name)
    .order('created_at', { ascending: false })

  // Fetch voting records
  const { data: votes } = await supabase
    .from('mp_division_votes')
    .select('*')
    .eq('member_id', memberId)
    .order('division_date', { ascending: false })

  // Calculate voting stats
  const totalVotes = votes?.length || 0
  const ayeVotes = votes?.filter(v => v.vote_type === 'aye').length || 0
  const noVotes = votes?.filter(v => v.vote_type === 'no').length || 0

  const representations = bio?.representations || []
  const governmentPosts = bio?.government_posts || []
  const oppositionPosts = bio?.opposition_posts || []
  const committeeMemberships = bio?.committee_memberships || []

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Back Button */}
        <Link 
          href="/mps"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <span>←</span>
          <span>Back to all MPs</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - MP Info */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 sticky top-20">
              {/* Photo */}
              {mp.photo_url ? (
                <img
                  src={mp.photo_url}
                  alt={mp.name}
                  className="w-32 h-32 rounded-lg object-cover mx-auto mb-4"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-4xl font-bold">
                    {mp.name?.charAt(0)}
                  </span>
                </div>
              )}

              <h1 className="text-2xl font-bold text-white text-center mb-2">
                {mp.display_name || mp.name}
              </h1>
              
              {mp.constituency && (
                <p className="text-gray-300 text-center mb-4">
                  {mp.constituency}
                </p>
              )}

              {/* Parliamentary Terms */}
              {representations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Parliamentary Terms</h3>
                  <div className="space-y-1">
                    {representations.map((rep: any, idx: number) => (
                      <div key={idx} className="text-xs text-gray-300 bg-white/5 rounded px-2 py-1">
                        {new Date(rep.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} - {rep.endDate ? new Date(rep.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'present'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Party */}
              {mp.party && (
                <div className="text-center mb-4">
                  <span
                    className="inline-block px-3 py-1 text-sm font-semibold rounded"
                    style={{
                      backgroundColor: mp.party_colour + '20',
                      color: mp.party_colour,
                      borderColor: mp.party_colour + '40',
                      borderWidth: '1px'
                    }}
                  >
                    {mp.party}
                  </span>
                </div>
              )}

              {/* Contact Icons */}
              {contact && (
                <div className="flex justify-center gap-3 pt-4 border-t border-white/10">
                  {contact.twitter && (
                    <a href={contact.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                      <span className="text-xl">𝕏</span>
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-gray-400 hover:text-white">
                      <span className="text-xl">✉</span>
                    </a>
                  )}
                  {contact.website && (
                    <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                      <span className="text-xl">🌐</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Activity */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bills Sponsored */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Bills Sponsored by {mp.display_name || mp.name}
              </h2>
              
              {!sponsoredBills || sponsoredBills.length === 0 ? (
                <p className="text-gray-400 text-center py-8">This MP has not sponsored any bills</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sponsoredBills.slice(0, 5).map((bill) => (
                    <Link
                      key={bill.id}
                      href={`/bills/${bill.id}`}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition"
                    >
                      <h3 className="font-semibold text-white text-sm mb-1">{bill.title}</h3>
                      <p className="text-xs text-gray-400">Stage: {bill.current_stage || 'Unknown'}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Voting Record */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Voting Record</h2>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{totalVotes}</div>
                  <div className="text-xs text-gray-400">Votes Cast</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{ayeVotes}</div>
                  <div className="text-xs text-gray-400">Ayes</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{noVotes}</div>
                  <div className="text-xs text-gray-400">Noes</div>
                </div>
              </div>

              {/* Recent Votes */}
              {votes && votes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Votes</h3>
                  <div className="space-y-2">
                    {votes.slice(0, 10).map((vote: any) => (
                      <div key={vote.id} className="bg-white/5 rounded p-3 flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-sm text-white">{vote.division_title}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(vote.division_date).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${
                          vote.vote_type === 'aye' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {vote.vote_type.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Posts & Committees */}
            {(governmentPosts.length > 0 || oppositionPosts.length > 0 || committeeMemberships.length > 0) && (
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Roles & Committees</h2>
                
                {governmentPosts.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Government Posts</h3>
                    {governmentPosts.map((post: any, idx: number) => (
                      <div key={idx} className="text-sm text-gray-400 mb-1">
                        {post.name} ({new Date(post.startDate).getFullYear()}-{post.endDate ? new Date(post.endDate).getFullYear() : 'present'})
                      </div>
                    ))}
                  </div>
                )}

                {oppositionPosts.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Opposition Posts</h3>
                    {oppositionPosts.map((post: any, idx: number) => (
                      <div key={idx} className="text-sm text-gray-400 mb-1">
                        {post.name} ({new Date(post.startDate).getFullYear()}-{post.endDate ? new Date(post.endDate).getFullYear() : 'present'})
                      </div>
                    ))}
                  </div>
                )}

                {committeeMemberships.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Committee Memberships</h3>
                    {committeeMemberships.map((committee: any, idx: number) => (
                      <div key={idx} className="text-sm text-gray-400 mb-1">
                        {committee.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
