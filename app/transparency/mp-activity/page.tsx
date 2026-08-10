import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink'
import ScrollToTopButton from '../../components/ScrollToTopButton'
import MpActivityClient, { type Row } from './MpActivityClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'MP Activity: Most Active and Laziest MPs',
  description: 'Every current MP ranked by how often they have spoken in Parliament this term, and how many words, taken from the official Hansard record.',
  alternates: { canonical: '/transparency/mp-activity' },
}

const INK = '#14100d'

export default async function MpActivityPage() {
  const [{ data: totals }, { data: mps }, { data: ministers }] = await Promise.all([
    supabase.from('mp_contribution_totals').select('member_id, total_contributions, word_count, written_questions, wq_top_departments'),
    supabase.from('mps').select('member_id, name, party, constituency, start_date').or('current_member.is.null,current_member.eq.true'),
    // Government ministers AND whips (Assistant Whip, Junior Lord of the Treasury,
    // etc. are all here); used to exclude the front bench from the "fewest written
    // questions" ranking, since they table few or none by role.
    supabase.from('dept_ministers').select('member_id').or('resigned.is.null,resigned.eq.false'),
  ])
  // Exclude MPs elected at a by-election within the last six months: their term
  // is too short to rank fairly against MPs who have sat the whole Parliament,
  // so they would otherwise appear bottom of the "laziest" list on a few days'
  // tenure. Same rule the Empty Benches voting piece uses.
  const cutoff = new Date(Date.now() - 183 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const frontbench = new Set((ministers || []).map((m) => m.member_id as number))
  const tmap = new Map((totals || []).map((t) => [t.member_id, t]))
  const rows: Row[] = (mps || [])
    .filter((m) => !m.start_date || (m.start_date as string) <= cutoff)
    .map((m) => {
      const t = tmap.get(m.member_id) as { total_contributions?: number; word_count?: number; written_questions?: number; wq_top_departments?: { dept: string; count: number }[] } | undefined
      return {
        member_id: m.member_id as number,
        name: String(m.name || '').replace(/\s+MP$/, ''),
        party: (m.party as string) || null,
        constituency: (m.constituency as string) || null,
        total: t?.total_contributions ?? 0,
        words: Number(t?.word_count ?? 0),
        writtenQuestions: t?.written_questions ?? 0,
        wqDepts: Array.isArray(t?.wq_top_departments) ? t!.wq_top_departments! : [],
        frontbench: frontbench.has(m.member_id as number) || (m.party as string) === 'Speaker',
      }
    })

  return (
    <OpenGovShell pageStamp="MP Activity">
      <BackLink
        fallbackHref="/transparency"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          MP Activity
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '760px', color: INK }}>
          Every current MP ranked by how much work they do in the House of Commons since the start of this Parliament on 4 July 2024: how much they have spoken, and how many written questions they have tabled to government departments. Spoken figures come from Hansard; written questions from the Questions and Statements record, with the departments each MP questions most. Written questions are a backbench scrutiny tool, so ministers, whips and the Speaker are excluded from the fewest-questions ranking, and MPs elected at a by-election within the last six months are excluded throughout, their term being too short to compare. Sort by contributions or by written questions.
        </p>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '760px', color: INK, marginTop: '12px' }}>
          Opposition MPs typically table more written questions than government MPs because questioning departments is the primary scrutiny tool available to those not in power. The rankings reflect this. A Conservative MP tabling 4,000 questions to a Labour government is doing the job opposition is supposed to do.
        </p>
      </header>

      <MpActivityClient rows={rows} />

      <ScrollToTopButton />
    </OpenGovShell>
  )
}
