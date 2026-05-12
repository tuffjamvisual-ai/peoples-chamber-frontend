import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Navigation from '../../components/Navigation'
import { notFound } from 'next/navigation'
import MPProfileClient from './MPProfileClient'
import {
  MP_BASE_SALARY_2026,
  MINISTERIAL_SUPPLEMENT,
  SALARY_BAND_LABEL,
  type SalaryBand,
} from '@/lib/ministerial-salaries'

const BAND_RANK: Record<SalaryBand, number> = { pm: 4, sos: 3, minister_of_state: 2, puss: 1 }

export const revalidate = 60

export async function generateStaticParams() {
  const { data: mps } = await supabase
    .from('mps')
    .select('member_id')
    .eq('current_member', true)

  return (mps || []).map((mp) => ({
    id: mp.member_id.toString()
  }))
}

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const memberId = parseInt(id)
  const { data: mp } = await supabase
    .from('mps')
    .select('name, display_name, constituency, party')
    .eq('member_id', memberId)
    .single()
  if (!mp) return { title: 'MP profile' }
  const name = mp.display_name || mp.name
  const subtitle = [mp.party, mp.constituency].filter(Boolean).join(' · ')
  return {
    title: name,
    description: `${name}${subtitle ? ` — ${subtitle}.` : '.'} Voting record, registered interests, sponsored bills and contact details.`,
    alternates: { canonical: `/mps/${memberId}` },
  }
}

export default async function MPProfilePage({ params }: PageProps) {
  const resolvedParams = await params
  const memberId = parseInt(resolvedParams.id)
  
  const { data: mp } = await supabase
    .from('mps')
    .select('*')
    .eq('member_id', memberId)
    .single()
  
  if (!mp) notFound()

  const { data: contact } = await supabase
    .from('mp_contact')
    .select('*')
    .eq('member_id', memberId)
    .single()

  const { data: bio } = await supabase
    .from('mp_biography')
    .select('*')
    .eq('member_id', memberId)
    .single()

  const { data: sponsoredBills } = await supabase
    .from('bill')
    .select('*')
    .eq('sponsor_member_id', memberId)
    .order('created_at', { ascending: false })

  const { data: votes } = await supabase
    .from('mp_division_votes')
    .select('*')
    .eq('member_id', memberId)
    .order('division_date', { ascending: false })

  const { data: interests } = await supabase
    .from('mp_registered_interests')
    .select('*')
    .eq('member_id', memberId)
    .order('category_sort_order', { ascending: true })

  const { data: expenses } = await supabase
    .from('mp_expenses_summary')
    .select('*')
    .eq('member_id', memberId)
    .order('year', { ascending: false })

  const { data: expensesDetail } = await supabase
    .from('mp_expenses_detail')
    .select('claim_number, year, claim_date, category, cost_type, short_description, details, amount_paid, status')
    .eq('member_id', memberId)
    .order('claim_date', { ascending: false })
    .range(0, 4999)

  const { data: ministerialRows } = await supabase
    .from('dept_ministers')
    .select('salary_band')
    .eq('member_id', memberId)
    .not('salary_band', 'is', null)

  const { data: outsideRow } = await supabase
    .from('mp_outside_earnings_summary')
    .select('total_extracted, claim_count, source_count')
    .eq('member_id', memberId)
    .maybeSingle()

  // Highest band (an MP holding multiple roles is paid only the top single salary)
  let highestBand: SalaryBand | null = null
  for (const r of ministerialRows || []) {
    const b = r.salary_band as SalaryBand | null
    if (!b) continue
    if (!highestBand || BAND_RANK[b] > BAND_RANK[highestBand]) highestBand = b
  }

  const ministerialAmount = highestBand ? MINISTERIAL_SUPPLEMENT[highestBand] : 0
  const outsideAmount = outsideRow?.total_extracted ? Number(outsideRow.total_extracted) : 0
  const latestExpense = (expenses && expenses[0]) || null
  const earnings = {
    base: MP_BASE_SALARY_2026,
    band: highestBand,
    band_label: highestBand ? SALARY_BAND_LABEL[highestBand] : null,
    ministerial: ministerialAmount,
    outside: outsideAmount,
    outside_claim_count: outsideRow?.claim_count || 0,
    outside_source_count: outsideRow?.source_count || 0,
    personal_total: MP_BASE_SALARY_2026 + ministerialAmount + outsideAmount,
    public_spend: latestExpense?.total_spend ? Number(latestExpense.total_spend) : 0,
    public_spend_year: latestExpense?.year || null,
  }

  const partyColour = mp.party_colour ? '#' + mp.party_colour.replace('#', '') : '#7697a2'

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />
      
      <main className="max-w-[1200px] mx-auto px-6 py-6">
        <Link 
          href="/mps"
          className="inline-flex items-center gap-2 text-white hover:text-white mb-6 transition"
        >
          <span>←</span>
          <span>Back to all MPs</span>
        </Link>

        {/* Header with party colour gradient */}
        <div className="rounded-xl overflow-hidden mb-6 relative" style={{ background: `linear-gradient(135deg, ${partyColour}33 0%, #1a1a1a 60%)`, border: `1px solid ${partyColour}40` }}>
          <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top left, ${partyColour}, transparent 60%)` }} />
          <div className="relative p-6 flex items-center gap-6">
            <div className="relative flex-shrink-0">
              {mp.photo_url ? (
                <Image
                  src={mp.photo_url}
                  alt={mp.name}
                  width={176}
                  height={176}
                  priority
                  className="w-44 h-44 rounded-full object-cover"
                  style={{ border: `3px solid ${partyColour}` }}
                />
              ) : (
                <div className="w-44 h-44 rounded-full flex items-center justify-center text-4xl font-bold text-white" style={{ border: `3px solid ${partyColour}`, background: partyColour + '33' }}>
                  {mp.name?.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
                {mp.display_name || mp.name}
              </h1>
              {mp.constituency && (
                <p className="text-lg text-[#c9c9c9] mb-3">MP for {mp.constituency}</p>
              )}
              {mp.party && (
                <span className="inline-block px-4 py-1.5 text-sm font-semibold rounded-full text-white" style={{ backgroundColor: partyColour }}>
                  {mp.party}
                </span>
              )}
            </div>
          </div>
        </div>

        <MPProfileClient
          mp={mp}
          contact={contact}
          bio={bio}
          sponsoredBills={sponsoredBills || []}
          votes={votes || []}
          interests={interests || []}
          expenses={expenses || []}
          expensesDetail={expensesDetail || []}
          earnings={earnings}
          partyColour={partyColour}
        />
      </main>
    </div>
  )
}
