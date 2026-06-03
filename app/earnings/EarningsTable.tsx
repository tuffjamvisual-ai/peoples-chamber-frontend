'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { EarningsRow } from './page'
import { SALARY_BAND_LABEL } from '@/lib/ministerial-salaries'

type SortKey = 'rank' | 'name' | 'base' | 'ministerial' | 'outside' | 'personal_total' | 'public_spend'
type SortDir = 'asc' | 'desc'

function fmtMoney(n: number): string {
  if (!n) return '£0'
  return '£' + Math.round(n).toLocaleString('en-GB')
}

// Polaroid tilt cycle. Cycles through 5 small angles so adjacent rows
// don't share the same lean, but no row tilts so far that overlaps the
// next row visually. Keep the absolute value small (<=2.5deg) for
// table rows; bigger tilts are reserved for the MP dossier polaroid.
const PEG_TILTS = [-1.8, 1.2, -0.8, 2.0, -1.2, 0.8, -2.0, 1.8];
function pegTilt(rank: number): number {
  return PEG_TILTS[(rank - 1) % PEG_TILTS.length] ?? 0;
}

export default function EarningsTable({ rows, year }: { rows: EarningsRow[]; year: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('personal_total')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Original ranking by personal_total descending — used for the rank column
  const baseRankByMember = useMemo(() => {
    const map = new Map<number, number>()
    const sorted = [...rows].sort((a, b) => b.personal_total - a.personal_total)
    sorted.forEach((r, i) => map.set(r.member_id, i + 1))
    return map
  }, [rows])

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'rank':
          cmp = (baseRankByMember.get(a.member_id) || 0) - (baseRankByMember.get(b.member_id) || 0)
          break
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'base':
          cmp = a.base - b.base
          break
        case 'ministerial':
          cmp = a.ministerial - b.ministerial
          break
        case 'outside':
          cmp = a.outside - b.outside
          break
        case 'personal_total':
          cmp = a.personal_total - b.personal_total
          break
        case 'public_spend':
          cmp = a.public_spend - b.public_spend
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return copy
  }, [rows, sortKey, sortDir, baseRankByMember])

  function toggle(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      // Default direction: descending for monetary columns, ascending for name/rank
      setSortDir(key === 'name' || key === 'rank' ? 'asc' : 'desc')
    }
  }

  return (
    <div
      className="border border-[#14100d]/20"
      style={{
        // Negative horizontal margin so the table breaks out of the
        // dossier folder's inner padding by a small amount. User
        // asked to *decrease* the inset 2026-06-03 to give the seven
        // columns more breathing room without horizontal scroll.
        marginLeft: 'clamp(-32px, -2%, -8px)',
        marginRight: 'clamp(-32px, -2%, -8px)',
      }}
    >
      {/* No horizontal scroll. Seven columns kept; text sizes bumped
          and polaroid shrunk so the row width fits the dossier folder
          content area on desktop. Vertical scroll is fine (it's a long
          list); horizontal is not. */}
      <table className="w-full text-[16px] border-collapse">
        <thead>
          <tr className="border-b border-[#14100d]/20 text-left">
            <Th label="#"        active={sortKey === 'rank'}           dir={sortDir} onClick={() => toggle('rank')}           align="right" width={28} />
            <Th label="MP"       active={sortKey === 'name'}           dir={sortDir} onClick={() => toggle('name')}           />
            <Th label="Base"     active={sortKey === 'base'}           dir={sortDir} onClick={() => toggle('base')}           align="right" />
            <Th label="Minister." active={sortKey === 'ministerial'}    dir={sortDir} onClick={() => toggle('ministerial')}    align="right" />
            <Th label="Outside"  active={sortKey === 'outside'}        dir={sortDir} onClick={() => toggle('outside')}        align="right" />
            <Th label="Total"    active={sortKey === 'personal_total'} dir={sortDir} onClick={() => toggle('personal_total')} align="right" />
            <Th label="Public spend" active={sortKey === 'public_spend'} dir={sortDir} onClick={() => toggle('public_spend')} align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const partyColour = r.party_colour ? '#' + r.party_colour.replace('#', '') : '#7697a2'
            const rank = baseRankByMember.get(r.member_id) || 0
            return (
              <tr
                key={r.member_id}
                className="border-b border-[#14100d]/10 hover:bg-[#14100d]/5 transition-colors"
              >
                <td className="px-2 py-3 text-right text-[#14100d]/60 tabular-nums" style={{ borderLeft: `2px solid ${partyColour}` }}>
                  {rank}
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Compact parchment polaroid — same vocabulary as
                        MpDossier (cream paper stock, extra bottom
                        padding for the caption strip, soft drop shadow,
                        slight per-row tilt) sized for a table row. */}
                    <div
                      style={{
                        flex: '0 0 auto',
                        background: '#ebe5d8',
                        padding: '3px 3px 9px 3px',
                        transform: `rotate(${pegTilt(rank)}deg)`,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.18), inset 0 0 12px rgba(0,0,0,0.03)',
                        filter: 'contrast(1.05) brightness(0.98)',
                      }}
                    >
                      {r.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.photo_url}
                          alt={r.name}
                          width={34}
                          height={34}
                          style={{ display: 'block', width: '34px', height: '34px', objectFit: 'cover', filter: 'contrast(1.08) sepia(0.05)' }}
                        />
                      ) : (
                        <div
                          aria-hidden
                          style={{
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#d6cdb8',
                            color: '#14100d',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            fontFamily: 'Special Elite, monospace',
                          }}
                        >
                          {r.name.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/mps/${r.member_id}`}
                        className="text-[#14100d] font-semibold hover:underline block truncate text-[17px]"
                        style={{ fontFamily: '"Georgia", "Charter", "Times New Roman", serif' }}
                      >
                        {r.name}
                      </Link>
                      <div className="text-[15px] text-[#14100d]/70 truncate">
                        {/* Constituency dropped 2026-06-03 to save row
                            width inside the dossier folder. Party (and
                            optional salary band) are enough secondary
                            context — the MP's name links to their
                            profile, which carries the constituency. */}
                        {r.party || ''}
                        {r.salary_band ? ` · ${SALARY_BAND_LABEL[r.salary_band]}` : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-right text-[#14100d] tabular-nums whitespace-nowrap">{fmtMoney(r.base)}</td>
                <td className={`px-2 py-3 text-right tabular-nums whitespace-nowrap ${r.ministerial ? 'text-[#14100d]' : 'text-[#14100d]/40'}`}>
                  {r.ministerial ? fmtMoney(r.ministerial) : '—'}
                </td>
                <td className={`px-2 py-3 text-right tabular-nums whitespace-nowrap ${r.outside ? 'text-[#14100d]' : 'text-[#14100d]/40'}`}>
                  {r.outside ? fmtMoney(r.outside) : '—'}
                </td>
                <td className="px-2 py-3 text-right text-[#14100d] font-semibold tabular-nums whitespace-nowrap">
                  {fmtMoney(r.personal_total)}
                </td>
                <td className={`px-2 py-3 text-right tabular-nums whitespace-nowrap ${r.public_spend ? 'text-[#14100d]' : 'text-[#14100d]/40'}`}>
                  {r.public_spend ? fmtMoney(r.public_spend) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  label,
  active,
  dir,
  onClick,
  align = 'left',
  width,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  align?: 'left' | 'right'
  width?: number
}) {
  return (
    <th
      onClick={onClick}
      className={`px-2 py-3 text-[14px] uppercase tracking-[0.14em] font-semibold cursor-pointer select-none ${active ? 'text-[#14100d]' : 'text-[#14100d]/60 hover:text-[#14100d]'}`}
      style={{ textAlign: align, width: width ? `${width}px` : undefined }}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        {active && <span className="opacity-80">{dir === 'desc' ? '▼' : '▲'}</span>}
      </span>
    </th>
  )
}
