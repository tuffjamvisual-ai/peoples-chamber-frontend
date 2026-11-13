import { SubFold } from '../components/PhoneFolds'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../components/OpenGovShell'
import EarningsTable from './EarningsTable'
import BackLink from '../components/BackLink';
import {
  CATEGORY_LABEL, ministerialRatesByMember, mpSalaryRate, mpSalarySource, ministerialSalaryText, salaryRates,
} from '@/lib/ministerial-salaries'
import { displayMpName } from '@/lib/mp-name';

export const metadata: Metadata = {
  // A plain title naming the data and its source (owner's brief, 3 Nov 2026).
  title: "MPs' earnings: salary, outside pay and costs",
  description:
    "Every MP's pay set beside their public costs: the MP salary and any ministerial pay, outside earnings from the Register of Members' Financial Interests, and business costs from IPSA.",
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
  minister_label: string | null      // GOV.UK's category for the post (lib/ministerial-salaries.ts)
  ministerial_pending: boolean       // holds a post not yet filed: no figure and no total
  base: number
  ministerial: number
  outside: number
  personal_total: number
  public_spend: number
}


export default async function EarningsPage() {
  const [
    { data: mps },
    ministerRates,
    { data: outsideRows },
    { data: expenseRows },
  ] = await Promise.all([
    supabase
      .from('mps')
      .select('member_id, name, display_name, constituency, party, party_colour, photo_url, current_member')
      .eq('current_member', true),
    // Each MP minister's rate from ministerial_salary_rates (highest claimed among their posts; N1).
    ministerialRatesByMember(),
    supabase
      .from('mp_outside_earnings_summary')
      .select('member_id, total_extracted'),
    supabase
      .from('mp_expenses_summary')
      .select('member_id, total_spend')
      .eq('year', YEAR),
  ])

  const [mpRate, rates] = await Promise.all([mpSalaryRate(), salaryRates()])
  const base = mpRate?.claimed ?? 0

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
    const rate = ministerRates.get(m.member_id)
    const filed = rate && rate !== 'unfiled' ? rate : null
    const ministerial = filed?.claimed ?? 0
    const outside = outsideByMember.get(m.member_id) || 0
    return {
      member_id: m.member_id,
      name: displayMpName(m.display_name || m.name || ''),
      constituency: m.constituency,
      party: m.party,
      party_colour: m.party_colour,
      photo_url: m.photo_url,
      minister_label: filed ? CATEGORY_LABEL[filed.category] ?? null : null,
      ministerial_pending: rate === 'unfiled',
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
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          MP earnings vs public spend
        </h1>
        <p style={{ fontSize: '17px', lineHeight: 1.7, maxWidth: '720px' }}>
          The 50 highest paid current MPs ranked by personal earnings. <strong>Personal earnings</strong> are
          money the MP actually receives: base salary, any ministerial salary (the amount claimed) and declared outside earnings.
          <strong> Public spend</strong> is a separate column showing what IPSA reimburses for staff, office,
          travel and accommodation; it does <em>not</em> go into the MP&apos;s pocket.
        </p>
        {/* T1-DECLUT item 2 (owner, 12 Nov 2026): no eyebrow line repeating the section under the folder stamp. */}
      </header>

      <EarningsTable rows={top} year={YEAR_LABEL} />

      <section className="mt-10 text-[15px] text-[#14100d]/80 leading-[1.75] space-y-3 max-w-3xl">
        <h2 className="text-[15px] uppercase tracking-[0.22em] font-semibold text-[#14100d]">Methodology</h2>
        {/* T1-MOB batch 1 (Cowork 13 Nov 2026): on phones the method folds under the heading; from 768px as before. */}
        <SubFold label="How these figures are made">
        {/* The section spaces its children (space-y-3); inside the fold they are not its children, so the same spacing here. */}
        <div className="space-y-3">
        <p>
          <strong className="text-[#14100d]">Base salary</strong>: £{base.toLocaleString('en-GB')}
          {mpRate ? ` (${mpSalarySource(mpRate)})` : ''}, applied to every sitting MP regardless of attendance.
        </p>
        <p>
          <strong className="text-[#14100d]">Ministerial salary</strong>: the amount a minister claims, paid on top of
          the base salary; ministers have chosen to claim less than they are entitled to by law. An MP holding two posts
          is paid once, for the higher one.
        </p>
        <ul className="list-none p-0">
          {rates.filter((r) => r.house === 'Commons' && CATEGORY_LABEL[r.category]).sort((a, b) => b.claimed - a.claimed).map((r) => (
            <li key={r.category}>{CATEGORY_LABEL[r.category]}: {ministerialSalaryText(r)}</li>
          ))}
        </ul>
        <p>
          <strong className="text-[#14100d]">Outside earnings</strong>: extracted by regex from the
          &ldquo;Employment and earnings&rdquo; category of the Register of Members&apos; Financial Interests.
          Only single payment entries with an explicit &ldquo;Payment: £X&rdquo; pattern are summed. Regular pay (an
          amount a month, a quarter or a year) is listed separately on each MP&apos;s second jobs page and is not
          added to this figure; ranges (&ldquo;£200 to £500&rdquo;) and unbanded entries are <em>excluded</em>, so the
          figure is a conservative lower bound. Corrections
          and amendments are skipped to avoid counting anything twice. Many MPs declare interests without payment
          amounts (ongoing salaried roles, share interests, family employment) and these will not appear here.
        </p>
        <p>
          <strong className="text-[#14100d]">Public spend</strong>: total of all business costs reimbursed by IPSA
          for {YEAR_LABEL} (staff, office, accommodation, travel, other). This is <em>not</em> personal income.
          Drill into any MP&apos;s profile for the item by item breakdown.
        </p>
        </div>
        </SubFold>
      </section>
    </OpenGovShell>
  )
}
