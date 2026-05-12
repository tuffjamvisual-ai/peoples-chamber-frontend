import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import Navigation from '../components/Navigation'
import EarningsTable from './EarningsTable'
import {
  MP_BASE_SALARY_2026,
  MINISTERIAL_SUPPLEMENT,
  type SalaryBand,
} from '@/lib/ministerial-salaries'

export const metadata: Metadata = {
  title: 'MP Earnings & Public Spend',
  description:
    'Personal earnings (base salary + ministerial supplement + outside earnings from the Register of Members’ Financial Interests) shown side-by-side with public spend (IPSA business costs).',
  alternates: { canonical: '/earnings' },
}

export const revalidate = 3600

const YEAR = '24_25'
const YEAR_LABEL = '2024 / 2025'

export type EarningsRow = {
  member_id: number
  name: string
  constituency: string | null
  party: string | null
  party_colour: string | null
  photo_url: string | null
  salary_band: SalaryBand | null
  base: number
  ministerial: number
  outside: number
  personal_total: number
  public_spend: number
}

const BAND_RANK: Record<SalaryBand, number> = { pm: 4, sos: 3, minister_of_state: 2, puss: 1 }

export default async function EarningsPage() {
  const [
    { data: mps },
    { data: ministerRows },
    { data: outsideRows },
    { data: expenseRows },
  ] = await Promise.all([
    supabase
      .from('mps')
      .select('member_id, name, display_name, constituency, party, party_colour, photo_url, current_member')
      .eq('current_member', true),
    supabase
      .from('dept_ministers')
      .select('member_id, salary_band')
      .not('salary_band', 'is', null)
      .not('member_id', 'is', null),
    supabase
      .from('mp_outside_earnings_summary')
      .select('member_id, total_extracted'),
    supabase
      .from('mp_expenses_summary')
      .select('member_id, total_spend')
      .eq('year', YEAR),
  ])

  // Highest band per member_id (so an MP holding two ministerial roles
  // doesn't get paid twice — the ministerial salary is per-person, not per-role)
  const bandByMember = new Map<number, SalaryBand>()
  for (const r of ministerRows || []) {
    if (!r.member_id || !r.salary_band) continue
    const band = r.salary_band as SalaryBand
    const cur = bandByMember.get(r.member_id)
    if (!cur || BAND_RANK[band] > BAND_RANK[cur]) bandByMember.set(r.member_id, band)
  }

  const outsideByMember = new Map<number, number>(
    (outsideRows || []).map((r: { member_id: number; total_extracted: number | string | null }) => [
      r.member_id,
      Number(r.total_extracted) || 0,
    ]),
  )
  const spendByMember = new Map<number, number>(
    (expenseRows || []).map((r: { member_id: number; total_spend: number | string | null }) => [
      r.member_id,
      Number(r.total_spend) || 0,
    ]),
  )

  const rows: EarningsRow[] = (mps || []).map((m: { member_id: number; name: string | null; display_name: string | null; constituency: string | null; party: string | null; party_colour: string | null; photo_url: string | null }) => {
    const band = bandByMember.get(m.member_id) || null
    const ministerial = band ? MINISTERIAL_SUPPLEMENT[band] : 0
    const outside = outsideByMember.get(m.member_id) || 0
    const base = MP_BASE_SALARY_2026
    return {
      member_id: m.member_id,
      name: m.display_name || m.name || '',
      constituency: m.constituency,
      party: m.party,
      party_colour: m.party_colour,
      photo_url: m.photo_url,
      salary_band: band,
      base,
      ministerial,
      outside,
      personal_total: base + ministerial + outside,
      public_spend: spendByMember.get(m.member_id) || 0,
    }
  })

  // Top 50 by personal_total — table is sortable client-side within that subset
  rows.sort((a, b) => b.personal_total - a.personal_total)
  const top = rows.slice(0, 50)

  return (
    <div className="min-h-screen bg-[#606060] text-white">
      <Navigation />

      <main className="bg-[#505050] shadow-[0_0_40px_rgba(0,0,0,0.4)] max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <header className="border-b border-[#5a5a5a] pb-6 mb-6">
          <p className="text-[11px] uppercase tracking-[0.3em] font-semibold mb-3 text-white">
            The People&apos;s Chamber · MP Earnings
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3 leading-[1.1]"
            style={{ fontFamily: '"Georgia", "Charter", "Times New Roman", serif' }}
          >
            MP earnings vs public spend
          </h1>
          <p className="text-white text-[14px] leading-[1.7] max-w-3xl">
            The 50 highest-paid current MPs ranked by personal earnings. <strong>Personal earnings</strong> are
            money the MP actually receives — base salary, ministerial supplement, and declared outside earnings.
            <strong> Public spend</strong> is a separate column showing what IPSA reimburses for staff, office,
            travel and accommodation; it does <em>not</em> go into the MP&apos;s pocket.
          </p>
        </header>

        <EarningsTable rows={top} year={YEAR_LABEL} />

        <section className="mt-10 text-[12px] text-white opacity-80 leading-[1.7] space-y-3 max-w-3xl">
          <h2 className="text-[12px] uppercase tracking-[0.25em] font-semibold text-white opacity-100">Methodology</h2>
          <p>
            <strong className="text-white">Base salary</strong>: £{MP_BASE_SALARY_2026.toLocaleString()} from
            1 April 2026, applied to every sitting MP regardless of attendance.
          </p>
          <p>
            <strong className="text-white">Ministerial supplement</strong>: paid on top of the base salary at
            2010-frozen levels (PM £{MINISTERIAL_SUPPLEMENT.pm.toLocaleString()} claimed of £80,807 entitlement,
            Cabinet Minister £{MINISTERIAL_SUPPLEMENT.sos.toLocaleString()},
            Minister of State £{MINISTERIAL_SUPPLEMENT.minister_of_state.toLocaleString()},
            Parliamentary Under-Secretary £{MINISTERIAL_SUPPLEMENT.puss.toLocaleString()}). Source: House of
            Commons Library briefing CBP-10600. An MP holding two ministerial posts is only paid the highest
            single band.
          </p>
          <p>
            <strong className="text-white">Outside earnings</strong>: extracted by regex from the
            &ldquo;Employment and earnings&rdquo; category of the Register of Members&apos; Financial Interests.
            Only entries with an explicit &ldquo;Payment: £X&rdquo; pattern are summed; ranges (&ldquo;£200–£500&rdquo;)
            and unbanded entries are <em>excluded</em>, so the figure is a conservative lower bound. Corrections
            and amendments are skipped to avoid double-counting. Many MPs declare interests without payment
            amounts (ongoing salaried roles, share interests, family employment) — these will not appear here.
          </p>
          <p>
            <strong className="text-white">Public spend</strong>: total of all IPSA-reimbursed business costs
            for {YEAR_LABEL} (staff, office, accommodation, travel, other). This is <em>not</em> personal income.
            Drill into any MP&apos;s profile for the line-item breakdown.
          </p>
        </section>
      </main>
    </div>
  )
}
