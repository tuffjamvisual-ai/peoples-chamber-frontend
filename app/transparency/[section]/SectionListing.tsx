import PageSources from '@/app/components/PageSources';
import { companiesHouseUrl, companyNumberAsFiled } from '@/lib/companies-house';
import { supabase } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import { PAGE_LIMIT, SECTIONS, cleanSearch, dayKey, sectionCount, sectionRows, sectionTags } from './sectionData'
import Link from 'next/link'
import OpenGovShell from '../../components/OpenGovShell'
import Pagination from '../../components/Pagination'
import TransparencyClient from './TransparencyClient'
import { PHONE } from '@/lib/breakpoints'
import { SubFold } from '../../components/PhoneFolds'
import BackLink from '@/app/components/BackLink';
import { cachedQuery, tagged } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

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

// The list body (F04 batch 3): page 1 at /transparency/[section], later pages at /transparency/[section]/page/[n] (both static,
// reading only inside the tagged data cache), and a search at /transparency/[section]/search, which reads per request and
// passes what it found (an A16 exception).
export default async function SectionListing({ section, page, q, searched }: {
  section: string
  page: number
  q: string | null
  searched?: { total: number; rows: Record<string, any>[] } // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const config = SECTIONS[section]
  if (!config) notFound()
  const searchTerm = cleanSearch(section, q)
  const from = (page - 1) * PAGE_LIMIT
  // F05 (ENTRY 134; Cowork ENTRY 181; T2's f05-exact.md): the list's count and each page in the table's tagged data cache.
  const key = dayKey(section)
  const total = searched ? searched.total : await tagged(['transparency-count-v2', section, key], sectionTags(section), () => sectionCount(section, null))
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const baseUrl = `/transparency/${section}`
  // Each page's address: a path without a search (F04 batch 3), the ?q= address with one (the rewrite serves it).
  const pageHref = (n: number) => searchTerm ? `${baseUrl}?${n > 1 ? `page=${n}&` : ''}q=${encodeURIComponent(searchTerm)}` : n > 1 ? `${baseUrl}/page/${n}` : baseUrl
  // Past the last page: a temporary redirect to the last page (it may exist later).
  if (page > totalPages) redirect(pageHref(totalPages))
  const rows = searched ? searched.rows : await tagged(['transparency-page-v2', section, page, key], sectionTags(section), () => sectionRows(section, null, page))

  const range = section === 'revolving-door' ? await revolvingDoorRange() : null

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
            {' '}The notices are read every day from Find a Tender&rsquo;s open data service (in the Sources fold at the foot of the page). Notices published only on Contracts Finder, where many lower value contracts appear, are not included.
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
        hrefFor={pageHref}
      />
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside, in the page's one Sources fold. */}
      {/* Donations: the Companies House record of each company donor listed on this page, only here (Cowork ENTRY 422 GO item 4);
          the rows show the number as plain text. PageSources keeps one entry per address. */}
      <PageSources sources={section === 'revolving-door'
        ? REVOLVING_DOOR_SOURCES.map((src) => ({ label: src.label, href: src.url }))
        : section === 'donations'
          ? (rows || []).filter((r) => typeof r.company_registration_number === 'string' && (r.company_registration_number as string).trim())
              .map((r) => {
                const n = (r.company_registration_number as string).trim();
                return { label: `Companies House record for ${(r.donor_name as string) || 'the donor'} (company ${companyNumberAsFiled(n)})`, href: companiesHouseUrl(n) };
              })
          : section === 'contracts'
            // Cowork ENTRY 423 follow up (ENTRY 410 rule): the open data service the note named, only here.
            ? [{ label: 'Contracts: Find a Tender and its open data service (OCDS)', href: 'https://www.find-tender.service.gov.uk/' }]
            : []} />
    </OpenGovShell>
  )
}
