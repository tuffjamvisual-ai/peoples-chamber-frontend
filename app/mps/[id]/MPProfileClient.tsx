'use client'

import { useState } from 'react'
import Link from 'next/link'

type EarningsSummary = {
  base: number
  band: 'pm' | 'sos' | 'minister_of_state' | 'puss' | null
  band_label: string | null
  ministerial: number
  outside: number
  outside_claim_count: number
  outside_source_count: number
  personal_total: number
  public_spend: number
  public_spend_year: string | null
}

interface MPProfileClientProps {
  mp: any
  contact: any
  bio: any
  sponsoredBills: any[]
  votes: any[]
  interests: any[]
  expenses: any[]
  expensesDetail?: any[]
  earnings?: EarningsSummary
  partyColour: string
}

const ACCENT = '#ffffff'
const SUCCESS = '#4a8a3a'
const DANGER = '#8a3a3a'
const WARN = '#c9c9c9'

export default function MPProfileClient({
  mp,
  contact,
  bio,
  sponsoredBills,
  votes,
  interests,
  expenses,
  expensesDetail,
  earnings,
  partyColour,
}: MPProfileClientProps) {
  const [activeSection, setActiveSection] = useState(bio?.political_bio ? 'bio' : 'contact')

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

  const politicalBio: string = bio?.political_bio || ''

  const hasExpenses = (expenses || []).length > 0
  const hasEarnings = Boolean(earnings)

  const menuItems = [
    ...(politicalBio ? [{ id: 'bio', label: 'Political Bio' }] : []),
    { id: 'contact', label: 'Contact' },
    { id: 'parliamentary', label: 'Career' },
    { id: 'voting', label: 'Voting record' },
    { id: 'bills', label: 'Bills sponsored' },
    { id: 'interests', label: 'Interests' },
    { id: 'roles', label: 'Roles' },
    ...(hasEarnings ? [{ id: 'earnings', label: 'Earnings' }] : []),
    ...(hasExpenses ? [{ id: 'expenses', label: 'Expenses' }] : []),
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-px border border-[#5a5a5a]">
      {/* Sidebar */}
      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-16">
          <p className="text-[13px] uppercase tracking-[0.25em] text-white font-medium px-4 pt-5 pb-3">
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
                    'w-full text-left px-4 py-3 text-[15px] uppercase tracking-[0.15em] transition-colors border-l-2 ' +
                    (active
                      ? 'text-white bg-[#505050] border-l-[#ffffff] font-semibold'
                      : 'text-white border-l-transparent hover:text-white hover:bg-[#505050]')
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
      <div className="lg:col-span-3 p-6 sm:p-8">
        {activeSection === 'bio' && politicalBio && (
          <Section title="Political Bio">
            <PoliticalBio text={politicalBio} partyColour={partyColour} />
          </Section>
        )}

        {activeSection === 'contact' && (
          <Section title={`Contact ${mp.display_name || mp.name}`}>
            {contact ? (
              <div className="space-y-px border border-[#5a5a5a]">
                <Card title="Parliamentary office" partyColour={partyColour}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] leading-[1.7]">
                    <div className="text-white space-y-0.5">
                      <p>House of Commons</p>
                      <p>London</p>
                      <p className="font-mono">SW1A 0AA</p>
                    </div>
                    <div className="space-y-1">
                      {contact.phone && (
                        <p className="text-white">
                          <span className="text-[13px] uppercase tracking-[0.25em] text-white mr-2">Phone</span>
                          <span className="text-white font-mono text-[13px]">{contact.phone}</span>
                        </p>
                      )}
                      {contact.email && (
                        <p className="text-white">
                          <span className="text-[13px] uppercase tracking-[0.25em] text-white mr-2 block sm:inline">Email</span>
                          <a href={'mailto:' + contact.email} className="text-[#ffffff] hover:underline break-all">
                            {contact.email}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
                {contact.website && (
                  <Card title="Website" partyColour={partyColour}>
                    <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-[#ffffff] hover:underline text-[13px] break-all">
                      {contact.website}
                    </a>
                  </Card>
                )}
                {contact.twitter && (
                  <Card title="X (formerly Twitter)" partyColour={partyColour}>
                    <a href={contact.twitter} target="_blank" rel="noopener noreferrer" className="text-[#ffffff] hover:underline text-[13px] break-all">
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
              <div className="space-y-px border border-[#5a5a5a]">
                {representations.map((rep: any, idx: number) => (
                  <Card key={idx} title={rep.name} partyColour={partyColour}>
                    <p className="text-[15px] text-white font-mono leading-[1.7]">
                      {new Date(rep.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} —{' '}
                      {rep.endDate ? new Date(rep.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'present'}
                    </p>
                    {rep.additionalInfo && <p className="text-[13px] text-white mt-2 leading-[1.7]">{rep.additionalInfo}</p>}
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border border-[#5a5a5a] mb-8">
              <Stat label="Votes Cast" value={totalVotes} />
              <Stat label="Ayes" value={ayeVotes} colour={SUCCESS} />
              <Stat label="Noes" value={noVotes} colour={DANGER} />
              {mp.party !== 'Independent' && <Stat label="Party Loyalty" value={`${partyLoyalty}%`} colour={ACCENT} />}
            </div>

            {mp.party !== 'Independent' && rebellions > 0 && (
              <div className="border-l-2 px-4 py-3 mb-8 bg-[#505050]" style={{ borderLeftColor: WARN }}>
                <p className="text-[13px] uppercase tracking-[0.25em] mb-1 font-semibold" style={{ color: WARN }}>Rebellion Notice</p>
                <p className="text-[13px] text-white leading-[1.7]">
                  <span className="font-semibold">{rebellions} rebellion{rebellions !== 1 ? 's' : ''}</span> against the {mp.party} party line.
                </p>
              </div>
            )}

            {votes && votes.length > 0 ? (
              <ul className="space-y-px border border-[#5a5a5a]">
                {votes.slice(0, 20).map((vote: any) => (
                  <li
                    key={vote.id}
                    className="flex items-start justify-between gap-4 p-4 border-l-2"
                    style={{ borderLeftColor: vote.vote_type === 'aye' ? SUCCESS : DANGER }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white font-semibold leading-snug mb-1">{vote.division_title}</p>
                      <p className="text-[14px] text-white font-mono">
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
              <ul className="space-y-px border border-[#5a5a5a]">
                {sponsoredBills.map((bill) => (
                  <li key={bill.id} className="">
                    <Link
                      href={'/bills/' + bill.id}
                      className="block p-4 border-l-2 hover:bg-[#505050] transition-colors"
                      style={{ borderLeftColor: partyColour }}
                    >
                      <h3 className="text-[13px] font-semibold text-white mb-1 leading-snug">{bill.title}</h3>
                      <div className="flex items-center gap-3 text-[14px]">
                        <span className="text-white font-mono uppercase tracking-[0.15em]">{bill.current_stage || 'Unknown'}</span>
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
                    <h3 className="text-[13px] uppercase tracking-[0.25em] mb-4 pb-3 border-b border-[#5a5a5a] font-semibold" style={{ color: ACCENT }}>
                      {categoryName}
                    </h3>
                    <ul className="space-y-px border border-[#5a5a5a]">
                      {interestsByCategory[categoryName].map((interest: any) => (
                        <li key={interest.id} className="p-4 border-l-2" style={{ borderLeftColor: partyColour }}>
                          <p className="text-[13px] text-white whitespace-pre-wrap leading-[1.7] mb-2">{interest.interest_text}</p>
                          {interest.child_interests && interest.child_interests.length > 0 && (
                            <ul className="mt-2 ml-3 space-y-1">
                              {interest.child_interests.map((child: any, idx: number) => (
                                <li
                                  key={idx}
                                  className="text-[15px] text-white bg-[#505050] p-2 border-l-2 leading-[1.7]"
                                  style={{ borderLeftColor: partyColour + '60' }}
                                >
                                  {child.interest}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="text-[14px] text-white mt-2 font-mono">
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
                  <h3 className="text-[13px] uppercase tracking-[0.25em] mb-4 pb-3 border-b border-[#5a5a5a] font-semibold" style={{ color: ACCENT }}>
                    Government Posts
                  </h3>
                  <ul className="space-y-px border border-[#5a5a5a]">
                    {governmentPosts.map((post: any, idx: number) => (
                      <RolesRow key={idx} post={post} partyColour={partyColour} />
                    ))}
                  </ul>
                </div>
              )}
              {oppositionPosts.length > 0 && (
                <div>
                  <h3 className="text-[13px] uppercase tracking-[0.25em] mb-4 pb-3 border-b border-[#5a5a5a] font-semibold" style={{ color: ACCENT }}>
                    Opposition Posts
                  </h3>
                  <ul className="space-y-px border border-[#5a5a5a]">
                    {oppositionPosts.map((post: any, idx: number) => (
                      <RolesRow key={idx} post={post} partyColour={partyColour} />
                    ))}
                  </ul>
                </div>
              )}
              {committeeMemberships.length > 0 && (
                <div>
                  <h3 className="text-[13px] uppercase tracking-[0.25em] mb-4 pb-3 border-b border-[#5a5a5a] font-semibold" style={{ color: ACCENT }}>
                    Committee Memberships
                  </h3>
                  <ul className="space-y-px border border-[#5a5a5a]">
                    {committeeMemberships.map((committee: any, idx: number) => (
                      <li key={idx} className="p-4 border-l-2" style={{ borderLeftColor: partyColour }}>
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

        {activeSection === 'earnings' && earnings && (
          <Section title="Earnings">
            <p className="text-white text-[13px] leading-[1.7] mb-6 opacity-80 max-w-3xl">
              What this MP actually earns. Base salary plus any ministerial top-up plus declared outside earnings.
              Public spend on running their office is shown separately below — that money is paid out to
              staff, landlords and travel suppliers, not to the MP.
            </p>

            <div className="border border-[#5a5a5a]">
              <EarningsRow label="Base MP Salary"      sub="Set by IPSA · from 1 April 2026"               amount={earnings.base}        partyColour={partyColour} />
              <EarningsRow
                label="Ministerial Salary"
                sub={earnings.band_label ? `${earnings.band_label} · 2010-frozen rate, paid on top of base` : 'No current ministerial post'}
                amount={earnings.ministerial}
                muted={!earnings.ministerial}
                partyColour={partyColour}
              />
              <EarningsRow
                label="Outside Earnings"
                sub={
                  earnings.outside
                    ? `${earnings.outside_claim_count} declared payment${earnings.outside_claim_count === 1 ? '' : 's'} from ${earnings.outside_source_count} source${earnings.outside_source_count === 1 ? '' : 's'} · extracted from the Register of Members' Financial Interests`
                    : 'No payment-coded outside earnings extracted from the register'
                }
                amount={earnings.outside}
                muted={!earnings.outside}
                partyColour={partyColour}
                onJump={() => setActiveSection('interests')}
                jumpLabel="View register entries →"
              />
              <div className="bg-[#505050] p-5 border-t-2" style={{ borderTopColor: partyColour }}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[13px] uppercase tracking-[0.25em] text-white font-bold">Total Personal Earnings</p>
                  <p
                    className="text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums"
                    style={{ color: ACCENT }}
                  >
                    {fmtMoney(earnings.personal_total)}
                  </p>
                </div>
                <p className="text-[12px] text-white opacity-70 mt-1.5">
                  Money the MP receives. Excludes pensions and capital gains; outside earnings are a conservative
                  lower bound (only entries with explicit &ldquo;Payment: £X&rdquo; figures are summed).
                </p>
              </div>
            </div>

            <div className="mt-8 border border-[#5a5a5a] border-l-2" style={{ borderLeftColor: '#666' }}>
              <div className="bg-[#505050] p-5">
                <div className="flex items-baseline justify-between gap-4 mb-1.5">
                  <p className="text-[13px] uppercase tracking-[0.25em] text-white font-semibold">
                    Public Spend (IPSA expenses)
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-white tabular-nums">
                    {fmtMoney(earnings.public_spend)}
                  </p>
                </div>
                <p className="text-[12px] text-white opacity-70 leading-[1.6]">
                  <strong className="text-white">This is not personal income.</strong> It is the total reimbursed
                  by IPSA for staff salaries, office rent, accommodation, travel and other costs of running the
                  MP&apos;s parliamentary work
                  {earnings.public_spend_year ? ` in ${fmtFinancialYear(earnings.public_spend_year)}` : ''}.
                  None of it goes into the MP&apos;s pocket.
                </p>
                {earnings.public_spend > 0 && (
                  <button
                    onClick={() => setActiveSection('expenses')}
                    className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white opacity-90 hover:opacity-100 hover:underline font-semibold"
                  >
                    See full expense breakdown →
                  </button>
                )}
              </div>
            </div>
          </Section>
        )}

        {activeSection === 'expenses' && hasExpenses && (
          <Section title="Business costs and expenses">
            <p className="text-white text-[13px] leading-[1.7] mb-6 opacity-80">
              Annual claims for staffing, office, accommodation, travel and other costs.
              Source: <a href="https://www.theipsa.org.uk" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">IPSA</a> total-spend annual data.
            </p>

            <ul className="space-y-px border border-[#5a5a5a]">
              {(expenses as any[]).map((y, idx) => (
                <li
                  key={`${y.year}-${idx}`}
                  className="bg-[#505050] p-5 border-l-2"
                  style={{ borderLeftColor: partyColour }}
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-[13px] uppercase tracking-[0.25em] text-white font-semibold">
                      {fmtFinancialYear(y.year)}
                    </p>
                    <p className="text-2xl font-black tracking-tight text-white tabular-nums">
                      {fmtMoney(y.total_spend)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#404040] border border-[#5a5a5a]">
                    <ExpenseCell label="Staffing"      spend={y.staffing_spend}        budget={y.staffing_budget} />
                    <ExpenseCell label="Office"        spend={y.office_spend}          budget={y.office_budget} />
                    <ExpenseCell label="Accommodation" spend={y.accommodation_spend}    budget={y.accommodation_budget} />
                    <ExpenseCell label="Travel"        spend={y.travel_subsistence_spend} uncapped />
                    <ExpenseCell label="Other costs"   spend={y.other_costs_spend}      uncapped />
                    <ExpenseCell label="Winding-up"    spend={y.winding_up_spend}       budget={y.winding_up_budget} />
                  </div>
                  <ClaimsForYear
                    year={y.year}
                    claims={(expensesDetail || []).filter((c: any) => c.year === y.year)}
                    partyColour={partyColour}
                  />
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  )
}

function fmtFinancialYear(yy: string): string {
  // '24_25' -> '2024 / 2025'
  const m = /^(\d{2})_(\d{2})$/.exec(yy || '')
  if (!m) return yy || ''
  return `20${m[1]} / 20${m[2]}`
}

function fmtMoney(v: any): string {
  if (v === null || v === undefined || v === '') return '£0'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '£0'
  return '£' + Math.round(n).toLocaleString('en-GB')
}

function EarningsRow({
  label,
  sub,
  amount,
  muted,
  partyColour,
  onJump,
  jumpLabel,
}: {
  label: string
  sub?: string
  amount: number
  muted?: boolean
  partyColour: string
  onJump?: () => void
  jumpLabel?: string
}) {
  return (
    <div className="bg-[#505050] px-5 py-4 border-b border-[#5a5a5a] last:border-b-0 border-l-2" style={{ borderLeftColor: muted ? '#333' : partyColour }}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-[13px] uppercase tracking-[0.18em] font-semibold ${muted ? 'text-white opacity-50' : 'text-white'}`}>{label}</p>
          {sub && <p className={`text-[12px] mt-1 leading-[1.55] ${muted ? 'text-white opacity-50' : 'text-white opacity-75'}`}>{sub}</p>}
          {onJump && jumpLabel && amount > 0 && (
            <button
              onClick={onJump}
              className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white opacity-90 hover:opacity-100 hover:underline font-semibold"
            >
              {jumpLabel}
            </button>
          )}
        </div>
        <p
          className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums whitespace-nowrap ${
            muted ? 'text-white opacity-40' : 'text-white'
          }`}
        >
          {amount > 0 ? fmtMoney(amount) : '—'}
        </p>
      </div>
    </div>
  )
}

function ClaimsForYear({ year, claims, partyColour }: { year: string; claims: any[]; partyColour: string }) {
  if (!claims || claims.length === 0) return null
  // group by category
  const byCategory: Record<string, any[]> = {}
  for (const c of claims) {
    const k = c.category || 'Uncategorised'
    if (!byCategory[k]) byCategory[k] = []
    byCategory[k].push(c)
  }
  const categoryOrder = Object.keys(byCategory).sort((a, b) => {
    const ta = byCategory[a].reduce((s, c) => s + (Number(c.amount_paid) || 0), 0)
    const tb = byCategory[b].reduce((s, c) => s + (Number(c.amount_paid) || 0), 0)
    return tb - ta
  })

  return (
    <div className="mt-4 pt-4 border-t border-[#5a5a5a]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white opacity-70 mb-2">
        Itemised claims · {claims.length}
      </p>
      <div className="space-y-px border border-[#5a5a5a]">
        {categoryOrder.map((cat) => {
          const items = byCategory[cat]
          const total = items.reduce((s, c) => s + (Number(c.amount_paid) || 0), 0)
          return (
            <details key={`${year}-${cat}`} className="bg-[#505050] group">
              <summary
                className="cursor-pointer list-none flex items-center justify-between gap-3 px-3 py-2 hover:bg-[#404040] transition-colors border-l-2"
                style={{ borderLeftColor: partyColour }}
              >
                <span className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-white opacity-60 text-[11px] group-open:rotate-90 inline-block transition-transform">▶</span>
                  <span className="text-[13px] font-semibold text-white truncate">{cat}</span>
                  <span className="text-[11px] text-white opacity-60 whitespace-nowrap">
                    {items.length} claim{items.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="text-[14px] font-semibold text-white tabular-nums whitespace-nowrap">
                  {fmtMoney(total)}
                </span>
              </summary>
              <ul className="bg-[#353535] border-t border-[#404040]">
                {items.map((c) => (
                  <li
                    key={c.claim_number || `${c.claim_date}-${c.cost_type}-${c.amount_paid}`}
                    className="grid grid-cols-[90px_1fr_auto] gap-3 px-3 py-2 border-t border-[#505050] first:border-t-0 text-[12px]"
                  >
                    <span className="text-white opacity-60 tabular-nums">
                      {fmtClaimDate(c.claim_date)}
                    </span>
                    <span className="text-white truncate" title={c.short_description || c.details || c.cost_type || ''}>
                      <span className="opacity-90">{c.cost_type || c.short_description || '—'}</span>
                      {c.short_description && c.cost_type && c.short_description !== c.cost_type ? (
                        <span className="opacity-60"> · {c.short_description}</span>
                      ) : null}
                    </span>
                    <span className="text-white tabular-nums whitespace-nowrap">
                      {fmtMoney(c.amount_paid)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )
        })}
      </div>
    </div>
  )
}

function fmtClaimDate(d: any): string {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

function ExpenseCell({ label, spend, budget, uncapped }: { label: string; spend: any; budget?: any; uncapped?: boolean }) {
  const s = spend == null ? 0 : Number(spend)
  const b = budget == null ? null : Number(budget)
  const pct = b && b > 0 ? Math.min(100, Math.round((s / b) * 100)) : null
  return (
    <div className="bg-[#505050] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white opacity-80 mb-1.5">{label}</p>
      <p className="text-[15px] font-semibold text-white tabular-nums">{fmtMoney(s)}</p>
      {uncapped ? (
        <p className="text-[10px] uppercase tracking-[0.18em] text-white opacity-50 mt-1">Uncapped</p>
      ) : b != null ? (
        <p className="text-[10px] uppercase tracking-[0.18em] text-white opacity-50 mt-1 tabular-nums">
          of {fmtMoney(b)}{pct != null ? ` · ${pct}%` : ''}
        </p>
      ) : null}
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
    <div className="p-5 border-l-2" style={{ borderLeftColor: partyColour }}>
      <p className="text-[13px] uppercase tracking-[0.25em] mb-3 font-semibold text-white">{title}</p>
      {children}
    </div>
  )
}

function Stat({ label, value, colour }: { label: string; value: string | number; colour?: string }) {
  return (
    <div className="px-4 py-5">
      <p className="text-[13px] uppercase tracking-[0.25em] text-white font-medium mb-2">{label}</p>
      <p className="text-2xl sm:text-3xl font-black leading-none tracking-tight" style={{ color: colour || '#ffffff' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}

function Tag({ colour, children }: { colour: string; children: React.ReactNode }) {
  return (
    <span
      className="px-2 py-0.5 text-[13px] uppercase tracking-[0.15em] font-semibold rounded-sm"
      style={{ color: colour, backgroundColor: colour + '22', border: `1px solid ${colour}55` }}
    >
      {children}
    </span>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-white text-[13px] leading-[1.7]">{children}</p>
}

function PoliticalBio({ text, partyColour }: { text: string; partyColour: string }) {
  const escape = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  const inline = (s: string) => escape(s).replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
  const blocks = text.trim().split(/\n\s*\n/)
  const headingOnly = (line: string) => /^\*\*(.+?)\*\*\s*:?\s*$/.exec(line.trim())

  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
        if (lines.length === 0) return null
        const headingMatch = headingOnly(lines[0])
        const heading = headingMatch ? headingMatch[1].replace(/:$/, '') : null
        const bodyLines = headingMatch ? lines.slice(1) : lines
        const isBulletBody = bodyLines.length > 0 && bodyLines.every((l) => l.startsWith('- '))

        return (
          <div key={i} className="border-l-2 pl-4" style={{ borderLeftColor: partyColour }}>
            {heading && (
              <h3 className="text-[13px] uppercase tracking-[0.25em] font-semibold mb-2" style={{ color: '#ffffff' }}>
                {heading}
              </h3>
            )}
            {bodyLines.length > 0 && (
              isBulletBody ? (
                <ul className="space-y-1.5 text-[14px] text-white leading-[1.7] list-disc pl-5">
                  {bodyLines.map((l, j) => (
                    <li key={j} dangerouslySetInnerHTML={{ __html: inline(l.slice(2)) }} />
                  ))}
                </ul>
              ) : (
                <p
                  className="text-[14px] text-white leading-[1.7]"
                  dangerouslySetInnerHTML={{ __html: inline(bodyLines.join(' ')) }}
                />
              )
            )}
          </div>
        )
      })}
    </div>
  )
}

function RolesRow({ post, partyColour }: { post: any; partyColour: string }) {
  return (
    <li className="p-4 border-l-2" style={{ borderLeftColor: partyColour }}>
      <p className="text-[13px] text-white font-semibold leading-snug">{post.name}</p>
      <p className="text-[14px] text-white font-mono mt-1">
        {new Date(post.startDate).getFullYear()} — {post.endDate ? new Date(post.endDate).getFullYear() : 'present'}
      </p>
    </li>
  )
}
