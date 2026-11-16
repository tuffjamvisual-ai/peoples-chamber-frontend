import { titleWithin } from '@/lib/seo-title';
import PageSources from '@/app/components/PageSources';
import type { Metadata } from 'next'
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions'
import { supabase } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import OpenGovShell from '../../components/OpenGovShell'
import Pagination from '../../components/Pagination'
import TransparencyClient from './TransparencyClient'
import { PHONE } from '@/lib/breakpoints'
import { SubFold } from '../../components/PhoneFolds'
import BackLink from '@/app/components/BackLink';
import { cachedQuery, tagged } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

const ACCENT = '#7a1612'
// The donations dataset's related pages: in "Explore this dataset" after the first results, at every width (UX2c, UX4e).
const DONATION_LINKS: { href: string; label: string }[] = [
  { href: '/donors', label: 'Donor index' },
  { href: '/donations/foreign', label: 'Foreign source map' },
  { href: '/donations/late-disclosed', label: 'Late disclosed register' },
  { href: '/donations/trust-funded', label: 'Trust routed' },
  { href: '/donations/impermissible', label: 'Impermissible' },
  { href: '/donations/bequest', label: 'Bequests' },
  { href: '/donations/leadership-contests', label: 'Leadership race money' },
  { href: '/donations/sponsored-visits', label: 'Sponsored visits' },
  { href: '/donations/government-contractors', label: 'Contractors who donate' },
  { href: '/donations/constituencies', label: 'By constituency' },
  { href: '/donations/double-dip', label: 'Double dip' },
  { href: '/explainers/donations', label: 'What the data means' },
]
const PAGE_LIMIT = 50    // rows per page: the only pager on these lists (23 Oct 2026)
const OCID_RE = /^ocds-[a-z0-9]+-[A-Za-z0-9-]+$/   // as app/contracts/[ocid]/page.tsx accepts

