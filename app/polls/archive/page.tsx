import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink'
import ScrollToTopButton from '../../components/ScrollToTopButton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Archived Polls',
  description: 'Past OpenGovt polls that have been overtaken by events, kept here as a record with their final results.',
  alternates: { canonical: '/polls/archive' },
}

const INK = '#14100d'
const INK_SOFT = '#14100d'
const INK_HAIRLINE = 'rgba(20,16,13,0.25)'
const ACCENT = '#7a1612'
const SUCCESS = '#4e6b34'
const DANGER = '#8a2f20'
const MONO = 'Special Elite, monospace'

type Poll = {
  id: number
  question: string
  constituency: string | null
  vote_count_yes: number
  vote_count_no: number
  explainer: string | null
}

export default async function ArchivedPollsPage() {
  const { data } = await supabase
    .from('polls')
    .select('id, question, constituency, vote_count_yes, vote_count_no, explainer')
    .eq('archived', true)
    .order('id', { ascending: false })

  const polls = (data || []) as Poll[]

  return (
    <OpenGovShell pageStamp="Archive">
      <BackLink
        fallbackHref="/polls"
        label="← Back to polls"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Archived Polls
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK_SOFT }}>
          Polls that have been overtaken by events, kept here as a record with the results they reached. Voting is closed.
        </p>
      </header>

      {polls.length === 0 && (
        <p style={{ fontFamily: MONO, fontSize: '16px', opacity: 0.7 }}>No archived polls.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {polls.map((p) => {
          const total = (p.vote_count_yes || 0) + (p.vote_count_no || 0)
          const yesPct = total ? Math.round((p.vote_count_yes / total) * 100) : 0
          const noPct = total ? 100 - yesPct : 0
          return (
            <article key={p.id} style={{ borderTop: `3px solid ${ACCENT}`, paddingTop: '16px', opacity: 0.92 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                {p.constituency && (
                  <span style={{ fontFamily: MONO, fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_SOFT }}>
                    {p.constituency}
                  </span>
                )}
                <span style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: '2px', padding: '1px 6px' }}>
                  Archived
                </span>
              </div>

              <h2 style={{ fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 'bold', letterSpacing: '-0.01em', lineHeight: 1.25, margin: '0 0 10px 0', color: INK }}>
                {p.question}
              </h2>

              {/* Final result bar */}
              <div style={{ display: 'flex', height: '26px', borderRadius: '3px', overflow: 'hidden', border: `1px solid ${INK_HAIRLINE}`, marginBottom: '6px' }}>
                <div style={{ width: `${yesPct}%`, background: SUCCESS }} />
                <div style={{ width: `${noPct}%`, background: DANGER }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: '13px', color: INK_SOFT, marginBottom: '12px' }}>
                <span>Yes {yesPct}%</span>
                <span>{total.toLocaleString()} votes</span>
                <span>No {noPct}%</span>
              </div>

              {p.explainer && (
                <p style={{ fontSize: '15px', lineHeight: 1.7, color: INK_SOFT, maxWidth: '760px' }}>
                  {p.explainer}
                </p>
              )}
            </article>
          )
        })}
      </div>

      <ScrollToTopButton />
    </OpenGovShell>
  )
}
