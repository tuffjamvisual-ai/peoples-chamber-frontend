import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OpenGovShell from '../../components/OpenGovShell'
import BackLink from '../../components/BackLink'
import MpActivityTable, { type Row, type ViewKey, VIEWS, DEFAULT_VIEW, activityHref } from './MpActivityTable'
import { slug } from '@/lib/list-path'
import Pagination from '../../components/Pagination'
import { displayMpName } from '@/lib/mp-name';
import AboutThisData from '../../components/AboutThisData';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

// The ranking (owner, 31 Oct 2026: 50 MPs a page, sorted, filtered and sliced on the server instead of sending every MP to the
// browser). F04 batch 3 (ENTRY 134; T2's f04-32-routes.md B 1.4): rendered by /transparency/mp-activity (static, the default),
// /transparency/mp-activity/filter/[...f] (view, party and page in the path, static per variant) and
// /transparency/mp-activity/search (a name or constituency search, ?q=, rewritten there by next.config.ts).

const PER_PAGE = 50

export type SP = { view?: string | string[]; party?: string | string[]; q?: string | string[]; page?: string | string[] }
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v)

// The query string, read once for both the metadata and the page. Unknown values fall back to the defaults; the party
// is checked against the parties on the page later (an unknown party shows every party).
export function readParams(sp: SP) {
  const v = one(sp.view)
  const view: ViewKey = v && v in VIEWS ? (v as ViewKey) : DEFAULT_VIEW
  const party = one(sp.party)?.trim() || null
  const q = one(sp.q)?.trim().slice(0, 100) || null
  const n = parseInt(one(sp.page) ?? '', 10)
  const page = Number.isFinite(n) && n >= 1 ? n : 1
  return { view, party, q, page }
}

const INK = '#14100d'

// strict (the filter route): a party or page this list does not have is 404, so the cache holds a bounded set of pages; the
// party is then a slug. Otherwise (the default page and a search) an unknown party shows every party and a page past the end
// shows the last page, as before.
export default async function MpActivityListing({ params, strict = false }: { params: ReturnType<typeof readParams>; strict?: boolean }) {
  const [{ data: totals, error: totalsErr }, { data: mps, error: mpsErr }, { data: ministers, error: ministersErr }] = await Promise.all([
    cachedQuery(['q:app/transparency/mp-activity/page.tsx:9648dc39b2'], tableTags('mp_contribution_totals'), () => supabase.from('mp_contribution_totals').select('member_id, total_contributions, word_count, written_questions, wq_top_departments')),
    cachedQuery(['q:app/transparency/mp-activity/page.tsx:232a53c21e'], tableTags('mps'), () => supabase.from('mps').select('member_id, name, party, constituency, start_date').or('current_member.is.null,current_member.eq.true')),
    // Government ministers AND whips (Assistant Whip, Junior Lord of the Treasury,
    // etc. are all here); used to exclude the front bench from the "fewest written
    // questions" ranking, since they table few or none by role.
    cachedQuery(['q:app/transparency/mp-activity/page.tsx:40c41c20d7'], tableTags('dept_ministers'), () => supabase.from('dept_ministers').select('member_id').or('resigned.is.null,resigned.eq.false')),
  ])
  // A failed read throws (owner's approval, 21 Oct 2026), so the last good version stays up.
  for (const e of [totalsErr, mpsErr, ministersErr]) if (e && e.code !== 'PGRST116') throw new Error(`/transparency/mp-activity (mp_contribution_totals, mps, dept_ministers): ${e.message}`);
  // Exclude MPs elected at a by-election within the last six months: their term
  // is too short to rank fairly against MPs who have sat the whole Parliament,
  // so they would otherwise appear bottom of the "fewest contributions" list on a few days'
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
        name: displayMpName(String(m.name || '').replace(/\s+MP$/, '')),
        party: (m.party as string) || null,
        constituency: (m.constituency as string) || null,
        total: t?.total_contributions ?? 0,
        words: Number(t?.word_count ?? 0),
        writtenQuestions: t?.written_questions ?? 0,
        wqDepts: Array.isArray(t?.wq_top_departments) ? t!.wq_top_departments! : [],
        frontbench: frontbench.has(m.member_id as number) || (m.party as string) === 'Speaker',
      }
    })

  // Sort, filter and slice: the same rules and sort fields the browser used. Ministers, whips and the Speaker are dropped
  // only from the "fewest written questions" view; they ask few or none by role.
  const parties = Array.from(new Set(rows.map((r) => r.party).filter(Boolean) as string[])).sort()
  const party = params.party ? (parties.includes(params.party) ? params.party : parties.find((p) => slug(p) === params.party) ?? null) : null
  if (strict && params.party && !party) notFound()
  const { view, q } = params
  const { sortKey, dir } = VIEWS[view]
  let list = party ? rows.filter((r) => r.party === party) : rows.slice()
  if (view === 'fewest-questions') list = list.filter((r) => !r.frontbench)
  if (q) {
    const needle = q.toLowerCase()
    list = list.filter((r) => r.name.toLowerCase().includes(needle) || (r.constituency ?? '').toLowerCase().includes(needle))
  }
  list.sort((a, b) => {
    let d: number
    if (sortKey === 'name') d = a.name.localeCompare(b.name)
    else d = (a[sortKey === 'wq' ? 'writtenQuestions' : sortKey] as number) - (b[sortKey === 'wq' ? 'writtenQuestions' : sortKey] as number)
    return dir === 'desc' ? -d : d
  })
  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  if (strict && params.page > totalPages) notFound()
  const page = Math.min(params.page, totalPages) // a page past the end shows the last page
  const start = (page - 1) * PER_PAGE
  const pageRows = list.slice(start, start + PER_PAGE)
  const qsExtra = [view !== DEFAULT_VIEW ? `&view=${encodeURIComponent(view)}` : '', party ? `&party=${encodeURIComponent(party)}` : '', q ? `&q=${encodeURIComponent(q)}` : ''].join('')

  return (
    <OpenGovShell>
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
        {/* T1-5x S10 (owner, 10 Nov 2026): one line here; the method is in "About this data" after the table. */}
        <p style={{ fontSize: '16px', lineHeight: 1.6, maxWidth: '760px', color: INK, margin: 0 }}>
          Every current MP ranked by how much they have spoken in the Commons and how many written questions they have tabled since the general election on 4 July 2024.
        </p>
      </header>

      <MpActivityTable rows={pageRows} firstRank={start + 1} total={list.length} view={view} party={party} q={q} parties={parties} />
      <Pagination currentPage={page} totalPages={totalPages} baseUrl="/transparency/mp-activity" qsExtra={qsExtra} hrefFor={q ? undefined : (p) => activityHref(view, party, null, p)} />
      <AboutThisData>
        <p>Spoken figures come from Hansard; written questions from the Questions and Statements record, with the departments each MP questions most. Written questions are a backbench scrutiny tool, so ministers, whips and the Speaker are excluded from the fewest questions ranking, and MPs elected at a by election within the last six months are excluded throughout, their term being too short to compare.</p>
        <p>Opposition MPs typically table more written questions than government MPs because questioning departments is the primary scrutiny tool available to those not in power. The rankings reflect this. A Conservative MP tabling 4,000 questions to a Labour government is doing the job opposition is supposed to do.</p>
      </AboutThisData>

    </OpenGovShell>
  )
}
