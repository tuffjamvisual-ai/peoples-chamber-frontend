'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { donorPageSlug } from '@/lib/donor-slug'
import { ecDonationSearchUrl } from '@/lib/ec-links'

type Row = Record<string, unknown>

interface Props {
  rows: Row[]
  sectionTitle: string
  section?: string
  total: number
  searchQuery: string
  linkedOcids?: string[]   // contracts: OCIDs with an on-site /contracts/<ocid> page
}

const ACCENT = '#7a1612'

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

export default function TransparencyClient({ rows, sectionTitle, section, total, searchQuery, linkedOcids }: Props) {
  const linked = useMemo(() => new Set(linkedOcids ?? []), [linkedOcids])
  // Every section searches the whole dataset on the server (the q= address), and pages on the server (?page=N, 50 a
  // page, the one set of page controls below the list). The old in-page filter only looked through the rows on screen,
  // so a search of 45,107 contracts for "Ecotricity" said "0 of 100 matching" (ChatGPT audit, 15 Oct 2026); the
  // in-page Previous/Next was a second pager inside the server page and was lost on Back (removed 23 Oct 2026).
  const PLACEHOLDER: Record<string, string> = {
    donations: 'Search by donor or recipient…',
    contracts: 'Search by supplier, buyer or contract title…',
    'ministers-meetings': 'Search by minister, organisation or purpose…',
    hospitality: 'Search by minister, giver or description…',
    'revolving-door': 'Search by person, organisation or role…',
    appgs: 'Search by group name, chair or purpose…',
  }

  if (rows.length === 0 && !searchQuery) {
    return (
      <p className="text-[#14100d] text-[15px] leading-[1.7] border-t border-[#14100d]/20 pt-8">
        No records have been synced into the {sectionTitle.toLowerCase()} table yet. The page will populate once the sync job runs.
      </p>
    )
  }

  return (
    <>
      {/* Search: a server-side form, so it covers the whole dataset. */}
      <div className="mb-8">
        <label htmlFor="transparency-search" className="block text-[15px] uppercase tracking-[0.25em] text-[#14100d] font-medium mb-2">
          Search
        </label>
        <form method="GET" className="flex flex-wrap gap-2 max-w-md">
          <input
            id="transparency-search"
            name="q"
            type="search"
            defaultValue={searchQuery}
            placeholder={PLACEHOLDER[section ?? ''] ?? 'Search…'}
            className="flex-1 min-w-0 basis-48 bg-[#14100d]/5 border border-[#14100d]/20 text-[#14100d] text-[15px] rounded-sm px-4 py-3 leading-[1.7] focus:outline-none focus:border-[#14100d] transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-3 text-[15px] uppercase tracking-[0.2em] font-mono border border-[#14100d]/20 text-[#14100d] hover:border-[#14100d] hover:text-[#14100d] transition-colors whitespace-nowrap"
          >
            Search
          </button>
        </form>
      </div>

      {rows.length === 0 && searchQuery ? (
        <p className="text-[#14100d] text-[15px] leading-[1.7] border-t border-[#14100d]/20 pt-8">
          No results found for &ldquo;{searchQuery}&rdquo;.
        </p>
      ) : section === 'revolving-door' ? (
        <>
          <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
            {rows.map((row, i) => {
              const personName = (row.person_name as string) || '(unknown)'
              const previousRole = row.previous_role as string | null
              const newRole = row.new_role as string | null
              const organisation = row.organisation as string | null
              const description = (row.description as string | null)?.trim() || null
              const approvalDate = formatUkDate(row.approval_date)
              const newRoleLine = [newRole || 'New role: pending ACOBA publication', organisation].filter(Boolean).join(' · ')
              return (
                <li key={i} className="p-5 border-l-2 border-l-[#14100d]">
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <h3 className="text-[#14100d] text-base font-bold leading-snug tracking-tight">{personName}</h3>
                    {approvalDate && (
                      <span className="text-[#14100d] text-[15px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">
                        {approvalDate}
                      </span>
                    )}
                  </div>
                  {previousRole && (
                    <p className="text-[#14100d] text-[15px] leading-[1.7] mb-1">{previousRole}</p>
                  )}
                  <p className="text-[15px] leading-[1.7] font-semibold" style={{ color: ACCENT }}>
                    {newRoleLine}
                  </p>
                  {description && (
                    <p className="text-[#14100d]/80 text-[15px] leading-[1.7] mt-1.5">{description}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      ) : section === 'ministers-meetings' ? (
        <>
          <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
            {rows.map((row, i) => {
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
                      {dept && <span className="text-[#14100d]/55 font-normal text-[15px]"> · {dept}</span>}
                    </h3>
                    {date && (
                      <span className="text-[#14100d] text-[15px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">{date}</span>
                    )}
                  </div>
                  {organisation && (
                    <p className="text-[15px] leading-[1.7] font-semibold mb-1" style={{ color: ACCENT }}>Met {organisation}</p>
                  )}
                  {purpose && (
                    <p className="text-[#14100d] text-[15px] leading-[1.7]" style={{ fontFamily: 'var(--font-special-elite), monospace' }}>{purpose}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      ) : section === 'hospitality' ? (
        <>
          <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
            {rows.map((row, i) => {
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
                      {dept && <span className="text-[#14100d]/55 font-normal text-[15px]"> · {dept}</span>}
                    </h3>
                    {date && (
                      <span className="text-[#14100d] text-[15px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">{date}</span>
                    )}
                  </div>
                  {donor && (
                    <p className="text-[15px] leading-[1.7] font-semibold mb-1" style={{ color: ACCENT }}>From {donor}</p>
                  )}
                  {(description || valueFmt) && (
                    <p className="text-[#14100d] text-[15px] leading-[1.7]" style={{ fontFamily: 'var(--font-special-elite), monospace' }}>
                      {description || ''}
                      {valueFmt && <>{description ? ' · ' : ''}{valueFmt}</>}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
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
            // The donor's page, only when /donors/<slug> can find this donor (lib/donor-slug.ts): never a link that 404s.
            const donorSlug = donorPageSlug(row.donor_name as string | null)

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
                <p className="text-[15px] text-[#14100d] leading-[1.7] mb-1" style={{ fontFamily: 'var(--font-special-elite), monospace' }}>
                  from <span className="text-[#14100d] font-semibold">{donor}</span>
                  {donorType && <span className="text-[#14100d]"> · {donorType}</span>}
                  {recipientType && <span className="text-[#14100d]"> · recipient: {recipientType}</span>}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-[#14100d] uppercase tracking-[0.15em]" style={{ fontFamily: 'var(--font-special-elite), monospace' }}>
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
                        className="text-[15px] uppercase tracking-[0.2em] font-bold px-2 py-0.5"
                        style={{
                          fontFamily: 'var(--font-special-elite), monospace',
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
                    className="cursor-pointer text-[15px] uppercase tracking-[0.2em] text-[#14100d]/70 font-bold inline-block"
                    style={{ fontFamily: 'var(--font-special-elite), monospace' }}
                  >
                    Full record ▾
                  </summary>
                  <dl
                    className="mt-2 grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[15px] leading-[1.65]"
                    style={{ fontFamily: 'var(--font-special-elite), monospace' }}
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
                    {ecRef && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">EC reference</dt><dd className="text-[#14100d] font-mono"><a href={ecDonationSearchUrl(ecRef)} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'underline' }}>{ecRef} ↗</a></dd></>)}
                    {donorSlug && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Donor profile</dt><dd className="text-[#14100d]"><Link href={`/donors/${donorSlug}`} style={{ color: ACCENT, textDecoration: 'underline' }}>{donor}</Link></dd></>)}
                  </dl>
                </details>
              </li>
            )
          })}
        </ul>
      ) : section === 'contracts' ? (
        <>
          <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
            {rows.map((row, i) => {
              const title       = (row.title as string | null) || '(untitled)'
              const supplier    = row.supplier as string | null
              const value       = formatAmount(row.value)
              const awardedDate = formatUkDate(row.awarded_date)
              const status      = (row.status as string | null)?.toLowerCase() ?? null
              const description = (row.description as string | null)?.trim() || null
              const ocid        = row.ocid as string | null
              const awardId     = row.award_id as string | null
              const contractId  = row.contract_id as string | null
              const deptSlug    = row.dept_slug as string | null
              const updatedAt   = row.updated_at as string | null
              const deptLabel   = deptSlug
                ? deptSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                : null
              const statusColour =
                status === 'active'  ? '#1a5c36' :
                status === 'pending' ? '#7a5c12' :
                /* terminated / other */ 'rgba(20,16,13,0.4)'
              const descTruncated = description && description.length > 300
                ? description.slice(0, 300) + '…'
                : description
              return (
                <li key={i} className="p-5 border-l-2 border-l-[#14100d]">
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <h3 className="text-[#14100d] text-base font-bold leading-snug tracking-tight">
                      {ocid && linked.has(ocid) ? (
                        <Link href={`/contracts/${ocid}`} className="focus-ring hover:underline" style={{ color: 'inherit', textUnderlineOffset: '3px' }}>{title}</Link>
                      ) : title}
                    </h3>
                    {awardedDate && (
                      <span className="text-[#14100d] text-[15px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">{awardedDate}</span>
                    )}
                  </div>
                  <p className="text-[15px] leading-[1.7] mb-1" style={{ fontFamily: 'var(--font-special-elite), monospace' }}>
                    {[supplier, deptLabel, value].filter(Boolean).join(' · ')}
                    {status && (
                      <span className="ml-3 text-[15px] uppercase tracking-[0.12em] font-bold" style={{ color: statusColour }}>
                        {status}
                      </span>
                    )}
                  </p>
                  {descTruncated && (
                    <p className="text-[#14100d]/75 text-[15px] leading-[1.65] mt-1.5">{descTruncated}</p>
                  )}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[15px] uppercase tracking-[0.2em] text-[#14100d]/70 font-bold inline-block" style={{ fontFamily: 'var(--font-special-elite), monospace' }}>
                      Record identifiers ▾
                    </summary>
                    <dl className="mt-2 grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[15px] leading-[1.65]" style={{ fontFamily: 'var(--font-special-elite), monospace' }}>
                      {ocid       && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">OCID</dt><dd className="text-[#14100d] font-mono break-all">{ocid}</dd></>)}
                      {awardId    && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Award ID</dt><dd className="text-[#14100d] font-mono">{awardId}</dd></>)}
                      {contractId && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Contract ID</dt><dd className="text-[#14100d] font-mono">{contractId}</dd></>)}
                      {deptSlug   && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Dept slug</dt><dd className="text-[#14100d] font-mono">{deptSlug}</dd></>)}
                      {updatedAt  && (<><dt className="text-[#14100d]/65 uppercase tracking-[0.15em]">Updated</dt><dd className="text-[#14100d]">{formatUkDate(updatedAt)}</dd></>)}
                    </dl>
                  </details>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <>
          <ul className="border border-[#14100d]/20 divide-y divide-[#14100d]/10">
            {rows.map((row, i) => {
              const { key: titleKey, value: titleValue } = pickTitle(row)
              const dateValue = pickDate(row)
              const otherEntries = Object.entries(row).filter(
                ([k, v]) => k !== titleKey && !HIDE_KEYS.has(k) && v !== null && v !== '' && !(typeof v === 'string' && v.trim() === ''),
              )

              return (
                <li key={i} className="p-5 border-l-2 border-l-transparent hover:border-l-[#14100d] transition-colors">
                  <div className="flex items-baseline justify-between gap-4 mb-3">
                    <h3 className="text-[#14100d] text-[15px] font-bold leading-snug">{titleValue}</h3>
                    {dateValue && (
                      <span className="text-[#14100d] text-[15px] font-mono whitespace-nowrap uppercase tracking-[0.15em]">
                        {dateValue}
                      </span>
                    )}
                  </div>
                  {otherEntries.length > 0 && (
                    <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[15px] leading-[1.7]">
                      {otherEntries.map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-[15px] uppercase tracking-[0.2em] text-[#14100d] font-mono pt-0.5">{k}</dt>
                          <dd className="text-[#14100d] whitespace-pre-line break-words">{formatValue(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
