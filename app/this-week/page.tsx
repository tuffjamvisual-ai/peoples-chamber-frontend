import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink'
import ScrollToTopButton from '../components/ScrollToTopButton'

// Live each request so it reflects the current week's Commons business, with
// no stale snapshot. Sources: Parliament Bills API (stages + sitting dates)
// and the Commons Votes API (recent divisions).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'This Week in Parliament',
  description: 'The bills before the House of Commons this week and the most recent votes MPs have held.',
  alternates: { canonical: '/this-week' },
}

const INK = '#14100d'
const ACCENT = '#7a1612'
const HAIRLINE = 'rgba(20,16,13,0.25)'
const MONO = 'Special Elite, monospace'

type Sitting = { date: string }
type Stage = { description?: string; house?: string; stageSittings?: Sitting[] }
type BillItem = { billId: number; shortTitle: string; currentHouse?: string; lastUpdate?: string; isAct?: boolean; billWithdrawn?: string | null; currentStage?: Stage }
type Division = { DivisionId: number; Date: string; Title: string; AyeCount?: number; NoCount?: number }

function weekRange() {
  const now = new Date()
  const day = now.getUTCDay() // 0 Sun .. 6 Sat
  const diffToMon = (day + 6) % 7
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMon))
  const end = new Date(start.getTime() + 6 * 86400000)
  return { start, end }
}

async function getCommonsBills() {
  try {
    const res = await fetch('https://bills-api.parliament.uk/api/v1/Bills?SortOrder=DateUpdatedDescending', { cache: 'no-store' })
    if (!res.ok) return [] as BillItem[]
    const j = await res.json()
    const items: BillItem[] = (j.items || []).filter((b: BillItem) => !b.isAct && !b.billWithdrawn)
    const { start, end } = weekRange()
    // Bills with a COMMONS stage sitting this week.
    const thisWeek = items.filter((b) =>
      b.currentStage?.house === 'Commons' &&
      (b.currentStage.stageSittings || []).some((s) => {
        const d = new Date(s.date)
        return d >= start && d <= new Date(end.getTime() + 86400000)
      })
    )
    if (thisWeek.length) return thisWeek.slice(0, 12)
    // Fallback (e.g. recess): bills currently before the Commons, most recent first.
    return items.filter((b) => b.currentHouse === 'Commons').slice(0, 8)
  } catch {
    return [] as BillItem[]
  }
}

async function getRecentDivisions() {
  try {
    const { start } = weekRange()
    const from = new Date(start.getTime() - 7 * 86400000).toISOString().slice(0, 10)
    const to = new Date().toISOString().slice(0, 10)
    const res = await fetch(`https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.startDate=${from}&queryParameters.endDate=${to}&queryParameters.take=12`, { cache: 'no-store' })
    if (!res.ok) return [] as Division[]
    return (await res.json()) as Division[]
  } catch {
    return [] as Division[]
  }
}

export default async function ThisWeekPage() {
  const [bills, divisions] = await Promise.all([getCommonsBills(), getRecentDivisions()])

  // Map Parliament billId -> our internal bill id so we can link on-site.
  const ids = bills.map((b) => b.billId)
  let internal: Record<number, number> = {}
  if (ids.length) {
    const { data } = await supabase.from('bill').select('id, parliament_id').in('parliament_id', ids)
    internal = Object.fromEntries((data || []).map((r: { id: number; parliament_id: number }) => [r.parliament_id, r.id]))
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <OpenGovShell pageStamp="This Week">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          This Week in Parliament
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK }}>
          The bills before the House of Commons this week and the most recent votes MPs have held. Updated live from Parliament. Individual divisions are not scheduled in advance, so a bill being debated may or may not be put to a vote.
        </p>
      </header>

      <section style={{ marginBottom: '8%' }}>
        <h2 style={{ fontFamily: MONO, fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '14px' }}>
          Before the Commons
        </h2>
        {bills.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>No Commons bills listed right now (the House may be in recess).</p>}
        {bills.map((b) => {
          const sitting = (b.currentStage?.stageSittings || []).map((s) => s.date).sort().slice(-1)[0]
          const href = internal[b.billId] ? `/bills/${internal[b.billId]}` : `https://bills.parliament.uk/bills/${b.billId}`
          return (
            <a key={b.billId} href={href} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '12px 0' }}>
              <div style={{ fontSize: 'clamp(16px, 1.9vw, 20px)', fontWeight: 'bold', lineHeight: 1.3 }}>{b.shortTitle}</div>
              <div style={{ fontFamily: MONO, fontSize: '13px', color: INK, marginTop: '4px' }}>
                {b.currentStage?.description || 'Before the Commons'}{sitting ? ` · ${fmt(sitting)}` : ''}
              </div>
            </a>
          )
        })}
      </section>

      <section>
        <h2 style={{ fontFamily: MONO, fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '14px' }}>
          Recent Commons votes
        </h2>
        {divisions.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>No divisions recorded in the last week.</p>}
        {divisions.map((d) => (
          <a key={d.DivisionId} href={`https://votes.parliament.uk/Votes/Commons/Division/${d.DivisionId}`} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '12px 0' }}>
            <div style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', fontWeight: 'bold', lineHeight: 1.3 }}>{d.Title}</div>
            <div style={{ fontFamily: MONO, fontSize: '13px', color: INK, marginTop: '4px' }}>
              {fmt(d.Date)}{typeof d.AyeCount === 'number' ? ` · Ayes ${d.AyeCount} / Noes ${d.NoCount}` : ''}
            </div>
          </a>
        ))}
      </section>

      <ScrollToTopButton />
    </OpenGovShell>
  )
}
