'use client'

import { useState } from 'react'
import Link from 'next/link'

interface MPProfileClientProps {
  mp: any
  contact: any
  bio: any
  sponsoredBills: any[]
  votes: any[]
  interests: any[]
  partyColour: string
}

export default function MPProfileClient({
  mp, contact, bio, sponsoredBills, votes, interests, partyColour
}: MPProfileClientProps) {
  const [activeSection, setActiveSection] = useState('contact')

  const interestsByCategory = interests?.reduce((acc: any, interest) => {
    if (!acc[interest.category_name]) acc[interest.category_name] = []
    acc[interest.category_name].push(interest)
    return acc
  }, {})

  const totalVotes = votes?.length || 0
  const ayeVotes = votes?.filter((v: any) => v.vote_type === 'aye').length || 0
  const noVotes = votes?.filter((v: any) => v.vote_type === 'no').length || 0
  const rebellions = votes?.filter((v: any) => v.is_rebellion === true).length || 0
  const partyLoyalty = totalVotes > 0 ? ((totalVotes - rebellions) / totalVotes * 100).toFixed(1) : '100.0'

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-2 sticky top-20">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all"
                style={activeSection === item.id ? {
                  backgroundColor: partyColour + '22',
                  color: partyColour,
                  borderLeft: `3px solid ${partyColour}`
                } : {
                  color: '#9ca3af',
                  borderLeft: '3px solid transparent'
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">

          {/* Contact */}
          {activeSection === 'contact' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Contact {mp.display_name || mp.name}</h2>
              {contact ? (
                <div className="space-y-4">
                  <div className="rounded-lg p-4 border border-gray-700" style={{ borderLeftColor: partyColour, borderLeftWidth: '3px' }}>
                    <h3 className="text-base font-semibold text-white mb-3">Parliamentary office</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="text-gray-300 space-y-1">
                        <p>House of Commons</p>
                        <p>London</p>
                        <p>SW1A 0AA</p>
                      </div>
                      <div className="space-y-1">
                        {contact.phone && <p className="text-gray-300"><span className="text-gray-500">Phone:</span> {contact.phone}</p>}
                        {contact.email && <p className="text-gray-300"><span className="text-gray-500">Email:</span> <a href={'mailto:' + contact.email} className="text-blue-400 hover:underline">{contact.email}</a></p>}
                      </div>
                    </div>
                  </div>
                  {contact.website && (
                    <div className="rounded-lg p-4 border border-gray-700" style={{ borderLeftColor: partyColour, borderLeftWidth: '3px' }}>
                      <h3 className="text-base font-semibold text-white mb-2">Website</h3>
                      <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">{contact.website}</a>
                    </div>
                  )}
                  {contact.twitter && (
                    <div className="rounded-lg p-4 border border-gray-700" style={{ borderLeftColor: partyColour, borderLeftWidth: '3px' }}>
                      <h3 className="text-base font-semibold text-white mb-2">X (formerly Twitter)</h3>
                      <a href={contact.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">{contact.twitter}</a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">No contact information available</p>
              )}
            </div>
          )}

          {/* Parliamentary Career */}
          {activeSection === 'parliamentary' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Parliamentary Career</h2>
              {representations.length > 0 ? (
                <div className="space-y-3">
                  {representations.map((rep: any, idx: number) => (
                    <div key={idx} className="rounded-lg p-4 border border-gray-700" style={{ borderLeftColor: partyColour, borderLeftWidth: '3px' }}>
                      <h3 className="text-base font-semibold text-white mb-1">{rep.name}</h3>
                      <p className="text-sm text-gray-400">
                        {new Date(rep.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} — {rep.endDate ? new Date(rep.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'present'}
                      </p>
                      {rep.additionalInfo && <p className="text-sm text-gray-300 mt-1">{rep.additionalInfo}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No parliamentary career information available</p>
              )}
            </div>
          )}

          {/* Voting Record */}
          {activeSection === 'voting' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Voting Record</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Votes Cast', value: totalVotes },
                  { label: 'Ayes', value: ayeVotes },
                  { label: 'Noes', value: noVotes },
                  ...(mp.party !== 'Independent' ? [{ label: 'Party Loyalty', value: partyLoyalty + '%' }] : [])
                ].map((stat, i) => (
                  <div key={i} className="rounded-lg p-4 text-center border border-gray-700" style={{ borderTopColor: partyColour, borderTopWidth: '2px' }}>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
              {mp.party !== 'Independent' && rebellions > 0 && (
                <div className="rounded-lg p-4 mb-6 bg-orange-900/20 border border-orange-700/40">
                  <p className="text-orange-400 text-sm">⚠️ <span className="font-semibold">{rebellions} rebellion{rebellions !== 1 ? 's' : ''}</span> — voted against {mp.party} party line</p>
                </div>
              )}
              {votes && votes.length > 0 ? (
                <div className="space-y-2">
                  {votes.slice(0, 20).map((vote: any) => (
                    <div key={vote.id} className="rounded-lg p-4 border border-gray-700 flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm text-white mb-1">{vote.division_title}</p>
                        <p className="text-xs text-gray-400">{new Date(vote.division_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <span className={'px-3 py-1 rounded text-xs font-semibold ' + (vote.vote_type === 'aye' ? 'bg-green-900/40 text-green-400 border border-green-700/40' : 'bg-red-900/40 text-red-400 border border-red-700/40')}>
                          {vote.vote_type.toUpperCase()}
                        </span>
                        {vote.is_rebellion && <span className="px-3 py-1 rounded text-xs font-semibold bg-orange-900/40 text-orange-400 border border-orange-700/40">REBEL</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No voting record available</p>
              )}
            </div>
          )}

          {/* Bills Sponsored */}
          {activeSection === 'bills' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Bills Sponsored</h2>
              {sponsoredBills && sponsoredBills.length > 0 ? (
                <div className="space-y-3">
                  {sponsoredBills.map((bill) => (
                    <Link key={bill.id} href={'/bills/' + bill.id} className="block rounded-lg p-4 border border-gray-700 hover:border-gray-500 transition" style={{ borderLeftColor: partyColour, borderLeftWidth: '3px' }}>
                      <h3 className="font-semibold text-white mb-1 text-sm">{bill.title}</h3>
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span>{bill.current_stage || 'Unknown'}</span>
                        {bill.category && <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded">{bill.category}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">This MP has not sponsored any bills</p>
              )}
            </div>
          )}

          {/* Registered Interests */}
          {activeSection === 'interests' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Registered Interests</h2>
              {interests && interests.length > 0 ? (
                <div className="space-y-6">
                  {Object.keys(interestsByCategory).map((categoryName) => (
                    <div key={categoryName}>
                      <h3 className="text-base font-semibold mb-3 pb-2 border-b border-gray-700" style={{ color: partyColour }}>{categoryName}</h3>
                      <div className="space-y-2">
                        {interestsByCategory[categoryName].map((interest: any) => (
                          <div key={interest.id} className="rounded-lg p-4 border border-gray-700">
                            <p className="text-sm text-gray-300 whitespace-pre-wrap mb-2">{interest.interest_text}</p>
                            {interest.child_interests && interest.child_interests.length > 0 && (
                              <div className="mt-2 ml-4 space-y-1">
                                {interest.child_interests.map((child: any, idx: number) => (
                                  <div key={idx} className="text-xs text-gray-400 bg-gray-800 rounded p-2" style={{ borderLeft: '2px solid ' + partyColour + '60' }}>{child.interest}</div>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">Registered: {new Date(interest.created_when).toLocaleDateString('en-GB')}</p>
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

          {/* Roles & Committees */}
          {activeSection === 'roles' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Roles & Committees</h2>
              <div className="space-y-6">
                {governmentPosts.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3" style={{ color: partyColour }}>Government Posts</h3>
                    <div className="space-y-2">
                      {governmentPosts.map((post: any, idx: number) => (
                        <div key={idx} className="rounded-lg p-3 border border-gray-700" style={{ borderLeftColor: partyColour, borderLeftWidth: '3px' }}>
                          <p className="text-sm text-white">{post.name}</p>
                          <p className="text-xs text-gray-400">{new Date(post.startDate).getFullYear()} — {post.endDate ? new Date(post.endDate).getFullYear() : 'present'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {oppositionPosts.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3" style={{ color: partyColour }}>Opposition Posts</h3>
                    <div className="space-y-2">
                      {oppositionPosts.map((post: any, idx: number) => (
                        <div key={idx} className="rounded-lg p-3 border border-gray-700" style={{ borderLeftColor: partyColour, borderLeftWidth: '3px' }}>
                          <p className="text-sm text-white">{post.name}</p>
                          <p className="text-xs text-gray-400">{new Date(post.startDate).getFullYear()} — {post.endDate ? new Date(post.endDate).getFullYear() : 'present'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {committeeMemberships.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3" style={{ color: partyColour }}>Committee Memberships</h3>
                    <div className="space-y-2">
                      {committeeMemberships.map((committee: any, idx: number) => (
                        <div key={idx} className="rounded-lg p-3 border border-gray-700" style={{ borderLeftColor: partyColour, borderLeftWidth: '3px' }}>
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
  )
}
