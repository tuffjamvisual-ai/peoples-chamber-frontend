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

const ACCENT = '#a8ff3e'
const SUCCESS = '#34d399'
const DANGER = '#f87171'
const WARN = '#fbbf24'

export default function MPProfileClient({
  mp,
  contact,
  bio,
  sponsoredBills,
  votes,
  interests,
  partyColour,
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
    { id: 'contact', label: 'Contact' },
    { id: 'parliamentary', label: 'Career' },
    { id: 'voting', label: 'Voting record' },
    { id: 'bills', label: 'Bills sponsored' },
    { id: 'interests', label: 'Interests' },
    { id: 'roles', label: 'Roles' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-[#1a2e1a] border border-[#1a2e1a]">
      {/* Sidebar */}
      <aside className="lg:col-span-1 bg-[#0f1a0f]">
        <div className="lg:sticky lg:top-16">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-200 font-medium px-4 pt-5 pb-3">
            Sections
          </p>
          <nav>
            {menuItems.map((item) => {
              const active = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={
                    'w-full text-left px-4 py-3 text-[12px] uppercase tracking-[0.15em] transition-colors border-l-2 ' +
                    (active
                      ? 'text-white bg-[#111827] border-l-[#a8ff3e] font-semibold'
                      : 'text-gray-200 border-l-transparent hover:text-white hover:bg-[#111827]')
                  }
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:col-span-3 bg-[#0f1a0f] p-6 sm:p-8">
        {activeSection === 'contact' && (
          <Section title={`Contact ${mp.display_name || mp.name}`}>
            {contact ? (
              <div className="space-y-px bg-[#1a2e1a] border border-[#1a2e1a]">
                <Card title="Parliamentary office" partyColour={partyColour}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] leading-[1.7]">
                    <div className="text-gray-200 space-y-0.5">
                      <p>House of Commons</p>
                      <p>London</p>
                      <p className="font-mono">SW1A 0AA</p>
                    </div>
                    <div className="space-y-1">
                      {contact.phone && (
                        <p className="text-gray-200">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-gray-200 mr-2">Phone</span>
                          <span className="text-white font-mono text-[13px]">{contact.phone}</span>
                        </p>
                      )}
                      {contact.email && (
                        <p className="text-gray-200">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-gray-200 mr-2 block sm:inline">Email</span>
                          <a href={'mailto:' + contact.email} className="text-[#a8ff3e] hover:underline break-all">
                            {contact.email}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
                {contact.website && (
                  <Card title="Website" partyColour={partyColour}>
                    <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-[#a8ff3e] hover:underline text-[13px] break-all">
                      {contact.website}
                    </a>
                  </Card>
                )}
                {contact.twitter && (
                  <Card title="X (formerly Twitter)" partyColour={partyColour}>
                    <a href={contact.twitter} target="_blank" rel="noopener noreferrer" className="text-[#a8ff3e] hover:underline text-[13px] break-all">
                      {contact.twitter}
                    </a>
                  </Card>
                )}
              </div>
            ) : (
              <Empty>No contact information available</Empty>
            )}
          </Section>
        )}

        {activeSection === 'parliamentary' && (
          <Section title="Parliamentary Career">
            {representations.length > 0 ? (
              <div className="space-y-px bg-[#1a2e1a] border border-[#1a2e1a]">
                {representations.map((rep: any, idx: number) => (
                  <Card key={idx} title={rep.name} partyColour={partyColour}>
                    <p className="text-[12px] text-gray-200 font-mono leading-[1.7]">
                      {new Date(rep.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} —{' '}
                      {rep.endDate ? new Date(rep.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'present'}
                    </p>
                    {rep.additionalInfo && <p className="text-[13px] text-gray-200 mt-2 leading-[1.7]">{rep.additionalInfo}</p>}
                  </Card>
                ))}
              </div>
            ) : (
              <Empty>No parliamentary career information available</Empty>
            )}
          </Section>
        )}

        {activeSection === 'voting' && (
          <Section title="Voting Record">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#1a2e1a] border border-[#1a2e1a] mb-8">
              <Stat label="Votes Cast" value={totalVotes} />
              <Stat label="Ayes" value={ayeVotes} colour={SUCCESS} />
              <Stat label="Noes" value={noVotes} colour={DANGER} />
              {mp.party !== 'Independent' && <Stat label="Party Loyalty" value={`${partyLoyalty}%`} colour={ACCENT} />}
            </div>

            {mp.party !== 'Independent' && rebellions > 0 && (
              <div className="border-l-2 px-4 py-3 mb-8 bg-[#111827]" style={{ borderLeftColor: WARN }}>
                <p className="text-[10px] uppercase tracking-[0.25em] mb-1 font-semibold" style={{ color: WARN }}>Rebellion Notice</p>
                <p className="text-[13px] text-white leading-[1.7]">
                  <span className="font-semibold">{rebellions} rebellion{rebellions !== 1 ? 's' : ''}</span> against the {mp.party} party line.
                </p>
              </div>
            )}

            {votes && votes.length > 0 ? (
              <ul className="space-y-px bg-[#1a2e1a] border border-[#1a2e1a]">
                {votes.slice(0, 20).map((vote: any) => (
                  <li
                    key={vote.id}
                    className="flex items-start justify-between gap-4 bg-[#0f1a0f] p-4 border-l-2"
                    style={{ borderLeftColor: vote.vote_type === 'aye' ? SUCCESS : DANGER }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white font-semibold leading-snug mb-1">{vote.division_title}</p>
                      <p className="text-[11px] text-gray-200 font-mono">
                        {new Date(vote.division_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Tag colour={vote.vote_type === 'aye' ? SUCCESS : DANGER}>{vote.vote_type.toUpperCase()}</Tag>
                      {vote.is_rebellion && <Tag colour={WARN}>REBEL</Tag>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No voting record available</Empty>
            )}
          </Section>
        )}

        {activeSection === 'bills' && (
          <Section title="Bills Sponsored">
            {sponsoredBills && sponsoredBills.length > 0 ? (
              <ul className="space-y-px bg-[#1a2e1a] border border-[#1a2e1a]">
                {sponsoredBills.map((bill) => (
                  <li key={bill.id} className="bg-[#0f1a0f]">
                    <Link
                      href={'/bills/' + bill.id}
                      className="block p-4 border-l-2 hover:bg-[#111827] transition-colors"
                      style={{ borderLeftColor: partyColour }}
                    >
                      <h3 className="text-[13px] font-semibold text-white mb-1 leading-snug">{bill.title}</h3>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-gray-200 font-mono uppercase tracking-[0.15em]">{bill.current_stage || 'Unknown'}</span>
                        {bill.category && <Tag colour={ACCENT}>{bill.category}</Tag>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>This MP has not sponsored any bills</Empty>
            )}
          </Section>
        )}

        {activeSection === 'interests' && (
          <Section title="Registered Interests">
            {interests && interests.length > 0 ? (
              <div className="space-y-10">
                {Object.keys(interestsByCategory).map((categoryName) => (
                  <div key={categoryName}>
                    <h3 className="text-[10px] uppercase tracking-[0.25em] mb-4 pb-3 border-b border-[#1a2e1a] font-semibold" style={{ color: ACCENT }}>
                      {categoryName}
                    </h3>
                    <ul className="space-y-px bg-[#1a2e1a] border border-[#1a2e1a]">
                      {interestsByCategory[categoryName].map((interest: any) => (
                        <li key={interest.id} className="bg-[#0f1a0f] p-4 border-l-2" style={{ borderLeftColor: partyColour }}>
                          <p className="text-[13px] text-gray-200 whitespace-pre-wrap leading-[1.7] mb-2">{interest.interest_text}</p>
                          {interest.child_interests && interest.child_interests.length > 0 && (
                            <ul className="mt-2 ml-3 space-y-1">
                              {interest.child_interests.map((child: any, idx: number) => (
                                <li
                                  key={idx}
                                  className="text-[12px] text-gray-200 bg-[#111827] p-2 border-l-2 leading-[1.7]"
                                  style={{ borderLeftColor: partyColour + '60' }}
                                >
                                  {child.interest}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="text-[11px] text-gray-200 mt-2 font-mono">
                            Registered: {new Date(interest.created_when).toLocaleDateString('en-GB')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No registered interests</Empty>
            )}
          </Section>
        )}

        {activeSection === 'roles' && (
          <Section title="Roles & Committees">
            <div className="space-y-10">
              {governmentPosts.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] mb-4 pb-3 border-b border-[#1a2e1a] font-semibold" style={{ color: ACCENT }}>
                    Government Posts
                  </h3>
                  <ul className="space-y-px bg-[#1a2e1a] border border-[#1a2e1a]">
                    {governmentPosts.map((post: any, idx: number) => (
                      <RolesRow key={idx} post={post} partyColour={partyColour} />
                    ))}
                  </ul>
                </div>
              )}
              {oppositionPosts.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] mb-4 pb-3 border-b border-[#1a2e1a] font-semibold" style={{ color: ACCENT }}>
                    Opposition Posts
                  </h3>
                  <ul className="space-y-px bg-[#1a2e1a] border border-[#1a2e1a]">
                    {oppositionPosts.map((post: any, idx: number) => (
                      <RolesRow key={idx} post={post} partyColour={partyColour} />
                    ))}
                  </ul>
                </div>
              )}
              {committeeMemberships.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] mb-4 pb-3 border-b border-[#1a2e1a] font-semibold" style={{ color: ACCENT }}>
                    Committee Memberships
                  </h3>
                  <ul className="space-y-px bg-[#1a2e1a] border border-[#1a2e1a]">
                    {committeeMemberships.map((committee: any, idx: number) => (
                      <li key={idx} className="bg-[#0f1a0f] p-4 border-l-2" style={{ borderLeftColor: partyColour }}>
                        <p className="text-[13px] text-white font-semibold leading-snug">{committee.name}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {governmentPosts.length === 0 && oppositionPosts.length === 0 && committeeMemberships.length === 0 && (
                <Empty>No roles or committee memberships</Empty>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-8 leading-tight">{title}</h2>
      {children}
    </div>
  )
}

function Card({ title, children, partyColour }: { title: string; children: React.ReactNode; partyColour: string }) {
  return (
    <div className="bg-[#0f1a0f] p-5 border-l-2" style={{ borderLeftColor: partyColour }}>
      <p className="text-[10px] uppercase tracking-[0.25em] mb-3 font-semibold text-white">{title}</p>
      {children}
    </div>
  )
}

function Stat({ label, value, colour }: { label: string; value: string | number; colour?: string }) {
  return (
    <div className="bg-[#0f1a0f] px-4 py-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-gray-200 font-medium mb-2">{label}</p>
      <p className="text-2xl sm:text-3xl font-black leading-none tracking-tight" style={{ color: colour || '#ffffff' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}

function Tag({ colour, children }: { colour: string; children: React.ReactNode }) {
  return (
    <span
      className="px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] font-semibold rounded-sm"
      style={{ color: colour, backgroundColor: colour + '22', border: `1px solid ${colour}55` }}
    >
      {children}
    </span>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-200 text-[13px] leading-[1.7]">{children}</p>
}

function RolesRow({ post, partyColour }: { post: any; partyColour: string }) {
  return (
    <li className="bg-[#0f1a0f] p-4 border-l-2" style={{ borderLeftColor: partyColour }}>
      <p className="text-[13px] text-white font-semibold leading-snug">{post.name}</p>
      <p className="text-[11px] text-gray-200 font-mono mt-1">
        {new Date(post.startDate).getFullYear()} — {post.endDate ? new Date(post.endDate).getFullYear() : 'present'}
      </p>
    </li>
  )
}
