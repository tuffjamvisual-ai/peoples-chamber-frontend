'use client'

import { useMemo, useState } from 'react'

type Row = Record<string, unknown>

interface Props {
  rows: Row[]
  sectionTitle: string
  section?: string
}

const ACCENT = '#60a5fa'

function formatAmount(v: unknown): string | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  if (!Number.isFinite(n)) return null
  return `£${Math.round(n).toLocaleString('en-GB')}`
}

function formatUkDate(iso: unknown): string | null {
  if (typeof iso !== 'string' || !iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TITLE_KEYS = [
  'title', 'name', 'subject',
  'person_name', 'mp_name', 'donor_name', 'lobbyist_name', 'minister_name', 'minister', 'donor',
  'organisation', 'organisation_name', 'company', 'company_name', 'group_name',
]

const HIDE_KEYS = new Set(['id', 'created_at', 'updated_at', 'inserted_at'])
const DATE_KEYS = ['date', 'meeting_date', 'received_date', 'awarded_date', 'reported_date', 'registered_date', 'departure_date']

function pickTitle(row: Row): { key: string | null; value: string } {
  for (const k of TITLE_KEYS) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) return { key: k, value: v }
  }
  for (const [k, v] of Object.entries(row)) {
    if (HIDE_KEYS.has(k)) continue
    if (typeof v === 'string' && v.trim()) return { key: k, value: v }
  }
  return { key: null, value: '(untitled)' }
}

function pickDate(row: Row): string | null {
  for (const k of DATE_KEYS) {
    const v = row[k]
    if (typeof v === 'string' && v) return v
  }
  return null
}

function formatValue(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

export default function TransparencyClient({ rows, sectionTitle, section }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((row) => Object.values(row).some((v) => formatValue(v).toLowerCase().includes(q)))
  }, [rows, query])

  if (rows.length === 0) {
    return (
      <p className="text-gray-200 text-[13px] leading-[1.7] border-t border-[#1e2a3a] pt-8">
        No records have been synced into the {sectionTitle.toLowerCase()} table yet. The page will populate once the sync job runs.
      </p>
    )
  }

  return (
    <>
      <div className="mb-8">
        <label htmlFor="transparency-search" className="block text-[10px] uppercase tracking-[0.25em] text-gray-200 font-medium mb-2">
          Search
        </label>
        <input
          id="transparency-search"
          type="search"
          placeholder={`Search ${rows.length.toLocaleString()} records…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md bg-[#0d1520] border border-[#1e2a3a] text-white text-[13px] rounded-sm px-4 py-3 leading-[1.7] placeholder:text-gray-200 focus:outline-none focus:border-[#60a5fa] transition-colors"
        />
        {query && (
          <p className="text-gray-200 text-[11px] mt-2 font-mono uppercase tracking-[0.15em]">
            {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} matching
          </p>
        )}
      </div>

      {section === 'donations' ? (
        <ul className="space-y-px bg-[#1e2a3a] border border-[#1e2a3a]">
          {filtered.map((row, i) => {
            const recipient = (row.recipient_name as string) || '(unknown recipient)'
            const donor = (row.donor_name as string) || '(unknown donor)'
            const donorType = row.donor_type as string | null
            const amount = formatAmount(row.amount)
            const nature = row.nature as string | null
            const receivedDate = formatUkDate(row.received_date)
            return (
              <li key={i} className="bg-[#0d1520] p-5 border-l-2 border-l-[#60a5fa]">
                <div className="flex items-baseline justify-between gap-4 mb-1.5">
                  <h3 className="text-white text-base sm:text-lg font-bold leading-snug tracking-tight">{recipient}</h3>
                  {amount && (
                    <span className="font-mono text-base font-black whitespace-nowrap" style={{ color: ACCENT }}>
                      {amount}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-gray-200 leading-[1.7] mb-1">
                  from <span className="text-white font-semibold">{donor}</span>
                  {donorType && <span className="text-gray-200"> · {donorType}</span>}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-200 font-mono uppercase tracking-[0.15em]">
                  {receivedDate && <span>{receivedDate}</span>}
                  {nature && <span>· {nature}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="space-y-px bg-[#1e2a3a] border border-[#1e2a3a]">
          {filtered.map((row, i) => {
            const { key: titleKey, value: titleValue } = pickTitle(row)
            const dateValue = pickDate(row)
            const otherEntries = Object.entries(row).filter(
              ([k, v]) => k !== titleKey && !HIDE_KEYS.has(k) && v !== null && v !== '' && !(typeof v === 'string' && v.trim() === ''),
            )

            return (
              <li key={i} className="bg-[#0d1520] p-5 border-l-2 border-l-transparent hover:border-l-[#60a5fa] transition-colors">
                <div className="flex items-baseline justify-between gap-4 mb-3">
                  <h3 className="text-white text-[14px] font-bold leading-snug">{titleValue}</h3>
                  {dateValue && (
                    <span className="text-gray-200 text-[11px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">
                      {dateValue}
                    </span>
                  )}
                </div>
                {otherEntries.length > 0 && (
                  <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[12px] leading-[1.7]">
                    {otherEntries.map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-[10px] uppercase tracking-[0.2em] text-gray-200 font-mono pt-0.5">{k}</dt>
                        <dd className="text-gray-200 whitespace-pre-line break-words">{formatValue(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
