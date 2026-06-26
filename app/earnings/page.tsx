import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../components/OpenGovShell'
import EarningsTable from './EarningsTable'
import BackLink from '../components/BackLink';
import {
  MP_BASE_SALARY_2026,
  MINISTERIAL_SUPPLEMENT,
  type SalaryBand,
} from '@/lib/ministerial-salaries'

export const metadata: Metadata = {
  title: "UK MP Earnings vs Public Spend, Salary, Outside Earnings & IPSA Costs",
  description:
    "Side-by-side comparison: every UK MP's personal earnings (base salary, ministerial supplement, outside earnings from the Register of Financial Interests) and their public spend.",
  alternates: { canonical: '/earnings' },
}

// Render on demand. See app/departments/page.tsx for rationale —
// Vercel's 3-worker build saturates Supabase when this, /departments,
// and /expenses all prerender concurrently.
export const dynamic = 'force-dynamic'
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
    <OpenGovShell>
      <BackLink
        fallbackHref="/mps"
        label="← Back to MPs"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          MP earnings vs public spend
        </h1>
        <p style={{ fontSize: '17px', lineHeight: 1.7, maxWidth: '720px' }}>
          The 50 highest-paid current MPs ranked by personal earnings. <strong>Personal earnings</strong> are
          money the MP actually receives: base salary, ministerial supplement, and declared outside earnings.
          <strong> Public spend</strong> is a separate column showing what IPSA reimburses for staff, office,
          travel and accommodation; it does <em>not</em> go into the MP&apos;s pocket.
        </p>
        <p style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '16px', opacity: 0.7 }}>
          The People&apos;s Chamber · MP Earnings
        </p>
      </header>

      <EarningsTable rows={top} year={YEAR_LABEL} />

      <section className="mt-10 text-[15px] text-[#14100d]/80 leading-[1.75] space-y-3 max-w-3xl">
        <h2 className="text-[14px] uppercase tracking-[0.22em] font-semibold text-[#14100d]">Methodology</h2>
        <p>
          <strong className="text-[#14100d]">Base salary</strong>: £{MP_BASE_SALARY_2026.toLocaleString()} from
          1 April 2026, applied to every sitting MP regardless of attendance.
        </p>
        <p>
          <strong className="text-[#14100d]">Ministerial supplement</strong>: paid on top of the base salary at
          2010-frozen levels (PM £{MINISTERIAL_SUPPLEMENT.pm.toLocaleString()} claimed of £80,807 entitlement,
          Cabinet Minister £{MINISTERIAL_SUPPLEMENT.sos.toLocaleString()},
          Minister of State £{MINISTERIAL_SUPPLEMENT.minister_of_state.toLocaleString()},
          Parliamentary Under-Secretary £{MINISTERIAL_SUPPLEMENT.puss.toLocaleString()}). An MP holding two
          ministerial posts is only paid the highest single band.
        </p>
        <p>
          <strong className="text-[#14100d]">Outside earnings</strong>: extracted by regex from the
          &ldquo;Employment and earnings&rdquo; category of the Register of Members&apos; Financial Interests.
          Only entries with an explicit &ldquo;Payment: £X&rdquo; pattern are summed; ranges (&ldquo;£200 to £500&rdquo;)
          and unbanded entries are <em>excluded</em>, so the figure is a conservative lower bound. Corrections
          and amendments are skipped to avoid double-counting. Many MPs declare interests without payment
          amounts (ongoing salaried roles, share interests, family employment) and these will not appear here.
        </p>
        <p>
          <strong className="text-[#14100d]">Public spend</strong>: total of all IPSA-reimbursed business costs
          for {YEAR_LABEL} (staff, office, accommodation, travel, other). This is <em>not</em> personal income.
          Drill into any MP&apos;s profile for the line-item breakdown.
        </p>
      </section>
    </OpenGovShell>
  )
}
