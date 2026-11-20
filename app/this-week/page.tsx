import type { Metadata } from 'next'
import { X_CARD, X_SQUARE_IMAGE } from '@/lib/og/x-card';
import { supabase } from '@/lib/supabase'
import { SITE } from '@/lib/JsonLd'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink'
import { isInProgress } from '@/lib/bill-status';
import { tableTag } from '@/lib/source-tags';
import { addDays, londonDay } from '@/lib/london-date';
import { divisionsFrom } from '@/lib/this-week-window';
import ThisWeekLists, { type WeekBill, type WeekVote } from './ThisWeekLists';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

// The current week's Commons business. Sources: Parliament Bills API (stages + sitting dates) and the Commons Votes API
// (recent divisions). A16 (ENTRY 129, 140): no timer; rebuilt when our bill or votes sync records a change, and the
// week shown follows today's date in the browser.
export const revalidate = false

export const metadata: Metadata = {
  title: 'This Week in Parliament',
  description: 'The bills coming up in the House of Commons over the next seven days, and the most recent votes MPs have held.',
  alternates: { canonical: '/this-week' },
  // ./opengraph-image.tsx fills og:image (OG1); the same address is given here so twitter:image points to it as well.
  twitter: { card: X_CARD, images: [X_SQUARE_IMAGE] },
}

const INK = '#14100d'
const ACCENT = '#7a1612'
const HAIRLINE = 'rgba(20,16,13,0.25)'
const MONO = 'var(--font-special-elite), monospace'

type Sitting = { date: string }
type Stage = { description?: string; house?: string; stageSittings?: Sitting[] }
type BillItem = { billId: number; shortTitle: string; currentHouse?: string; lastUpdate?: string; isAct?: boolean; billWithdrawn?: string | null; currentStage?: Stage }
type Division = { DivisionId: number; Date: string; Title: string; AyeCount?: number; NoCount?: number }

// The bills and votes for two weeks around today are read here; the browser shows today's seven days (ThisWeekLists,
// ENTRY 140). Parliament's lists are kept under our own tags (A16, no timers): the bills list until the bill sync
// changes a bill (table:bill), the votes until the Commons votes sync stores a new division (table:mp_division_votes).
async function getCommonsBills(today: string): Promise<{ bills: BillItem[]; fallback: BillItem[] }> {
  try {
    const res = await fetch('https://bills-api.parliament.uk/api/v1/Bills?SortOrder=DateUpdatedDescending', { next: { revalidate: false, tags: [tableTag('bill')] } })
    if (!res.ok) return { bills: [], fallback: [] }
    const j = (await res.json()) as { items?: BillItem[] }   // Parliament's titles word for word (owner, 5 Nov 2026)
    const items: BillItem[] = (j.items || []).filter((b: BillItem) => isInProgress(b))
    const end = addDays(today, 13)
    // Bills with a COMMONS stage sitting from today to 13 days ahead (the browser narrows it to seven days).
    const bills = items.filter((b) =>
      b.currentStage?.house === 'Commons' &&
      (b.currentStage.stageSittings || []).some((s) => {
        const d = (s.date || '').slice(0, 10)
        return d >= today && d <= end
      })
    )
    // Fallback (e.g. recess): bills currently before the Commons, most recent first.
    return { bills: bills.slice(0, 30), fallback: items.filter((b) => b.currentHouse === 'Commons').slice(0, 8) }
  } catch {
    return { bills: [], fallback: [] }
  }
}

async function getRecentDivisions(today: string) {
  try {
    const from = addDays(divisionsFrom(today), -7)
    const res = await fetch(`https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.startDate=${from}&queryParameters.take=40`, { next: { revalidate: false, tags: [tableTag('mp_division_votes')] } })
    if (!res.ok) return [] as Division[]
    return (await res.json()) as Division[]
  } catch {
    return [] as Division[]
  }
}

export default async function ThisWeekPage() {
  const renderedOn = londonDay()
  const [{ bills: upcoming, fallback }, divisions] = await Promise.all([getCommonsBills(renderedOn), getRecentDivisions(renderedOn)])
  const bills = [...upcoming, ...fallback.filter((f) => !upcoming.some((b) => b.billId === f.billId))]

  // Map Parliament billId -> our internal bill id so we can link on-site.
  const ids = bills.map((b) => b.billId)
  let internal: Record<number, number> = {}
  if (ids.length) {
    // Hidden bills (bill.hidden_reason) have no page, so they are not linked.
    const { data, error: dataErr2 } = await cachedQuery(['q:app/this-week/page.tsx:9b4e5d7b20', JSON.stringify([ids])], tableTags('bill'), () => supabase.from('bill').select('id, parliament_id').in('parliament_id', ids).is('hidden_reason', null))
    if (dataErr2 && dataErr2.code !== 'PGRST116') throw new Error(`/this-week bill: ${dataErr2.message}`);
    internal = Object.fromEntries((data || []).map((r: { id: number; parliament_id: number }) => [r.parliament_id, r.id]))
  }

  // Map Commons Votes DivisionId -> our internal division slug, so each vote
  // links to the on-site division page (no outbound links). Divisions not yet
  // synced into mp_division_votes render without a link rather than pointing off
  // site; they become linkable once the daily votes sync picks them up.
  // One row per division, read in parallel (23 Oct 2026): a single .in() over all of them returned every MP's vote
  // row and stopped at the 1,000 row cap, so only the first two or three divisions got a link.
  const divIds = divisions.map((d) => d.DivisionId)
  let divSlug: Record<number, string> = {}
  if (divIds.length) {
    const found = await Promise.all(divIds.map(async (id) => {
      const { data, error: dataErr } = await cachedQuery(['q:app/this-week/page.tsx:41bbe7add7', JSON.stringify([id])], tableTags('mp_division_votes'), () => supabase
        .from('mp_division_votes')
        .select('division_id, division_date_only, division_number')
        .eq('division_id', id)
        .limit(1)
        .maybeSingle())
      if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`/this-week mp_division_votes ${id}: ${dataErr.message}`);
      return data as { division_id: number; division_date_only: string | null; division_number: number | null } | null
    }))
    divSlug = Object.fromEntries(
      found
        .filter((r): r is { division_id: number; division_date_only: string; division_number: number } => !!r && !!r.division_date_only && r.division_number != null)
        .map((r) => [r.division_id, `/divisions/pw-${r.division_date_only}-${r.division_number}-commons`]),
    )
  }

  const weekBill = (b: BillItem): WeekBill => ({
    billId: b.billId, title: b.shortTitle, stage: b.currentStage?.description || 'Before the Commons',
    sittings: (b.currentStage?.stageSittings || []).map((x) => (x.date || '').slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort(),
    href: internal[b.billId] ? `/bills/${internal[b.billId]}` : null,
  })
  const votes: WeekVote[] = divisions.map((d) => ({ id: d.DivisionId, title: d.Title, date: d.Date, ayes: d.AyeCount ?? null, noes: d.NoCount ?? null, href: divSlug[d.DivisionId] || null }))

  return (
    <OpenGovShell>
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
          The bills coming up in the House of Commons over the next seven days, and the most recent votes MPs have held. Updated live from Parliament. Individual divisions are not scheduled in advance, so a bill being debated may or may not be put to a vote.
        </p>
      </header>

      <ThisWeekLists bills={upcoming.map(weekBill)} fallback={fallback.map(weekBill)} votes={votes} renderedOn={renderedOn} />

    </OpenGovShell>
  )
}
