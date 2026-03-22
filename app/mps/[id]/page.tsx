'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navigation from '../../components/Navigation'

interface MPData {
  mp: any
  contact: any
  bio: any
  sponsoredBills: any[]
  votes: any[]
  interests: any[]
}

export default function MPProfilePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<MPData | null>(null)
  const [activeSection, setActiveSection] = useState('contact')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/mps/${params.id}`)
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching MP data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-6 py-6 text-white">Loading...</div>
      </div>
    )
  }

  if (!data || !data.mp) {
    return (
      <div className="min-h-screen bg-[#0a0f1a]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-6 py-6 text-white">MP not found</div>
      </div>
    )
  }

  const { mp, contact, bio, sponsoredBills, votes, interests } = data

  // Group interests by category
  const interestsByCategory = interests?.reduce((acc: any, interest) => {
    if (!acc[interest.category_name]) {
      acc[interest.category_name] = []
    }
    acc[interest.category_name].push(interest)
    return acc
  }, {})

  const totalVotes = votes?.length || 0
  const ayeVotes = votes?.filter((v: any) => v.vote_type === 'aye').length || 0
  const noVotes = votes?.filter((v: any) => v.vote_type === 'no').length || 0

  const representations = bio?.representations || []
  const governmentPosts = bio?.government_posts || []
  const oppositionPosts = bio?.opposition_posts || []
  const committeeMemberships = bio?.committee_memberships || []

  const menuItems = [
    { id: 'contact', label: 'Contact information' },
    { id: 'parliamentary', label: 'Parliamentary career' },
    { id: 'voting', label: 'Voting record' },
    { id: 'bills', label: 'Bills sponsored' },
    { id: 'interests', label: 'Registered Interests' },
    { id: 'roles', label: 'Roles & Committees' }
  ]

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

        {/* Header */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 mb-6">
          <div className="flex items-start gap-6">
            {mp.photo_url ? (
              <img
                src={mp.photo_url}
                alt={mp.name}
                className="w-32 h-32 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-400 text-4xl font-bold">
                  {mp.name?.charAt(0)}
                </span>
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">
                {mp.display_name || mp.name}
              </h1>
              
              {mp.constituency && (
                <p className="text-xl text-gray-300 mb-3">
                  MP for {mp.constituency}
                </p>
              )}

              {mp.party && (
                <span
                  className="inline-block px-4 py-2 text-sm font-semibold rounded"
                  style={{
                    backgroundColor: mp.party_colour + '20',
                    color: mp.party_colour,
                    borderColor: mp.party_colour + '40',
                    borderWidth: '1px'
                  }}
                >
                  {mp.party}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar Menu */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 sticky top-20">
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left px-4 py-2 rounded text-sm transition ${
                      activeSection === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              
              {/* Contact Information Section */}
              {activeSection === 'contact' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Contact {mp.display_name || mp.name}</h2>
                  
                  {contact ? (
                    <div className="space-y-6">
                      {/* Parliamentary Office */}
                      <div className="bg-white/5 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-3">Parliamentary office</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-300">House of Commons</p>
                            <p className="text-gray-300">London</p>
                            <p className="text-gray-300">SW1A 0AA</p>
                          </div>
                          <div>
                            {contact.phone && (
                              <p className="text-gray-300">
                                <span className="text-gray-500">Phone:</span> {contact.phone}
                              </p>
                            )}
                            {contact.email && (
                              <p className="text-gray-300">
                                <span className="text-gray-500">Email:</span>{' '}
                                <a href={`mailto:${contact.email}`} className="text-blue-400 hover:underline">
                                  {contact.email}
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Website */}
                      {contact.website && (
                        <div className="bg-white/5 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-white mb-3">Website</h3>
                          <a 
                            href={contact.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline text-sm"
                          >
                            {contact.website}
                          </a>
                        </div>
                      )}

                      {/* Twitter */}
                      {contact.twitter && (
                        <div className="bg-white/5 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-white mb-3">X (formerly Twitter)</h3>
                          <a 
                            href={contact.twitter} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline text-sm"
                          >
                            {contact.twitter}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">No contact information available</p>
                  )}
                </div>
              )}

              {/* Parliamentary Career Section */}
              {activeSection === 'parliamentary' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Parliamentary Career</h2>
                  
                  {representations.length > 0 ? (
                    <div className="space-y-4">
                      {representations.map((rep: any, idx: number) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-white mb-2">{rep.name}</h3>
                          <p className="text-sm text-gray-400">
                            {new Date(rep.startDate).toLocaleDateString('en-GB', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })} - {rep.endDate ? new Date(rep.endDate).toLocaleDateString('en-GB', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            }) : 'present'}
                          </p>
                          {rep.additionalInfo && (
                            <p className="text-sm text-gray-300 mt-2">{rep.additionalInfo}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No parliamentary career information available</p>
                  )}
                </div>
              )}

              {/* Voting Record Section */}
              {activeSection === 'voting' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Voting Record</h2>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-white">{totalVotes}</div>
                      <div className="text-sm text-gray-400">Votes Cast</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-white">{ayeVotes}</div>
                      <div className="text-sm text-gray-400">Ayes</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-white">{noVotes}</div>
                      <div className="text-sm text-gray-400">Noes</div>
                    </div>
                  </div>

                  {/* Recent Votes */}
                  {votes && votes.length > 0 ? (
                    <div className="space-y-3">
                      {votes.slice(0, 20).map((vote: any) => (
                        <div key={vote.id} className="bg-white/5 rounded-lg p-4 flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm text-white mb-1">{vote.division_title}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(vote.division_date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded text-xs font-semibold ml-4 ${
                            vote.vote_type === 'aye' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {vote.vote_type.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No voting record available</p>
                  )}
                </div>
              )}

              {/* Bills Sponsored Section */}
              {activeSection === 'bills' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Bills Sponsored</h2>
                  
                  {sponsoredBills && sponsoredBills.length > 0 ? (
                    <div className="space-y-3">
                      {sponsoredBills.map((bill) => (
                        <Link
                          key={bill.id}
                          href={`/bills/${bill.id}`}
                          className="block bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition"
                        >
                          <h3 className="font-semibold text-white mb-2">{bill.title}</h3>
                          <div className="flex gap-3 text-xs text-gray-400">
                            <span>Stage: {bill.current_stage || 'Unknown'}</span>
                            {bill.category && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                {bill.category}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">This MP has not sponsored any bills</p>
                  )}
                </div>
              )}

              {/* Registered Interests Section */}
              {activeSection === 'interests' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Registered Interests</h2>
                  
                  {interests && interests.length > 0 ? (
                    <div className="space-y-6">
                      {Object.keys(interestsByCategory).map((categoryName) => (
                        <div key={categoryName}>
                          <h3 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-white/10">
                            {categoryName}
                          </h3>
                          
                          <div className="space-y-3">
                            {interestsByCategory[categoryName].map((interest: any) => (
                              <div key={interest.id} className="bg-white/5 rounded-lg p-4">
                                <p className="text-sm text-gray-300 whitespace-pre-wrap mb-2">
                                  {interest.interest_text}
                                </p>
                                
                                {interest.child_interests && interest.child_interests.length > 0 && (
                                  <div className="mt-3 ml-4 space-y-2">
                                    {interest.child_interests.map((child: any, idx: number) => (
                                      <div key={idx} className="text-xs text-gray-400 bg-white/5 rounded p-3 border-l-2 border-blue-500/30">
                                        {child.interest}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <p className="text-xs text-gray-500 mt-3">
                                  Registered: {new Date(interest.created_when).toLocaleDateString('en-GB')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No registered interests</p>
                  )}
                </div>
              )}

              {/* Roles & Committees Section */}
              {activeSection === 'roles' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Roles & Committees</h2>
                  
                  <div className="space-y-6">
                    {governmentPosts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Government Posts</h3>
                        <div className="space-y-2">
                          {governmentPosts.map((post: any, idx: number) => (
                            <div key={idx} className="bg-white/5 rounded-lg p-3">
                              <p className="text-sm text-white">{post.name}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(post.startDate).getFullYear()}-{post.endDate ? new Date(post.endDate).getFullYear() : 'present'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {oppositionPosts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Opposition Posts</h3>
                        <div className="space-y-2">
                          {oppositionPosts.map((post: any, idx: number) => (
                            <div key={idx} className="bg-white/5 rounded-lg p-3">
                              <p className="text-sm text-white">{post.name}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(post.startDate).getFullYear()}-{post.endDate ? new Date(post.endDate).getFullYear() : 'present'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {committeeMemberships.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Committee Memberships</h3>
                        <div className="space-y-2">
                          {committeeMemberships.map((committee: any, idx: number) => (
                            <div key={idx} className="bg-white/5 rounded-lg p-3">
                              <p className="text-sm text-white">{committee.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {governmentPosts.length === 0 && oppositionPosts.length === 0 && committeeMemberships.length === 0 && (
                      <p className="text-gray-400">No roles or committee memberships</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
