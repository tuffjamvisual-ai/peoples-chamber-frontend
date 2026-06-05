'use client'

import { useEffect, useMemo, useState } from 'react'

type Row = Record<string, unknown>

interface Props {
  rows: Row[]
  sectionTitle: string
  section?: string
  total: number
  searchQuery: string
}

const ACCENT = '#6b2417'
const PAGE_SIZE = 50

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

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  filteredCount,
}: {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  filteredCount: number
}) {
  if (totalPages <= 1) return null
  const start = page * PAGE_SIZE + 1
  const end = Math.min((page + 1) * PAGE_SIZE, filteredCount)
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#14100d]/20">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="px-4 py-2 text-[14px] uppercase tracking-[0.2em] font-mono border border-[#14100d]/20 text-[#14100d] hover:border-[#14100d] hover:text-[#14100d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ← Previous
      </button>
      <span className="text-[14px] font-mono text-[#14100d] uppercase tracking-[0.15em]">
        {start}-{end} of {filteredCount.toLocaleString()}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages - 1}
        className="px-4 py-2 text-[14px] uppercase tracking-[0.2em] font-mono border border-[#14100d]/20 text-[#14100d] hover:border-[#14100d] hover:text-[#14100d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  )
}

export default function TransparencyClient({ rows, sectionTitle, section, total, searchQuery }: Props) {
  const isDonations = section === 'donations'

  // Client-side search state (non-donations sections only)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  // Reset to page 0 whenever the client-side filter changes
  useEffect(() => { setPage(0) }, [query])

  const filtered = useMemo(() => {
    if (isDonations || !query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((row) => Object.values(row).some((v) => formatValue(v).toLowerCase().includes(q)))
  }, [rows, query, isDonations])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (rows.length === 0 && !searchQuery) {
    return (
      <p className="text-[#14100d] text-[13px] leading-[1.7] border-t border-[#14100d]/20 pt-8">
        No records have been synced into the {sectionTitle.toLowerCase()} table yet. The page will populate once the sync job runs.
      </p>
    )
  }

  return (
    <>
      {/* Search — server-side form for donations, client-side input for others */}
      <div className="mb-8">
        <label htmlFor="transparency-search" className="block text-[13px] uppercase tracking-[0.25em] text-[#14100d] font-medium mb-2">
          Search
        </label>
        {isDonations ? (
          <form method="GET" className="flex gap-2 max-w-md">
            <input
              id="transparency-search"
              name="q"
              type="search"
              defaultValue={searchQuery}
              placeholder="Search by donor or recipient…"
              className="flex-1 bg-[#14100d]/5 border border-[#14100d]/20 text-[#14100d] text-[13px] rounded-sm px-4 py-3 leading-[1.7] placeholder:text-[#14100d]/40 focus:outline-none focus:border-[#14100d] transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-3 text-[14px] uppercase tracking-[0.2em] font-mono border border-[#14100d]/20 text-[#14100d] hover:border-[#14100d] hover:text-[#14100d] transition-colors whitespace-nowrap"
            >
              Search
            </button>
          </form>
        ) : (
          <>
            <input
              id="transparency-search"
              type="search"
              placeholder={`Search ${rows.length.toLocaleString()} records…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full max-w-md bg-[#14100d]/5 border border-[#14100d]/20 text-[#14100d] text-[13px] rounded-sm px-4 py-3 leading-[1.7] placeholder:text-[#14100d]/40 focus:outline-none focus:border-[#14100d] transition-colors"
            />
            {query && (
              <p className="text-[#14100d] text-[14px] mt-2 font-mono uppercase tracking-[0.15em]">
                {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} matching
              </p>
            )}
          </>
        )}
      </div>

      {rows.length === 0 && searchQuery ? (
        <p className="text-[#14100d] text-[13px] leading-[1.7] border-t border-[#14100d]/20 pt-8">
          No results found for &ldquo;{searchQuery}&rdquo;.
        </p>
      ) : section === 'revolving-door' ? (
        <>
          <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
            {paged.map((row, i) => {
              const personName = (row.person_name as string) || '(unknown)'
              const previousRole = row.previous_role as string | null
              const newRole = row.new_role as string | null
              const organisation = row.organisation as string | null
              const approvalDate = formatUkDate(row.approval_date)
              const newRoleLine = [newRole || 'New role: pending ACOBA publication', organisation].filter(Boolean).join(' · ')
              return (
                <li key={i} className="p-5 border-l-2 border-l-[#14100d]">
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <h3 className="text-[#14100d] text-base font-bold leading-snug tracking-tight">{personName}</h3>
                    {approvalDate && (
                      <span className="text-[#14100d] text-[14px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">
                        {approvalDate}
                      </span>
                    )}
                  </div>
                  {previousRole && (
                    <p className="text-[#14100d] text-[13px] leading-[1.7] mb-1">{previousRole}</p>
                  )}
                  <p className="text-[13px] leading-[1.7] font-semibold" style={{ color: ACCENT }}>
                    {newRoleLine}
                  </p>
                </li>
              )
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} filteredCount={filtered.length} />
        </>
      ) : section === 'donations' ? (
        <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
          {rows.map((row, i) => {
            const recipient = (row.recipient_name as string) || '(unknown recipient)'
            const donor = (row.donor_name as string) || '(unknown donor)'
            const donorType = row.donor_type as string | null
            const amount = formatAmount(row.amount)
            const nature = row.nature as string | null
            const receivedDate = formatUkDate(row.received_date)
            return (
              <li key={i} className="p-5 border-l-2 border-l-[#14100d]">
                <div className="flex items-baseline justify-between gap-4 mb-1.5">
                  <h3 className="text-[#14100d] text-base sm:text-lg font-bold leading-snug tracking-tight">{recipient}</h3>
                  {amount && (
                    <span className="font-mono text-base font-black whitespace-nowrap" style={{ color: ACCENT }}>
                      {amount}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[#14100d] leading-[1.7] mb-1">
                  from <span className="text-[#14100d] font-semibold">{donor}</span>
                  {donorType && <span className="text-[#14100d]"> · {donorType}</span>}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-[#14100d] font-mono uppercase tracking-[0.15em]">
                  {receivedDate && <span>{receivedDate}</span>}
                  {nature && <span>· Type: {nature}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <>
          <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
            {paged.map((row, i) => {
              const { key: titleKey, value: titleValue } = pickTitle(row)
              const dateValue = pickDate(row)
              const otherEntries = Object.entries(row).filter(
                ([k, v]) => k !== titleKey && !HIDE_KEYS.has(k) && v !== null && v !== '' && !(typeof v === 'string' && v.trim() === ''),
              )

              return (
                <li key={i} className="p-5 border-l-2 border-l-transparent hover:border-l-[#14100d] transition-colors">
                  <div className="flex items-baseline justify-between gap-4 mb-3">
                    <h3 className="text-[#14100d] text-[14px] font-bold leading-snug">{titleValue}</h3>
                    {dateValue && (
                      <span className="text-[#14100d] text-[14px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">
                        {dateValue}
                      </span>
                    )}
                  </div>
                  {otherEntries.length > 0 && (
                    <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[15px] leading-[1.7]">
                      {otherEntries.map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-[13px] uppercase tracking-[0.2em] text-[#14100d] font-mono pt-0.5">{k}</dt>
                          <dd className="text-[#14100d] whitespace-pre-line break-words">{formatValue(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              )
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} filteredCount={filtered.length} />
        </>
      )}
    </>
  )
}