// Revolving door coverage, read from the data (25 Oct 2026, report 63) rather than written into the intro. ACOBA closed
// on 13 October 2025; rows dated after that come from the Independent Adviser on Ministerial Standards' published
// advice for former ministers (app/api/sync-ministers-bars), rows up to it from ACOBA (app/api/sync-revolving-door).
const ACOBA_CLOSED = '2025-10-13'
const REVOLVING_DOOR_SOURCES = [
  { label: "ACOBA's closure, GOV.UK, 13 Oct 2025", url: 'https://www.gov.uk/government/news/closure-of-the-independent-advisory-committee-on-business-appointments-acoba' },
  { label: 'Ethics and Integrity Commission announcement, GOV.UK, 21 Jul 2025', url: 'https://www.gov.uk/government/news/ethics-and-integrity-commission-to-drive-up-standards-across-the-public-sector' },
  { label: 'ACOBA advice, GOV.UK', url: 'https://www.gov.uk/search/all?organisations%5B%5D=advisory-committee-on-business-appointments&order=updated-newest' },
  { label: 'Independent Adviser advice for former ministers, GOV.UK', url: 'https://www.gov.uk/government/publications/advice-issued-under-the-business-appointment-rules-for-ministers/advice-issued-under-the-business-appointment-rules-for-ministers' },
]
const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// A16: the first and latest dates, in the shared data cache under the revolving_door tag.
const revolvingDoorRange = () => tagged(['revolving-door-range-v1'], tableTags('revolving_door'), revolvingDoorRangeRead)
async function revolvingDoorRangeRead() {
  const oneDate = async (asc: boolean, cmp?: ['lte' | 'gt', string]) => {
    let q = supabase.from('revolving_door').select('approval_date').not('approval_date', 'is', null).order('approval_date', { ascending: asc }).limit(1)
    if (cmp) q = cmp[0] === 'lte' ? q.lte('approval_date', cmp[1]) : q.gt('approval_date', cmp[1])
    const { data, error } = await q
    if (error) throw new Error(`revolving_door range: ${error.message}`)
    return (data?.[0]?.approval_date as string | undefined) ?? null
  }
  const [first, latest, lastAcoba, firstAfter] = await Promise.all([oneDate(true), oneDate(false), oneDate(false, ['lte', ACOBA_CLOSED]), oneDate(true, ['gt', ACOBA_CLOSED])])
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
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!config) notFound()
  return {
    title: titleWithin(config.title),
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
  // '_' too (F05): a one-character wildcard in ILIKE.
  const cleaned = (q || '').replace(/[,()*%_"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
  const searchTerm = cleaned && SEARCH_COLS[section] ? cleaned : null
  const searchFilter = searchTerm ? SEARCH_COLS[section].map((c) => `${c}.ilike.%${searchTerm}%`).join(',') : null

  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
  const from = (page - 1) * PAGE_LIMIT
  const to = from + PAGE_LIMIT - 1

  // Ministerial meetings are a retrospective register, so any meeting dated
  // in the future is a source typo — hide those rows (data is corrected from
  // the `quarter` field on sync, this is the display safety net).
  const todayIso = new Date().toISOString().slice(0, 10)

  // F05 (ENTRY 134, owner approved 15 Nov 2026; Cowork ENTRY 181; T2's audit/t2-prep/f05-exact.md): the unfiltered view's
  // count and each page are read once into the table's tagged data cache, with the shown columns only, a stable order and
  // the page number capped at the last page. A search reads per request (one cache entry per visitor search would grow
  // without bound), at most one page of rows. A failed read throws, so nothing empty is cached.
  // Rows shown per section (the fields TransparencyClient.tsx reads; appgs shows every field it has, folded).
  const COLUMNS: Record<string, string> = {
    'revolving-door': 'id, person_name, previous_role, new_role, organisation, approval_date, description',
    'ministers-meetings': 'id, minister_name, minister_dept, organisation, purpose, meeting_date',
    hospitality: 'id, minister_name, minister_dept, donor, description, value, hospitality_date',
    donations: 'id, donor_name, donor_type, recipient_name, recipient_type, amount, cash_value, non_cash_value, accepted_date, received_date, reported_date, reporting_period_name, nature, donation_type_label, donation_action, manner_in_which_made, campaigning_name, company_registration_number, accounting_unit_name, addr_line, addr_town, addr_county, addr_postcode, addr_country, ec_ref, explanatory_notes, purpose_of_visit, position_standing_for, impermissibility_reason, attempted_concealment, concealment_details, trust_name, trust_creator_name, trust_creator_status, trust_created_date, is_aggregation, is_anonymous, is_bequest, is_irish_source, is_reported_pre_poll, is_sponsorship',
    contracts: 'id, ocid, title, supplier, dept_slug, description, status, value, awarded_date, updated_at',
    appgs: '*',
  }
  // Meetings and hospitality hide rows dated in the future (source typos): the cut-off day is part of the key, so the
  // cached count and page change at most once a day for those two sections, and never for the others.
  const dayKey = section === 'ministers-meetings' || section === 'hospitality' ? todayIso : ''
  const filtered = (q: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (searchFilter) q = q.or(searchFilter)
    if (section === 'ministers-meetings') q = q.lte('meeting_date', todayIso)
    if (section === 'hospitality') q = q.lte('hospitality_date', todayIso)
    return q
  }
  const countRead = async () => {
    const { count, error } = await filtered(supabase.from(config.table).select('id', { count: 'exact', head: true }))
    if (error) throw new Error(`/transparency/${section} count: ${error.message}`)
    return (count ?? 0) as number
  }
  const total = searchTerm
    ? await countRead()
    : await tagged(['transparency-count-v1', section, dayKey], tableTags(config.table), countRead)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  if (page > totalPages) redirect(`/transparency/${section}${totalPages > 1 ? `?page=${totalPages}` : ''}${searchTerm ? `${totalPages > 1 ? '&' : '?'}q=${encodeURIComponent(searchTerm)}` : ''}`)
  const pageRead = async () => {
    let q = filtered(supabase.from(config.table).select(COLUMNS[section] ?? '*').range(from, to))
    if (config.orderBy) q = q.order(config.orderBy, { ascending: false, nullsFirst: false })
    q = q.order('id', { ascending: false })
    const { data, error } = await q
    if (error) throw new Error(`/transparency/${section} rows: ${error.message}`)
    return (data ?? []) as Record<string, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  const rows = searchTerm
    ? await pageRead()
    : await tagged(['transparency-page-v1', section, page, dayKey], tableTags(config.table), pageRead)

  const range = section === 'revolving-door' ? await revolvingDoorRange() : null

  const baseUrl = `/transparency/${section}`
  const qPart = searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''
  const prevHref = page > 1 ? `${baseUrl}?page=${page - 1}${qPart}` : null
  const nextHref = page < totalPages ? `${baseUrl}?page=${page + 1}${qPart}` : null


  // Contracts (23 Oct 2026): an entry's title links to /contracts/<ocid> only when that OCID has rows in
  // contract_notices, checked for the whole page in one call (migration 2026-10-23h). If the check fails the list
  // still shows, without the links.
  let linkedOcids: string[] = []
  if (section === 'contracts' && rows?.length) {
    const ocids = [...new Set(rows.map((r) => r.ocid).filter((o): o is string => typeof o === 'string' && OCID_RE.test(o)))]
    if (ocids.length) {
      const { data: found, error: ocidErr } = await cachedQuery(['q:app/transparency/[section]/page.tsx:88680424c7', JSON.stringify([ocids])], tableTags('contract_notices'), () => supabase.rpc('contract_ocids_with_notices', { p_ocids: ocids }))
      if (ocidErr) console.error('[transparency/contracts] contract_ocids_with_notices:', ocidErr.message)
      else linkedOcids = (found as string[] | null) ?? []
    }
  }

  const rowCount = rows?.length ?? 0
  const totalCount = total ?? 0

  return (
    <OpenGovShell pageStamp="Transparency">
      <BackLink fallbackHref="/transparency" />

      <header className="tr-dhead" style={{ marginBottom: '5%' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 500, marginBottom: '12px', color: ACCENT }}>
          Dataset
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          {config.title}
        </h1>
        <p className={`${section === 'donations' && !searchTerm ? 'tr-dwide ' : ''}text-[#14100d] text-[15px] leading-[1.7] max-w-2xl`}>
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
        {/* Phones (UX3b, 10 Nov 2026): the revolving door's introduction, dates and sources in one closed native fold, so the
            search starts on the first screen (A6). From 640px up, as before. */}
        {section === 'revolving-door' && (
          <SubFold label="About the revolving door and its sources">
        {(
          <p className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl mt-6">
            The revolving door refers to senior government officials and ministers leaving public service to take up roles in the private sector, often in industries they previously regulated or had influence over. Until it closed on 13 October 2025 these appointments were reviewed by the Advisory Committee on Business Appointments (ACOBA), which could attach conditions such as waiting periods or restrictions on lobbying former colleagues. Responsibility has since passed to the Civil Service Commission for senior officials and special advisers, and to the Independent Adviser on Ministerial Standards for former ministers.
          </p>
        )}
        {range?.first && range.latest && (
          <p className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl mt-4">
            {range.firstAfter
              ? <>Records from {longDate(range.first)} to {longDate(range.latest)}. Those up to {longDate(range.lastAcoba ?? range.first)} are from the Advisory Committee on Business Appointments; those from {longDate(range.firstAfter)} are the advice the Independent Adviser on Ministerial Standards has published for former ministers. Advice for senior officials and special advisers since ACOBA closed is not included yet.</>
              : <>Records from {longDate(range.first)} to {longDate(range.latest)}, from the Advisory Committee on Business Appointments.</>}
          </p>
        )}
        {(
          // Sources (owner's approval, 25 Oct 2026, report 67): the two GOV.UK notices behind the intro, then the pages
          // the data comes from. ACOBA's advice is read from the GOV.UK search API filtered to ACOBA
          // (app/api/sync-revolving-door), shown here as the same search on GOV.UK; the Independent Adviser's advice from
          // its one GOV.UK page (app/api/sync-ministers-bars).
          <p className="text-[#14100d] text-[15px] leading-[1.6] max-w-2xl mt-3">
            Sources: {REVOLVING_DOOR_SOURCES.map((src) => src.label).join(' · ')} (in Sources at the end of the page).
          </p>
        )}
          </SubFold>
        )}
        {section === 'appgs' && (
          <>
            {/* T2 ENTRY 1 (T1-MOB batch 3, Cowork 14 Nov 2026): on phones and tablets up to 1,023px the introduction after its
                first sentence folds; from 1,024px the fold is not there and it reads as one paragraph, as before. */}
            <div className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl mt-6">
              All Party Parliamentary Groups are informal groups of MPs and peers from different parties, formed around a shared interest, whether a country, an industry, a medical condition or a cause.{' '}
              <SubFold label="About the groups" tablets>
              They have no formal powers and are not select committees, but they hold meetings, publish reports and give their subject a standing platform inside Parliament. The daily running of a group is often handled by a secretariat, an outside body that supplies the staff, money and administration. When that secretariat is a charity or a university the arrangement is usually unremarkable. When it is a lobbying firm or a company, the group becomes a paid channel for outside interests to reach lawmakers, with MPs serving as its officers. Groups must register their officers, their funding and any benefits above a set threshold, which is what the register below records.
              </SubFold>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-[15px]">
              <Link href="/secretariats" className="font-mono underline" style={{ color: ACCENT }}>Who runs the groups &rarr;</Link>
              <span>·</span>
              <Link href="/appg-funders" className="font-mono underline" style={{ color: ACCENT }}>Who funds them &rarr;</Link>
            </div>
          </>
        )}
        {section === 'contracts' && (
          // T2 ENTRY 1 (Cowork 14 Nov 2026): on phones the note after its first sentence folds; from 768px one paragraph, as before.
          <div className="text-[#14100d] text-[15px] leading-[1.7] max-w-2xl mt-6">
            Each row is a notice published on Find a Tender, not a separate contract: one contract can appear as an award, its contract details and later changes.{' '}
            <SubFold label="Values and where the notices come from">
            A framework&rsquo;s value is the most that every supplier on it could be paid: potential value, not spending. Do not add these values up.
            {' '}The notices are read every day from Find a Tender&rsquo;s open data service (find-tender.service.gov.uk). Notices published only on Contracts Finder, where many lower value contracts appear, are not included.
            </SubFold>
          </div>
        )}
        {section === 'donations' && (
          <>
          {/* At every width (UX2c phones; UX4e desktop, owner approved, 10 Nov 2026): the title, this one line source note,
              then the donor or recipient search. The record count, the note on the Register of Members' Financial Interests
              and the related pages are in "Explore this dataset" after the first results: a closed native fold on phones,
              open from 640px up. A search's own count stays here. */}
          <style>{`.tr-dwide { display: none !important; } .tr-dhead { margin-bottom: 16px !important; } .tr-explore-h { font-size: 18px; font-weight: bold; margin: 0 0 8px; } @media ${PHONE} { .tr-explore-h { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; margin: 0; } }`}</style>
          <p className="text-[#14100d] text-[15px] leading-[1.5]" style={{ margin: 0 }}>Source: the Electoral Commission&rsquo;s donations register.</p>
          </>
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

      {section === 'donations' && (
        <section aria-labelledby="tr-explore" style={{ margin: '28px 0 8px' }}>
          <h2 id="tr-explore" className="tr-explore-h">Explore this dataset</h2>
          <SubFold label={`Explore this dataset (${DONATION_LINKS.length} related pages)`}>
          {!searchTerm && (
            <p className="text-[#14100d] text-[15px] leading-[1.6]" style={{ margin: '0 0 8px' }}>
              <span className="font-mono font-bold">{totalCount.toLocaleString()}</span> records in this dataset. Search above to look through every record.
            </p>
          )}
          <p className="text-[#14100d] text-[15px] leading-[1.6]" style={{ margin: '0 0 8px' }}>
            This is Electoral Commission data on money given to parties and candidates. It is separate from the{' '}
            <Link href="/transparency/register-of-interests" className="underline" style={{ color: ACCENT }}>Register of Members&rsquo; Financial Interests</Link>
            , which is what MPs themselves declare to Parliament (gifts, employment, property and the like).
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {DONATION_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="font-mono underline text-[15px]" style={{ color: ACCENT, display: 'flex', alignItems: 'center', minHeight: '44px' }}>{l.label} &rarr;</Link>
              </li>
            ))}
          </ul>
          </SubFold>
        </section>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl={baseUrl}
        qsExtra={searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''}
      />
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside, in the page's one Sources fold. */}
      <PageSources sources={section === 'revolving-door' ? REVOLVING_DOOR_SOURCES.map((src) => ({ label: src.label, href: src.url })) : []} />
    </OpenGovShell>
  )
}
