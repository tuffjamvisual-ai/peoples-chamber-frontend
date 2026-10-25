import type { Metadata } from 'next'
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import OpenGovShell from '../../components/OpenGovShell'
import Pagination from '../../components/Pagination'
import TransparencyClient from './TransparencyClient'

export const revalidate = 3600

const ACCENT = '#6b2417'
const PAGE_LIMIT = 50    // rows per page: the only pager on these lists (23 Oct 2026)
const OCID_RE = /^ocds-[a-z0-9]+-[A-Za-z0-9-]+$/   // as app/contracts/[ocid]/page.tsx accepts

// Revolving door coverage, read from the data (25 Oct 2026, report 63) rather than written into the intro. ACOBA closed
// on 13 October 2025; rows dated after that come from the Independent Adviser on Ministerial Standards' published
// advice for former ministers (app/api/sync-ministers-bars), rows up to it from ACOBA (app/api/sync-revolving-door).
const ACOBA_CLOSED = '2025-10-13'
const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

async function revolvingDoorRange() {
  const one = async (asc: boolean, cmp?: ['lte' | 'gt', string]) => {
    let q = supabase.from('revolving_door').select('approval_date').not('approval_date', 'is', null).order('approval_date', { ascending: asc }).limit(1)
    if (cmp) q = cmp[0] === 'lte' ? q.lte('approval_date', cmp[1]) : q.gt('approval_date', cmp[1])
    const { data, error } = await q
    if (error) throw new Error(`revolving_door range: ${error.message}`)
    return (data?.[0]?.approval_date as string | undefined) ?? null
  }
  const [first, latest, lastAcoba, firstAfter] = await Promise.all([one(true), one(false), one(false, ['lte', ACOBA_CLOSED]), one(true, ['gt', ACOBA_CLOSED])])
  return { first, latest, lastAcoba, firstAfter }
}

// 'lobbyists' slug removed 2026-06-02. 'companies' slug removed
// 2026-06-03 — see comments in app/transparency/page.tsx. Both URLs
// now return 404 via the !config guard in generateMetadata + the
// page body. DB tables (lobbyist_register, companies_house) preserved.
const SECTIONS: Record<string, { title: string; table: string; orderBy?: string }> = {
  'ministers-meetings': { title: "Ministers' Meetings", table: 'ministers_meetings', orderBy: 'meeting_date' },
  'appgs':              { title: 'All Party Parliamentary Groups', table: 'appg_register' },
  'hospitality':        { title: "Ministers' Hospitality", table: 'ministers_hospitality', orderBy: 'hospitality_date' },
  'revolving-door':     { title: 'Revolving Door', table: 'revolving_door', orderBy: 'approval_date' },
  'donations':          { title: 'Political Donations', table: 'political_donations', orderBy: 'received_date' },
  'contracts':          { title: 'Government Contracts', table: 'government_contracts', orderBy: 'awarded_date' },
}

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }))
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params
  const config = SECTIONS[section]
  if (!config) return { title: 'Transparency' }
  return {
    title: config.title,
    description: PAGE_DESCRIPTIONS[`/transparency/${section}`] ?? `${config.title}: public record data for UK government transparency.`,
    alternates: { canonical: `/transparency/${section}` },
  }
}

