// MP Activity table and controls, rendered on the server (owner, 31 Oct 2026). It replaced MpActivityClient, which sent
// every MP to the browser (1.2 MB, 117 screens on a phone) and sorted and filtered there. Sorting, the party filter,
// the MP search and paging now happen in page.tsx; everything here is plain links and a GET form, so the controls work
// without JavaScript and every view has its own shareable address.

import Link from 'next/link'

export type Dept = { dept: string; count: number }
export type Row = {
  member_id: number
  name: string
  party: string | null
  constituency: string | null
  total: number
  words: number
  writtenQuestions: number
  wqDepts: Dept[]
  // Minister, whip or the Speaker: excluded from the "fewest written questions"
  // ranking, since they table few or none by role rather than from idleness.
  frontbench: boolean
}

export type ViewKey = 'most-active' | 'fewest-contributions' | 'most-questions' | 'fewest-questions' | 'most-words' | 'name'
export type SortKey = 'total' | 'words' | 'wq' | 'name'
export const VIEWS: Record<ViewKey, { sortKey: SortKey; dir: 'desc' | 'asc'; label: string }> = {
  'most-active': { sortKey: 'total', dir: 'desc', label: 'Most active' },
  'fewest-contributions': { sortKey: 'total', dir: 'asc', label: 'Fewest contributions' },
  'most-questions': { sortKey: 'wq', dir: 'desc', label: 'Most questions' },
  'fewest-questions': { sortKey: 'wq', dir: 'asc', label: 'Fewest questions' },
  'most-words': { sortKey: 'words', dir: 'desc', label: 'Most words' },
  name: { sortKey: 'name', dir: 'asc', label: 'A to Z' },
}
export const DEFAULT_VIEW: ViewKey = 'most-active'

const INK = '#14100d'
const ACCENT = '#7a1612'
const HAIRLINE = 'rgba(20,16,13,0.2)'
const MONO = 'var(--font-special-elite), monospace'
const BASE = '/transparency/mp-activity'

// Shorten the long official department names for the per-MP breakdown line.
const DEPT_SHORT: Record<string, string> = {
  'Department for Work and Pensions': 'DWP',
  'Department of Health and Social Care': 'Health',
  'Department for Education': 'Education',
  'Ministry of Justice': 'Justice',
  'Department for Transport': 'Transport',
  'Foreign, Commonwealth and Development Office': 'FCDO',
  'HM Treasury': 'Treasury',
  'Ministry of Defence': 'Defence',
  'Department for Environment, Food and Rural Affairs': 'Defra',
  'Department for Business and Trade': 'Business & Trade',
  'Department for Energy Security and Net Zero': 'Energy',
  'Department for Science, Innovation and Technology': 'Science',
  'Ministry of Housing, Communities and Local Government': 'Housing',
  'Department for Levelling Up, Housing and Communities': 'Housing',
  'Department for Culture, Media and Sport': 'Culture',
  'Cabinet Office': 'Cabinet Office',
  'Home Office': 'Home Office',
  'Attorney General': 'Attorney General',
  'Northern Ireland Office': 'NI Office',
  'Scotland Office': 'Scotland Office',
  'Wales Office': 'Wales Office',
}
function shortDept(d: string): string {
  return DEPT_SHORT[d] || d.replace(/^Department (for|of) /, '').replace(/^Ministry of /, '')
}

// The address of a view: the default view, no party, no search and page 1 are left out.
export function activityHref(view: ViewKey, party: string | null, q: string | null, page = 1): string {
  const qs = new URLSearchParams()
  if (view !== DEFAULT_VIEW) qs.set('view', view)
  if (party) qs.set('party', party)
  if (q) qs.set('q', q)
  if (page > 1) qs.set('page', String(page))
  const s = qs.toString()
  return s ? `${BASE}?${s}` : BASE
}

type Props = {
  rows: Row[]           // this page's rows, already sorted and filtered
  firstRank: number     // rank of rows[0] in the full sorted and filtered list
  total: number         // MPs in the full sorted and filtered list
  view: ViewKey
  party: string | null
  q: string | null
  parties: string[]
}

