'use client';

import { useState } from 'react';
import Image from 'next/image';

interface MPProfileProps {
  mp: any;
  contact: any;
  bio: any;
  sponsoredBills: any[];
  votes: any[];
  interests: any[];
  expenses: any;
  expensesDetail: any[];
  earnings: any;
  partyColour: string;
}

export default function MPProfile({
  mp,
  contact,
  bio,
  sponsoredBills,
  votes,
  interests,
  expenses,
  expensesDetail,
  earnings,
  partyColour
}: MPProfileProps) {
  const [activeSection, setActiveSection] = useState(
    bio?.political_bio ? 'bio' : 'contact'
  );

  const menuItems = [
    ...(bio?.political_bio ? [{ id: 'bio', label: 'Political Bio' }] : []),
    { id: 'contact', label: 'Contact' },
    ...(votes?.length > 0 ? [{ id: 'voting', label: 'Voting Record' }] : []),
    ...(sponsoredBills?.length > 0 ? [{ id: 'bills', label: 'Bills Sponsored' }] : []),
    ...(interests?.length > 0 ? [{ id: 'interests', label: 'Interests' }] : []),
    ...((bio?.committee_memberships?.length > 0 || bio?.government_posts?.length > 0 || bio?.opposition_posts?.length > 0)
        ? [{ id: 'roles', label: 'Roles' }] : []),
    ...(earnings?.total_amount > 0 ? [{ id: 'earnings', label: 'Earnings' }] : []),
    ...(expenses ? [{ id: 'expenses', label: 'Expenses' }] : []),
  ];

  return (
    <div className="font-['Special_Elite']">
      {/* Hero */}
      <div className="flex gap-8 mb-12">
        <div className="polaroid-frame">
          <Image src={mp.photo_url} alt={mp.display_name} width={240} height={300} className="object-cover" style={{ display: 'block' }} />
        </div>
        <div className="flex-1">
          <h1 className="font-['Libre_Bodoni'] text-5xl font-bold mb-2 text-[#14100d]">{mp.display_name}</h1>
          <p className="text-xl mb-4 text-[#4a3d2f]">
            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: partyColour }} />
            {mp.party} • {mp.constituency}
          </p>
          <p className="text-sm text-[#4a3d2f] mb-6">
            Member since {new Date(mp.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4">
              <div className="text-3xl font-bold text-[#14100d]">{mp.bills_sponsored_count || 0}</div>
              <div className="text-sm text-[#4a3d2f] uppercase tracking-wider">Bills Sponsored</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-[#14100d]">{mp.votes_cast_count || 0}</div>
              <div className="text-sm text-[#4a3d2f] uppercase tracking-wider">Votes Cast</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-16">
            <p className="text-xs uppercase tracking-widest text-[#4a3d2f] mb-4">Sections</p>
            <nav className="space-y-1">
              {menuItems.map(item => {
                const active = activeSection === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left px-4 py-3 uppercase tracking-wide text-sm transition-colors
                      ${active ? 'text-[#14100d] font-semibold border-l-4 border-[#7a1612]' : 'text-[#4a3d2f] hover:bg-[#14100d]/5'}`}>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="lg:col-span-3">
          {activeSection === 'bio' && bio?.political_bio && (
            <div>
              <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d]">Political Biography</h2>
              <div className="text-base leading-relaxed text-[#14100d] whitespace-pre-wrap">{bio.political_bio}</div>
            </div>
          )}

          {activeSection === 'contact' && (
            <div>
              <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d]">Contact</h2>
              <div className="space-y-3">
                {contact?.email && <div><span className="font-bold">Email:</span> {contact.email}</div>}
                {contact?.phone && <div><span className="font-bold">Phone:</span> {contact.phone}</div>}
                {contact?.website && <div><span className="font-bold">Website:</span> <a href={contact.website} className="text-[#1c4c78] underline">{contact.website}</a></div>}
                {contact?.twitter && <div><span className="font-bold">Twitter:</span> @{contact.twitter}</div>}
              </div>
            </div>
          )}

          {activeSection === 'voting' && votes?.length > 0 && (
            <div>
              <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d]">Voting Record ({votes.length})</h2>
              <div className="space-y-4">
                {votes.slice(0, 20).map((vote: any, idx: number) => (
                  <div key={vote?.id ?? idx} className="py-2">
                    <div className="font-bold">{vote.division_title}</div>
                    <div className="text-sm text-[#4a3d2f]">Voted: <span className="font-bold">{vote.vote}</span> • {vote.division_date ? new Date(vote.division_date).toLocaleDateString('en-GB') : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'bills' && sponsoredBills?.length > 0 && (
            <div>
              <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d]">Sponsored Bills ({sponsoredBills.length})</h2>
              <div className="space-y-6">
                {sponsoredBills.map((bill: any) => (
                  <div key={bill.id}>
                    <h3 className="font-bold text-lg mb-1">{bill.title}</h3>
                    {bill.plain_summary && <p className="text-sm text-[#4a3d2f]">{bill.plain_summary}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'interests' && interests?.length > 0 && (
            <div>
              <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d]">Registered Interests ({interests.length})</h2>
              <div className="space-y-6">
                {interests.map((interest: any, idx: number) => (
                  <div key={interest?.id ?? idx}>
                    <div className="font-bold text-sm uppercase tracking-wider text-[#7a1612] mb-2">{interest.category}</div>
                    <div className="text-base">{interest.description}</div>
                    {interest.registered_date && <div className="text-sm text-[#4a3d2f] mt-2">Registered: {new Date(interest.registered_date).toLocaleDateString('en-GB')}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'roles' && (
            <div>
              <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d]">Roles & Positions</h2>
              {bio?.government_posts?.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-xl mb-4">Government Posts</h3>
                  <div className="space-y-3">
                    {bio.government_posts.map((post: any, idx: number) => {
                      const startDate = post?.startDate ?? post?.start_date;
                      return (
                        <div key={post?.id ?? idx}>
                          <div className="font-bold">{post?.name ?? String(post)}</div>
                          {startDate && <div className="text-sm text-[#4a3d2f]">Since {new Date(startDate).toLocaleDateString('en-GB')}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {bio?.opposition_posts?.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-xl mb-4">Opposition Posts</h3>
                  <div className="space-y-3">
                    {bio.opposition_posts.map((post: any, idx: number) => {
                      const startDate = post?.startDate ?? post?.start_date;
                      return (
                        <div key={post?.id ?? idx}>
                          <div className="font-bold">{post?.name ?? String(post)}</div>
                          {startDate && <div className="text-sm text-[#4a3d2f]">Since {new Date(startDate).toLocaleDateString('en-GB')}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {bio?.committee_memberships?.length > 0 && (
                <div>
                  <h3 className="font-bold text-xl mb-4">Committee Memberships</h3>
                  <div className="space-y-2">
                    {bio.committee_memberships.map((committee: any, idx: number) => (
                      <div key={committee?.id ?? idx}>{committee?.name ?? String(committee)}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'earnings' && earnings?.total_amount > 0 && (
            <div>
              <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d]">Outside Earnings</h2>
              <div className="mb-4">
                <div className="text-3xl font-bold text-[#14100d]">£{Number(earnings.total_amount).toLocaleString('en-GB')}</div>
                <div className="text-sm text-[#4a3d2f]">Total declared earnings</div>
              </div>
              {earnings.by_category && (
                <div className="space-y-2">
                  {Object.entries(earnings.by_category).map(([category, amount]: [string, any]) => (
                    <div key={category} className="flex justify-between py-2">
                      <span>{category}</span>
                      <span className="font-bold">£{Number(amount).toLocaleString('en-GB')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'expenses' && expenses && (
            <div>
              <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d]">Expenses</h2>
              {expenses.by_year && (
                <div className="space-y-3 mb-8">
                  {Object.entries(expenses.by_year).sort(([a], [b]) => Number(b) - Number(a)).slice(0, 5).map(([year, amount]: [string, any]) => (
                    <div key={year} className="flex justify-between py-2">
                      <span className="font-bold">{year}</span>
                      <span className="text-lg">£{Number(amount).toLocaleString('en-GB')}</span>
                    </div>
                  ))}
                </div>
              )}
              {expensesDetail?.length > 0 && (
                <div>
                  <h3 className="font-bold text-xl mb-4">Largest Claims</h3>
                  <div className="space-y-4">
                    {expensesDetail.sort((a: any, b: any) => b.amount - a.amount).slice(0, 10).map((claim: any) => (
                      <div key={claim.id} className="py-3">
                        <div className="flex justify-between mb-2">
                          <div className="font-bold">{claim.category}</div>
                          <div className="text-lg font-bold">£{Number(claim.amount).toLocaleString('en-GB')}</div>
                        </div>
                        {claim.description && <div className="text-sm text-[#4a3d2f]">{claim.description}</div>}
                        <div className="text-sm text-[#4a3d2f] mt-1">{new Date(claim.date).toLocaleDateString('en-GB')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
