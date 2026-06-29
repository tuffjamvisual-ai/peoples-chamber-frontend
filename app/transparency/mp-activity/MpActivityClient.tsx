'use client'

import { useMemo, useState } from 'react'

export type Row = {
  member_id: number
  name: string
  party: string | null
  constituency: string | null
  total: number
  words: number
}

const INK = '#14100d'
const ACCENT = '#7a1612'
const HAIRLINE = 'rgba(20,16,13,0.2)'
const MONO = 'Special Elite, monospace'

type SortKey = 'total' | 'words' | 'name'

export default function MpActivityClient({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [dir, setDir] = useState<'desc' | 'asc'>('desc')
  const [party, setParty] = useState('All')

  const parties = useMemo(
    () => ['All', ...Array.from(new Set(rows.map((r) => r.party).filter(Boolean) as string[])).sort()],
    [rows],
  )

  const view = useMemo(() => {
    const v = party === 'All' ? rows.slice() : rows.filter((r) => r.party === party)
    v.sort((a, b) => {
      let d: number
      if (sortKey === 'name') d = a.name.localeCompare(b.name)
      else d = (a[sortKey] as number) - (b[sortKey] as number)
      return dir === 'desc' ? -d : d
    })
    return v
  }, [rows, party, sortKey, dir])

  function sortBy(key: SortKey) {
    if (key === sortKey) setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setDir(key === 'name' ? 'asc' : 'desc') }
  }
  const arrow = (key: SortKey) => (sortKey === key ? (dir === 'desc' ? ' ▼' : ' ▲') : '')

  const th: React.CSSProperties = { fontFamily: MONO, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK, padding: '8px 10px', borderBottom: `2px solid ${INK}`, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '9px 10px', borderBottom: `1px solid ${HAIRLINE}`, fontSize: '14px', color: INK }
  const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'inline-flex', border: `1px solid ${ACCENT}`, borderRadius: '3px', overflow: 'hidden' }}>
          {(['desc', 'asc'] as const).map((d) => (
            <button key={d} onClick={() => { setSortKey('total'); setDir(d) }}
              style={{ fontFamily: MONO, fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 14px', border: 'none', cursor: 'pointer', background: (sortKey === 'total' && dir === d) ? ACCENT : 'transparent', color: (sortKey === 'total' && dir === d) ? '#fff' : ACCENT }}>
              {d === 'desc' ? 'Most active' : 'Laziest'}
            </button>
          ))}
        </div>
        <label style={{ fontFamily: MONO, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: INK }}>
          Party:{' '}
          <select value={party} onChange={(e) => setParty(e.target.value)} style={{ fontFamily: MONO, fontSize: '13px', padding: '6px 8px', border: `1px solid ${HAIRLINE}`, background: '#fff', color: INK }}>
            {parties.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <span style={{ fontFamily: MONO, fontSize: '12px', color: INK }}>{view.length} MPs</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, cursor: 'default', textAlign: 'right' }}>#</th>
              <th style={th} onClick={() => sortBy('name')}>MP{arrow('name')}</th>
              <th style={{ ...th, cursor: 'default' }}>Party</th>
              <th style={{ ...th, textAlign: 'right' }} onClick={() => sortBy('total')}>Contributions{arrow('total')}</th>
              <th style={{ ...th, textAlign: 'right' }} onClick={() => sortBy('words')}>Words{arrow('words')}</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={r.member_id}>
                <td style={{ ...num, fontWeight: 'normal', color: INK }}>{i + 1}</td>
                <td style={td}>
                  <a href={`/mps/${r.member_id}`} style={{ color: INK, fontWeight: 'bold', textDecoration: 'none' }}>{r.name}</a>
                  {r.constituency && <span style={{ display: 'block', fontFamily: MONO, fontSize: '11px', color: INK }}>{r.constituency}</span>}
                </td>
                <td style={{ ...td, fontFamily: MONO, fontSize: '12px' }}>{r.party || '—'}</td>
                <td style={num}>{r.total.toLocaleString()}</td>
                <td style={num}>{r.words.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
