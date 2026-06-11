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
              const conditions = (row.conditions as string | null)?.trim() || null
              const conditionList = conditions ? conditions.split(' | ').map(c => c.trim()).filter(Boolean) : []
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
                  {conditionList.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#14100d]/10">
                      <p className="text-[12px] uppercase tracking-[0.15em] text-[#14100d]/55 mb-1">ACOBA conditions</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {conditionList.map((c, j) => (
                          <li key={j} className="text-[13px] leading-[1.6] text-[#14100d]/85">{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} filteredCount={filtered.length} />
        </>
      ) : section === 'ministers-meetings' ? (
        <>
          <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
            {paged.map((row, i) => {
              const minister = (row.minister_name as string) || '(unknown minister)'
              const dept = row.minister_dept as string | null
              const organisation = row.organisation as string | null
              const purpose = row.purpose as string | null
              const date = formatUkDate(row.meeting_date)
              return (
                <li key={i} className="p-5 border-l-2 border-l-[#14100d]">
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <h3 className="text-[#14100d] text-base font-bold leading-snug tracking-tight">
                      {minister}
                      {dept && <span className="text-[#14100d]/55 font-normal text-[12px]"> · {dept}</span>}
                    </h3>
                    {date && (
                      <span className="text-[#14100d] text-[14px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">{date}</span>
                    )}
                  </div>
                  {organisation && (
                    <p className="text-[13px] leading-[1.7] font-semibold mb-1" style={{ color: ACCENT }}>Met {organisation}</p>
                  )}
                  {purpose && (
                    <p className="text-[#14100d] text-[13px] leading-[1.7]" style={{ fontFamily: 'Special Elite, monospace' }}>{purpose}</p>
                  )}
                </li>
              )
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} filteredCount={filtered.length} />
        </>
      ) : section === 'hospitality' ? (
        <>
          <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
            {paged.map((row, i) => {
              const minister = (row.minister_name as string) || '(unknown minister)'
              const dept = row.minister_dept as string | null
              const donor = row.donor as string | null
              const description = (row.description as string | null)?.replace(/\s*\|\s*/g, ' · ') || null
              const rawValue = row.value as string | number | null
              const valueFmt = rawValue !== null && String(rawValue).trim() !== '' && Number.isFinite(Number(rawValue))
                ? `£${Number(rawValue).toLocaleString()}`
                : (rawValue ? String(rawValue) : null)
              const date = formatUkDate(row.hospitality_date)
              return (
                <li key={i} className="p-5 border-l-2 border-l-[#14100d]">
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <h3 className="text-[#14100d] text-base font-bold leading-snug tracking-tight">
                      {minister}
                      {dept && <span className="text-[#14100d]/55 font-normal text-[12px]"> · {dept}</span>}
                    </h3>
                    {date && (
                      <span className="text-[#14100d] text-[14px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">{date}</span>
                    )}
                  </div>
                  {donor && (
                    <p className="text-[13px] leading-[1.7] font-semibold mb-1" style={{ color: ACCENT }}>From {donor}</p>
                  )}
                  {(description || valueFmt) && (
                    <p className="text-[#14100d] text-[13px] leading-[1.7]" style={{ fontFamily: 'Special Elite, monospace' }}>
                      {description || ''}
                      {valueFmt && <>{description ? ' · ' : ''}{valueFmt}</>}
                    </p>
                  )}
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
            const cashValue = formatAmount(row.cash_value)
            const nonCashValue = formatAmount(row.non_cash_value)
            const nature = row.nature as string | null
            const donationType = row.donation_type_label as string | null
            const donationAction = row.donation_action as string | null
            const receivedDate = formatUkDate(row.received_date)
            const acceptedDate = formatUkDate(row.accepted_date)
            const reportedDate = formatUkDate(row.reported_date)
            const reportingPeriod = row.reporting_period_name as string | null
            const isAnonymous = row.is_anonymous === true
            const isAggregation = row.is_aggregation === true
            const isBequest = row.is_bequest === true
            const isSponsorship = row.is_sponsorship === true
            const isIrishSource = row.is_irish_source === true
            const isReportedPrePoll = row.is_reported_pre_poll === true
            const attemptedConcealment = row.attempted_concealment === true
            const concealmentDetails = row.concealment_details as string | null
            const impermissibilityReason = row.impermissibility_reason as string | null
            const explanatoryNotes = row.explanatory_notes as string | null
            const positionStandingFor = row.position_standing_for as string | null
            const mannerInWhichMade = row.manner_in_which_made as string | null
            const purposeOfVisit = row.purpose_of_visit as string | null
            const trustName = row.trust_name as string | null
            const trustCreatorName = row.trust_creator_name as string | null
            const trustCreatorStatus = row.trust_creator_status as string | null
            const trustCreatedDate = formatUkDate(row.trust_created_date)
            const companyRegNumber = row.company_registration_number as string | null
            const campaigningName = row.campaigning_name as string | null
            const accountingUnitName = row.accounting_unit_name as string | null
            const recipientType = row.recipient_type as string | null
            const ecRef = row.ec_ref as string | null

            // Build a list of address segments
            const addressParts = [
              row.addr_line1, row.addr_line2, row.addr_line3, row.addr_line4,
              row.addr_town, row.addr_county, row.addr_postcode, row.addr_country,
            ].filter((p): p is string => typeof p === 'string' && p.trim() !== '')

            // Flag chips for noteworthy categorical attributes
            const flags: { label: string; tone?: 'warn' | 'info' }[] = []
            if (attemptedConcealment) flags.push({ label: 'Concealment attempt', tone: 'warn' })
            if (impermissibilityReason) flags.push({ label: 'Impermissible', tone: 'warn' })
            if (donationAction && /return/i.test(donationAction)) flags.push({ label: 'Returned', tone: 'warn' })
            if (isAnonymous) flags.push({ label: 'Anonymous', tone: 'info' })
            if (isBequest) flags.push({ label: 'Bequest', tone: 'info' })
            if (isSponsorship) flags.push({ label: 'Sponsorship', tone: 'info' })
            if (isAggregation) flags.push({ label: 'Aggregated', tone: 'info' })
            if (isIrishSource) flags.push({ label: 'Irish source', tone: 'info' })
            if (isReportedPrePoll) flags.push({ label: 'Pre poll', tone: 'info' })
            if (trustName) flags.push({ label: 'Trust structure', tone: 'info' })

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
                <p className="text-[13px] text-[#14100d] leading-[1.7] mb-1" style={{ fontFamily: 'Special Elite, monospace' }}>
                  from <span className="text-[#14100d] font-semibold">{donor}</span>
                  {donorType && <span className="text-[#14100d]"> · {donorType}</span>}
                  {recipientType && <span className="text-[#14100d]"> · recipient: {recipientType}</span>}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#14100d] uppercase tracking-[0.15em]" style={{ fontFamily: 'Special Elite, monospace' }}>
                  {acceptedDate && <span>Accepted {acceptedDate}</span>}
                  {!acceptedDate && receivedDate && <span>Received {receivedDate}</span>}
                  {donationType && <span>· {donationType}</span>}
                  {nature && <span>· {nature}</span>}
                  {reportingPeriod && <span>· Reported {reportingPeriod}</span>}
                </div>

                {flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {flags.map((f) => (
                      <span
                        key={f.label}
                        className="text-[12px] uppercase tracking-[0.2em] font-bold px-2 py-0.5"
                        style={{
                          fontFamily: 'Special Elite, monospace',
                          background: f.tone === 'warn' ? 'rgba(122,22,18,0.12)' : 'rgba(20,16,13,0.06)',
                          color: f.tone === 'warn' ? ACCENT : '#14100d',
                          border: `1px solid ${f.tone === 'warn' ? 'rgba(122,22,18,0.35)' : 'rgba(20,16,13,0.18)'}`,
                        }}
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}

                <details className="mt-3">
                  <summary
                    className="cursor-pointer text-[13px] uppercase tracking-[0.2em] text-[#14100d]/70 font-bold inline-block"
                    style={{ fontFamily: 'Special Elite, monospace' }}
                  >
                    Full record ▾
                  </summary>
                  <dl
                    className="mt-2 grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[12px] leading-[1.65]"
                    style={{ fontFamily: 'Special Elite, monospace' }}
                  >
                    {cashValue && cashValue !== amount && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Cash value</dt><dd className="text-[#14100d]">{cashValue}</dd></>)}
                    {nonCashValue && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Non cash value</dt><dd className="text-[#14100d]">{nonCashValue}</dd></>)}
                    {receivedDate && receivedDate !== acceptedDate && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Received</dt><dd className="text-[#14100d]">{receivedDate}</dd></>)}
                    {reportedDate && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Reported to EC</dt><dd className="text-[#14100d]">{reportedDate}</dd></>)}
                    {mannerInWhichMade && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Manner</dt><dd className="text-[#14100d]">{mannerInWhichMade}</dd></>)}
                    {purposeOfVisit && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Purpose of visit</dt><dd className="text-[#14100d]">{purposeOfVisit}</dd></>)}
                    {positionStandingFor && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Position standing for</dt><dd className="text-[#14100d]">{positionStandingFor}</dd></>)}
                    {campaigningName && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Campaigning name</dt><dd className="text-[#14100d]">{campaigningName}</dd></>)}
                    {accountingUnitName && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Accounting unit</dt><dd className="text-[#14100d]">{accountingUnitName}</dd></>)}
                    {donationAction && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Action</dt><dd className="text-[#14100d]">{donationAction}</dd></>)}
                    {impermissibilityReason && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]" style={{ color: ACCENT }}>Impermissibility</dt><dd style={{ color: ACCENT }}>{impermissibilityReason}</dd></>)}
                    {concealmentDetails && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]" style={{ color: ACCENT }}>Concealment</dt><dd style={{ color: ACCENT }}>{concealmentDetails}</dd></>)}
                    {trustName && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Trust name</dt><dd className="text-[#14100d]">{trustName}</dd></>)}
                    {trustCreatorName && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Trust creator</dt><dd className="text-[#14100d]">{trustCreatorName}{trustCreatorStatus ? ` · ${trustCreatorStatus}` : ''}</dd></>)}
                    {trustCreatedDate && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Trust created</dt><dd className="text-[#14100d]">{trustCreatedDate}</dd></>)}
                    {companyRegNumber && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Company no.</dt><dd className="text-[#14100d]">{companyRegNumber}</dd></>)}
                    {addressParts.length > 0 && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Donor address</dt><dd className="text-[#14100d]">{addressParts.join(', ')}</dd></>)}
                    {explanatoryNotes && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">EC notes</dt><dd className="text-[#14100d] whitespace-pre-line">{explanatoryNotes}</dd></>)}
                    {ecRef && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">EC reference</dt><dd className="text-[#14100d] font-mono">{ecRef}</dd></>)}
                  </dl>
                </details>
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