export default function MpActivityTable({ rows, firstRank, total, view, party, q, parties }: Props) {
  const { sortKey, dir } = VIEWS[view]
  const excludeFrontbench = view === 'fewest-questions'

  // Column headers link to a view, as the old headers sorted: clicking the column already sorted flips its direction.
  const headerView = (key: SortKey): ViewKey => {
    if (key === 'name') return 'name'
    if (key === 'words') return 'most-words'
    if (key === 'total') return view === 'most-active' ? 'fewest-contributions' : 'most-active'
    return view === 'most-questions' ? 'fewest-questions' : 'most-questions'
  }
  const arrow = (key: SortKey) => (sortKey === key ? (dir === 'desc' ? ' ▼' : ' ▲') : '')

  const th: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK, padding: '8px 10px', borderBottom: `2px solid ${INK}`, whiteSpace: 'nowrap' }
  const thLink: React.CSSProperties = { color: INK, textDecoration: 'none' }
  const td: React.CSSProperties = { padding: '9px 10px', borderBottom: `1px solid ${HAIRLINE}`, fontSize: '15px', color: INK }
  const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }
  const button = (active: boolean): React.CSSProperties => ({ display: 'inline-block', fontFamily: MONO, fontSize: '15px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 14px', textDecoration: 'none', background: active ? ACCENT : 'transparent', color: active ? '#fff' : ACCENT })
  const group: React.CSSProperties = { display: 'inline-flex', border: `1px solid ${ACCENT}`, borderRadius: '3px', overflow: 'hidden' }
  const field: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', padding: '6px 10px', border: `1px solid ${ACCENT}`, borderRadius: '3px', background: 'transparent', color: INK }

  const viewLink = (v: ViewKey) => (
    <Link key={v} href={activityHref(v, party, q)} style={button(view === v)} aria-current={view === v ? 'page' : undefined}>
      {VIEWS[v].label}
    </Link>
  )
  const last = firstRank + rows.length - 1

  return (
    <div>
      {/* Controls: links keep the party and search and go back to page 1; the form keeps the view. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'center', marginBottom: '12px' }}>
        <div style={group}>{(['most-active', 'fewest-contributions'] as const).map(viewLink)}</div>
        <div style={group}>{(['most-questions', 'fewest-questions'] as const).map(viewLink)}</div>
        <div style={group}>{(['most-words', 'name'] as const).map(viewLink)}</div>
      </div>
      <form method="get" action={BASE} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'center', marginBottom: '12px' }}>
        {view !== DEFAULT_VIEW && <input type="hidden" name="view" value={view} />}
        <label style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.06em', color: INK }}>
          Party:{' '}
          <select name="party" defaultValue={party ?? ''} style={{ ...field, cursor: 'pointer' }}>
            <option value="">All</option>
            {parties.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.06em', color: INK }}>
          Find an MP:{' '}
          <input type="search" name="q" defaultValue={q ?? ''} placeholder="Name or constituency" maxLength={100} style={{ ...field, width: '15em', maxWidth: '100%' }} />
        </label>
        <button type="submit" style={{ ...button(false), border: `1px solid ${ACCENT}`, borderRadius: '3px', cursor: 'pointer' }}>Go</button>
        <span style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>{total} MPs</span>
      </form>

      {excludeFrontbench && (
        <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '12px' }}>
          Ministers, whips and the Speaker are excluded from this list: they table few or no written questions by convention, so their absence is not idleness.
        </p>
      )}

      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '8px' }}>
        {total > 0 ? `Showing ${firstRank} to ${last} of ${total}` : 'No MPs match this search.'}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'right' }}>#</th>
              <th style={th}><Link href={activityHref(headerView('name'), party, q)} style={thLink}>MP{arrow('name')}</Link></th>
              <th style={th}>Party</th>
              <th style={{ ...th, textAlign: 'right' }}><Link href={activityHref(headerView('total'), party, q)} style={thLink}>Contributions{arrow('total')}</Link></th>
              <th style={{ ...th, textAlign: 'right' }}><Link href={activityHref(headerView('words'), party, q)} style={thLink}>Words{arrow('words')}</Link></th>
              <th style={{ ...th, textAlign: 'right' }}><Link href={activityHref(headerView('wq'), party, q)} style={thLink}>Written Qs{arrow('wq')}</Link></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.member_id}>
                <td style={{ ...num, fontWeight: 'normal', color: INK }}>{firstRank + i}</td>
                <td style={td}>
                  <a href={`/mps/${r.member_id}`} style={{ color: INK, fontWeight: 'bold', textDecoration: 'none' }}>{r.name}</a>
                  {r.constituency && <span style={{ display: 'block', fontFamily: MONO, fontSize: '15px', color: INK }}>{r.constituency}</span>}
                  {r.wqDepts.length > 0 && (
                    <span style={{ display: 'block', fontFamily: MONO, fontSize: '15px', color: ACCENT, marginTop: '2px' }}>
                      Questions: {r.wqDepts.slice(0, 3).map((d) => `${shortDept(d.dept)} ${d.count}`).join(' · ')}
                    </span>
                  )}
                </td>
                <td style={{ ...td, fontFamily: MONO, fontSize: '15px' }}>{r.party || 'n/a'}</td>
                <td style={num}>{r.total.toLocaleString()}</td>
                <td style={num}>{r.words.toLocaleString()}</td>
                <td style={num}>{r.writtenQuestions.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
