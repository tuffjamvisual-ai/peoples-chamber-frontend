'use client'

import { useMemo, useState } from 'react'

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
  // Minister, whip or the Speaker — excluded from the "fewest written questions"
  // ranking, since they table few or none by role rather than from idleness.
  frontbench: boolean
}

const INK = '#14100d'
const ACCENT = '#7a1612'
const HAIRLINE = 'rgba(20,16,13,0.2)'
const MONO = 'Special Elite, monospace'

type SortKey = 'total' | 'words' | 'wq' | 'name'

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

export default function MpActivityClient({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [dir, setDir] = useState<'desc' | 'asc'>('desc')
  const [party, setParty] = useState('All')

  const parties = useMemo(
    () => ['All', ...Array.from(new Set(rows.map((r) => r.party).filter(Boolean) as string[])).sort()],
    [rows],
  )

  // Ministers, whips and the Speaker are dropped only from the "fewest written
  // questions" view (sorting WQs ascending) — they ask few or none by role.
  const excludeFrontbench = sortKey === 'wq' && dir === 'asc'

  const view = useMemo(() => {
    let v = party === 'All' ? rows.slice() : rows.filter((r) => r.party === party)
    if (excludeFrontbench) v = v.filter((r) => !r.frontbench)
    v.sort((a, b) => {
      let d: number
      if (sortKey === 'name') d = a.name.localeCompare(b.name)
      else d = (a[sortKey === 'wq' ? 'writtenQuestions' : sortKey] as number) - (b[sortKey === 'wq' ? 'writtenQuestions' : sortKey] as number)
      return dir === 'desc' ? -d : d
    })
    return v
  }, [rows, party, sortKey, dir, excludeFrontbench])

  function sortBy(key: SortKey) {
    if (key === sortKey) setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setDir(key === 'name' ? 'asc' : 'desc') }
  }
  const arrow = (key: SortKey) => (sortKey === key ? (dir === 'desc' ? ' ▼' : ' ▲') : '')

  const th: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK, padding: '8px 10px', borderBottom: `2px solid ${INK}`, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '9px 10px', borderBottom: `1px solid ${HAIRLINE}`, fontSize: '15px', color: INK }
  const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'inline-flex', border: `1px solid ${ACCENT}`, borderRadius: '3px', overflow: 'hidden' }}>
          {(['desc', 'asc'] as const).map((d) => (
            <button key={d} onClick={() => { setSortKey('total'); setDir(d) }}
              style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 14px', border: 'none', cursor: 'pointer', background: (sortKey === 'total' && dir === d) ? ACCENT : 'transparent', color: (sortKey === 'total' && dir === d) ? '#fff' : ACCENT }}>
              {d === 'desc' ? 'Most active' : 'Laziest'}
            </button>
          ))}
        </div>
        <div style={{ display: 'inline-flex', border: `1px solid ${ACCENT}`, borderRadius: '3px', overflow: 'hidden' }}>
          {(['desc', 'asc'] as const).map((d) => (
            <button key={d} onClick={() => { setSortKey('wq'); setDir(d) }}
              style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 14px', border: 'none', cursor: 'pointer', background: (sortKey === 'wq' && dir === d) ? ACCENT : 'transparent', color: (sortKey === 'wq' && dir === d) ? '#fff' : ACCENT }}>
              {d === 'desc' ? 'Most questions' : 'Fewest questions'}
            </button>
          ))}
        </div>
        <label style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.06em', color: INK }}>
          Party:{' '}
          <select value={party} onChange={(e) => setParty(e.target.value)} style={{ fontFamily: MONO, fontSize: '15px', padding: '6px 10px', border: `1px solid ${ACCENT}`, borderRadius: '3px', background: 'transparent', color: INK, cursor: 'pointer' }}>
            {parties.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <span style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>{view.length} MPs</span>
      </div>

      {excludeFrontbench && (
        <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '12px' }}>
          Ministers, whips and the Speaker are excluded from this list: they table few or no written questions by convention, so their absence is not idleness.
        </p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, cursor: 'default', textAlign: 'right' }}>#</th>
              <th style={th} onClick={() => sortBy('name')}>MP{arrow('name')}</th>
              <th style={{ ...th, cursor: 'default' }}>Party</th>
              <th style={{ ...th, textAlign: 'right' }} onClick={() => sortBy('total')}>Contributions{arrow('total')}</th>
              <th style={{ ...th, textAlign: 'right' }} onClick={() => sortBy('words')}>Words{arrow('words')}</th>
              <th style={{ ...th, textAlign: 'right' }} onClick={() => sortBy('wq')}>Written Qs{arrow('wq')}</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={r.member_id}>
                <td style={{ ...num, fontWeight: 'normal', color: INK }}>{i + 1}</td>
                <td style={td}>
                  <a href={`/mps/${r.member_id}`} style={{ color: INK, fontWeight: 'bold', textDecoration: 'none' }}>{r.name}</a>
                  {r.constituency && <span style={{ display: 'block', fontFamily: MONO, fontSize: '15px', color: INK }}>{r.constituency}</span>}
                  {r.wqDepts.length > 0 && (
                    <span style={{ display: 'block', fontFamily: MONO, fontSize: '15px', color: ACCENT, marginTop: '2px' }}>
                      Questions: {r.wqDepts.slice(0, 3).map((d) => `${shortDept(d.dept)} ${d.count}`).join(' · ')}
                    </span>
                  )}
                </td>
                <td style={{ ...td, fontFamily: MONO, fontSize: '15px' }}>{r.party || '—'}</td>
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