export default async function TransparencySectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { section } = await params
  const { q, page: pageParam } = await searchParams
  const config = SECTIONS[section]
  if (!config) notFound()

  // Every section searches its whole table on the server. Characters that would break the
  // filter syntax are dropped from the search words.
  const SEARCH_COLS: Record<string, string[]> = {
    donations: ['donor_name', 'recipient_name'],
    contracts: ['supplier', 'title', 'dept_slug'],
    'ministers-meetings': ['minister_name', 'organisation', 'purpose'],
    hospitality: ['minister_name', 'donor', 'description'],
    'revolving-door': ['person_name', 'organisation', 'new_role', 'previous_role'],
    appgs: ['appg_name', 'chair', 'purpose'],
  }
  const cleaned = (q || '').replace(/[,()*%"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
  const searchTerm = cleaned && SEARCH_COLS[section] ? cleaned : null
  const searchFilter = searchTerm ? SEARCH_COLS[section].map((c) => `${c}.ilike.%${searchTerm}%`).join(',') : null

  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
  const from = (page - 1) * PAGE_LIMIT
  const to = from + PAGE_LIMIT - 1

  // Ministerial meetings are a retrospective register, so any meeting dated
  // in the future is a source typo — hide those rows (data is corrected from
  // the `quarter` field on sync, this is the display safety net).
  const todayIso = new Date().toISOString().slice(0, 10)

  // Total count (with search filter applied for donations).
  let countQ = supabase.from(config.table).select('*', { count: 'exact', head: true })
  if (searchFilter) countQ = countQ.or(searchFilter)
  if (section === 'ministers-meetings') countQ = countQ.lte('meeting_date', todayIso)
  if (section === 'hospitality') countQ = countQ.lte('hospitality_date', todayIso)
  const { count: total } = await countQ

  // Data rows — server-side paginated via .range().
  let dataQ = supabase.from(config.table).select('*').range(from, to)
  if (config.orderBy) dataQ = dataQ.order(config.orderBy, { ascending: false, nullsFirst: false })
  if (searchFilter) dataQ = dataQ.or(searchFilter)
  if (section === 'ministers-meetings') dataQ = dataQ.lte('meeting_date', todayIso)
  if (section === 'hospitality') dataQ = dataQ.lte('hospitality_date', todayIso)
  const { data: rows, error } = await dataQ

  const range = section === 'revolving-door' ? await revolvingDoorRange() : null

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / PAGE_LIMIT))
  const baseUrl = `/transparency/${section}`
  const qPart = searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''
  const prevHref = page > 1 ? `${baseUrl}?page=${page - 1}${qPart}` : null
  const nextHref = page < totalPages ? `${baseUrl}?page=${page + 1}${qPart}` : null

  if (error) {
    console.error(`[transparency/${section}] supabase error querying '${config.table}':`, error.message || error)
  }

  // Contracts (23 Oct 2026): an entry's title links to /contracts/<ocid> only when that OCID has rows in
  // contract_notices, checked for the whole page in one call (migration 2026-10-23h). If the check fails the list
  // still shows, without the links.
  let linkedOcids: string[] = []
  if (section === 'contracts' && rows?.length) {
    const ocids = [...new Set(rows.map((r) => r.ocid).filter((o): o is string => typeof o === 'string' && OCID_RE.test(o)))]
    if (ocids.length) {
      const { data: found, error: ocidErr } = await supabase.rpc('contract_ocids_with_notices', { p_ocids: ocids })
      if (ocidErr) console.error('[transparency/contracts] contract_ocids_with_notices:', ocidErr.message)
      else linkedOcids = (found as string[] | null) ?? []
    }
  }

  const rowCount = rows?.length ?? 0
  const totalCount = total ?? 0

  return (
    <OpenGovShell pageStamp="Transparency">
      <a
        href="/transparency"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      >
        ← Accountability
      </a>

      <header style={{ marginBottom: '5%' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 500, marginBottom: '12px', color: ACCENT }}>
          Dataset
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          {config.title}
        </h1>
        <p className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl">
          {searchTerm ? (
            <>
              <span className="font-mono text-[#14100d] text-base font-bold">{totalCount.toLocaleString()}</span>
              {' '}record{totalCount === 1 ? '' : 's'} match &ldquo;{searchTerm}&rdquo;
              {totalPages > 1 && rowCount > 0 && (
                <>, showing {from + 1} to {from + rowCount} (page {page} of {totalPages})</>
              )}
              .{' '}
              <Link href={`/transparency/${section}`} className="underline hover:text-[#14100d]">
                Clear search
              </Link>
            </>
          ) : (
            <>
              <span className="font-mono text-[#14100d] text-base font-bold">{totalCount.toLocaleString()}</span>
              {' '}{section === 'contracts' ? 'notice' : 'record'}{totalCount === 1 ? '' : 's'} in this dataset.
              {totalPages > 1 && rowCount > 0 && (
                <> Showing rows {from + 1} to {from + rowCount} (page {page} of {totalPages}).</>
              )}
              {' '}Search below to look through every record.
            </>
          )}
        </p>
        {section === 'revolving-door' && (
          <p className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl mt-6">
            The revolving door refers to senior government officials and ministers leaving public service to take up roles in the private sector, often in industries they previously regulated or had influence over. Until it closed on 13 October 2025 these appointments were reviewed by the Advisory Committee on Business Appointments (ACOBA), which could attach conditions such as waiting periods or restrictions on lobbying former colleagues. Responsibility has since passed to the Civil Service Commission for senior officials and special advisers, and to the Independent Adviser on Ministerial Standards for former ministers.
          </p>
        )}
        {section === 'revolving-door' && range?.first && range.latest && (
          <p className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl mt-4">
            {range.firstAfter
              ? <>Records from {longDate(range.first)} to {longDate(range.latest)}. Those up to {longDate(range.lastAcoba ?? range.first)} are from the Advisory Committee on Business Appointments; those from {longDate(range.firstAfter)} are the advice the Independent Adviser on Ministerial Standards has published for former ministers. Advice for senior officials and special advisers since ACOBA closed is not included yet.</>
              : <>Records from {longDate(range.first)} to {longDate(range.latest)}, from the Advisory Committee on Business Appointments.</>}
          </p>
        )}
        {section === 'appgs' && (
          <>
            <p className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl mt-6">
              All Party Parliamentary Groups are informal groups of MPs and peers from different parties, formed around a shared interest, whether a country, an industry, a medical condition or a cause. They have no formal powers and are not select committees, but they hold meetings, publish reports and give their subject a standing platform inside Parliament. The daily running of a group is often handled by a secretariat, an outside body that supplies the staff, money and administration. When that secretariat is a charity or a university the arrangement is usually unremarkable. When it is a lobbying firm or a company, the group becomes a paid channel for outside interests to reach lawmakers, with MPs serving as its officers. Groups must register their officers, their funding and any benefits above a set threshold, which is what the register below records.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-[15px]">
              <Link href="/secretariats" className="font-mono underline" style={{ color: ACCENT }}>Who runs the groups &rarr;</Link>
              <span className="opacity-30">·</span>
              <Link href="/appg-funders" className="font-mono underline" style={{ color: ACCENT }}>Who funds them &rarr;</Link>
            </div>
          </>
        )}
        {section === 'contracts' && (
          <p className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl mt-6">
            Each row is a notice published on Find a Tender, not a separate contract: one contract can appear as an award, its contract details and later changes. A framework&rsquo;s value is the most that every supplier on it could be paid: potential value, not spending. Do not add these values up.
            {' '}The notices are read every day from Find a Tender&rsquo;s open data service (find-tender.service.gov.uk). Notices published only on Contracts Finder, where many lower value contracts appear, are not included.
          </p>
        )}
        {section === 'donations' && (
          <p className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl mt-6">
            This is Electoral Commission data on money given to parties and candidates. It is separate from the{' '}
            <Link href="/transparency/register-of-interests" className="underline" style={{ color: ACCENT }}>
              Register of Members&rsquo; Financial Interests
            </Link>
            , which is what MPs themselves declare to Parliament (gifts, employment, property and the like).
          </p>
        )}
        {section === 'donations' && (
          <div className="mt-6 flex flex-wrap gap-3 text-[15px]">
            <Link href="/donors" className="font-mono underline" style={{ color: ACCENT }}>Donor index &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/foreign" className="font-mono underline" style={{ color: ACCENT }}>Foreign source map &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/late-disclosed" className="font-mono underline" style={{ color: ACCENT }}>Late disclosed register &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/trust-funded" className="font-mono underline" style={{ color: ACCENT }}>Trust routed &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/impermissible" className="font-mono underline" style={{ color: ACCENT }}>Impermissible &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/bequest" className="font-mono underline" style={{ color: ACCENT }}>Bequests &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/leadership-contests" className="font-mono underline" style={{ color: ACCENT }}>Leadership race money &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/sponsored-visits" className="font-mono underline" style={{ color: ACCENT }}>Sponsored visits &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/government-contractors" className="font-mono underline" style={{ color: ACCENT }}>Contractors who donate &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/constituencies" className="font-mono underline" style={{ color: ACCENT }}>By constituency &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/double-dip" className="font-mono underline" style={{ color: ACCENT }}>Double dip &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/explainers/donations" className="font-mono underline" style={{ color: ACCENT }}>What the data means &rarr;</Link>
          </div>
        )}
      </header>

      <TransparencyClient
        rows={rows || []}
        sectionTitle={config.title}
        section={section}
        total={totalCount}
        searchQuery={searchTerm ?? ''}
        linkedOcids={linkedOcids}
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl={baseUrl}
        qsExtra={searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''}
      />
    </OpenGovShell>
  )
}
