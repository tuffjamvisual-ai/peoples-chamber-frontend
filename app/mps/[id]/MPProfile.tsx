'use client';

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
  expensesDetail,
  earnings,
  partyColour,
}: MPProfileProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 font-['Special_Elite']">
      {/* Hero Section with Polaroid Photo */}
      <div className="flex gap-8 mb-12">
        <div className="polaroid-frame">
          <Image
            src={mp.photo_url}
            alt={mp.display_name}
            width={240}
            height={300}
            className="object-cover"
            style={{ display: 'block' }}
          />
        </div>

        <div className="flex-1">
          <h1 className="font-['Libre_Bodoni'] text-5xl font-bold mb-2 text-[#14100d]">
            {mp.display_name}
          </h1>
          <p className="text-xl mb-4 text-[#4a3d2f]">
            <span
              className="inline-block w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: partyColour }}
            />
            {mp.party} • {mp.constituency}
          </p>
          <p className="text-sm text-[#4a3d2f] mb-6">
            Member since {new Date(mp.start_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          {/* Quick Stats - no backgrounds, just borders */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-[#14100d]/30 p-4">
              <div className="text-3xl font-bold text-[#14100d]">{mp.bills_sponsored_count || 0}</div>
              <div className="text-sm text-[#4a3d2f] uppercase tracking-wider">Bills Sponsored</div>
            </div>
            <div className="border-2 border-[#14100d]/30 p-4">
              <div className="text-3xl font-bold text-[#14100d]">{mp.votes_cast_count || 0}</div>
              <div className="text-sm text-[#4a3d2f] uppercase tracking-wider">Votes Cast</div>
            </div>
          </div>
        </div>
      </div>

      {/* Biography Section */}
      {bio?.political_bio && (
        <section className="mb-12">
          <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d] border-b-2 border-[#7a1612] pb-2">
            Political Biography
          </h2>
          <div className="text-base leading-relaxed text-[#14100d] whitespace-pre-wrap">
            {bio.political_bio}
          </div>
        </section>
      )}

      {/* Contact Information */}
      {contact && Object.values(contact).some((v) => v) && (
        <section className="mb-12">
          <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d] border-b-2 border-[#7a1612] pb-2">
            Contact
          </h2>
          <div className="border-2 border-[#14100d]/30 p-6 space-y-3">
            {contact.email && (
              <div><span className="font-bold">Email:</span> {contact.email}</div>
            )}
            {contact.phone && (
              <div><span className="font-bold">Phone:</span> {contact.phone}</div>
            )}
            {contact.website && (
              <div><span className="font-bold">Website:</span> <a href={contact.website} className="text-[#1c4c78] underline">{contact.website}</a></div>
            )}
            {contact.twitter && (
              <div><span className="font-bold">Twitter:</span> @{contact.twitter}</div>
            )}
          </div>
        </section>
      )}

      {/* Sponsored Bills */}
      {sponsoredBills && sponsoredBills.length > 0 && (
        <section className="mb-12">
          <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d] border-b-2 border-[#7a1612] pb-2">
            Sponsored Bills ({sponsoredBills.length})
          </h2>
          <div className="space-y-4">
            {sponsoredBills.slice(0, 5).map((bill: any) => (
              <div key={bill.id} className="border-2 border-[#14100d]/30 p-4">
                <h3 className="font-bold text-lg mb-1">{bill.title}</h3>
                {bill.plain_summary && (
                  <p className="text-sm text-[#4a3d2f]">{bill.plain_summary}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Committee Memberships */}
      {bio?.committee_memberships && bio.committee_memberships.length > 0 && (
        <section className="mb-12">
          <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d] border-b-2 border-[#7a1612] pb-2">
            Committee Memberships
          </h2>
          <ul className="space-y-2">
            {bio.committee_memberships.map((committee: any, idx: number) => (
              <li key={committee?.id ?? idx} className="border-l-4 border-[#7a1612] pl-4">
                <span className="font-bold">{committee?.name ?? String(committee)}</span>
                {committee?.house && (
                  <span className="ml-2 text-sm text-[#4a3d2f]">· {committee.house}</span>
                )}
                {committee?.startDate && (
                  <span className="ml-2 text-sm text-[#4a3d2f]">
                    · since {new Date(committee.startDate).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Government Posts */}
      {bio?.government_posts && bio.government_posts.length > 0 && (
        <section className="mb-12">
          <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d] border-b-2 border-[#7a1612] pb-2">
            Government Posts
          </h2>
          <div className="space-y-3">
            {bio.government_posts.map((post: any, idx: number) => {
              const startDate = post?.startDate ?? post?.start_date
              return (
                <div key={post?.id ?? idx} className="border-l-4 border-[#7a1612] pl-4">
                  <div className="font-bold">{post?.name ?? String(post)}</div>
                  {startDate && (
                    <div className="text-sm text-[#4a3d2f]">
                      Since {new Date(startDate).toLocaleDateString('en-GB', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Opposition Posts */}
      {bio?.opposition_posts && bio.opposition_posts.length > 0 && (
        <section className="mb-12">
          <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d] border-b-2 border-[#7a1612] pb-2">
            Opposition Posts
          </h2>
          <div className="space-y-3">
            {bio.opposition_posts.map((post: any, idx: number) => {
              const startDate = post?.startDate ?? post?.start_date
              return (
                <div key={post?.id ?? idx} className="border-l-4 border-[#7a1612] pl-4">
                  <div className="font-bold">{post?.name ?? String(post)}</div>
                  {startDate && (
                    <div className="text-sm text-[#4a3d2f]">
                      Since {new Date(startDate).toLocaleDateString('en-GB', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Outside Earnings */}
      {earnings && Number(earnings.outside) > 0 && (
        <section className="mb-12">
          <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d] border-b-2 border-[#7a1612] pb-2">
            Outside Earnings
          </h2>
          <div className="border-2 border-[#14100d]/30 p-4 mb-4">
            <div className="text-3xl font-bold text-[#14100d]">
              £{Number(earnings.outside).toLocaleString('en-GB')}
            </div>
            <div className="text-sm text-[#4a3d2f] uppercase tracking-wider">
              Total declared outside earnings
            </div>
          </div>
          {(earnings.outside_claim_count > 0 || earnings.outside_source_count > 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-[#14100d]/30 p-4">
                <div className="text-2xl font-bold text-[#14100d]">
                  {earnings.outside_claim_count}
                </div>
                <div className="text-sm text-[#4a3d2f] uppercase tracking-wider">Claims</div>
              </div>
              <div className="border-2 border-[#14100d]/30 p-4">
                <div className="text-2xl font-bold text-[#14100d]">
                  {earnings.outside_source_count}
                </div>
                <div className="text-sm text-[#4a3d2f] uppercase tracking-wider">Sources</div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Largest Expense Claims */}
      {expensesDetail && expensesDetail.length > 0 && (
        <section className="mb-12">
          <h2 className="font-['Libre_Bodoni'] text-3xl font-bold mb-6 text-[#14100d] border-b-2 border-[#7a1612] pb-2">
            Largest Expense Claims
          </h2>
          <div className="space-y-3">
            {[...expensesDetail]
              .filter((c: any) => c?.amount_paid != null)
              .sort((a: any, b: any) => Number(b.amount_paid) - Number(a.amount_paid))
              .slice(0, 10)
              .map((claim: any, idx: number) => {
                const label = claim?.short_description || claim?.details || claim?.cost_type
                return (
                  <div
                    key={claim?.claim_number ?? idx}
                    className="border-2 border-[#14100d]/30 p-4"
                  >
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <div className="font-bold">{claim?.category ?? 'Expense'}</div>
                      <div className="text-lg font-bold whitespace-nowrap">
                        £{Number(claim.amount_paid).toLocaleString('en-GB', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    {label && <div className="text-sm text-[#4a3d2f]">{label}</div>}
                    {claim?.claim_date && (
                      <div className="text-sm text-[#4a3d2f] mt-1">
                        {new Date(claim.claim_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </section>
      )}
    </div>
  );
}
