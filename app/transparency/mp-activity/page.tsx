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
  const [{ data: totals }, { data: mps }] = await Promise.all([
    supabase.from('mp_contribution_totals').select('member_id, total_contributions, word_count'),
    supabase.from('mps').select('member_id, name, party, constituency').or('current_member.is.null,current_member.eq.true'),
  ])
  const tmap = new Map((totals || []).map((t) => [t.member_id, t]))
  const rows: Row[] = (mps || []).map((m) => {
    const t = tmap.get(m.member_id) as { total_contributions?: number; word_count?: number } | undefined
    return {
      member_id: m.member_id as number,
      name: String(m.name || '').replace(/\s+MP$/, ''),
      party: (m.party as string) || null,
      constituency: (m.constituency as string) || null,
      total: t?.total_contributions ?? 0,
      words: Number(t?.word_count ?? 0),
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
          Every current MP ranked by how much they have spoken in the House of Commons since the start of this Parliament on 4 July 2024. Contribution counts and word totals are taken directly from the official Hansard record. Most active first; switch to laziest to flip the order.
        </p>
      </header>

      <MpActivityClient rows={rows} />

      <ScrollToTopButton />
    </OpenGovShell>
  )
}
