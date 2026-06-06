import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DossierShell from '../../components/DossierShell'
import Pagination from '../../components/Pagination'
import TransparencyClient from './TransparencyClient'

export const revalidate = 3600

const ACCENT = '#6b2417'
const PAGE_LIMIT = 100   // rows per page

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
    description: `${config.title}: public record data for UK government transparency.`,
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

  // Donations uses server-side search; all other sections ignore q.
  const searchTerm = section === 'donations' && q?.trim() ? q.trim() : null

  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
  const from = (page - 1) * PAGE_LIMIT
  const to = from + PAGE_LIMIT - 1

  // Total count (with search filter applied for donations).
  let countQ = supabase.from(config.table).select('*', { count: 'exact', head: true })
  if (searchTerm) {
    const like = `%${searchTerm}%`
    countQ = countQ.or(`donor_name.ilike.${like},recipient_name.ilike.${like}`)
  }
  const { count: total } = await countQ

  // Data rows — server-side paginated via .range().
  let dataQ = supabase.from(config.table).select('*').range(from, to)
  if (config.orderBy) dataQ = dataQ.order(config.orderBy, { ascending: false, nullsFirst: false })
  if (searchTerm) {
    const like = `%${searchTerm}%`
    dataQ = dataQ.or(`donor_name.ilike.${like},recipient_name.ilike.${like}`)
  }
  const { data: rows, error } = await dataQ

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / PAGE_LIMIT))
  const baseUrl = `/transparency/${section}`
  const qPart = searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''
  const prevHref = page > 1 ? `${baseUrl}?page=${page - 1}${qPart}` : null
  const nextHref = page < totalPages ? `${baseUrl}?page=${page + 1}${qPart}` : null

  if (error) {
    console.error(`[transparency/${section}] supabase error querying '${config.table}':`, error.message || error)
  }

  const rowCount = rows?.length ?? 0
  const totalCount = total ?? 0

  return (
    <DossierShell>
      <a
        href="/transparency"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      >
        ← Transparency Hub
      </a>

      <header style={{ marginBottom: '5%' }}>
        <p style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 500, marginBottom: '12px', color: ACCENT }}>
          Dataset
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          {config.title}
        </h1>
        <p className="text-[#14100d] text-[14px] leading-[1.7] max-w-2xl">
          {searchTerm ? (
            <>
              <span className="font-mono text-[#14100d] text-base font-bold">{rowCount.toLocaleString()}</span>
              {' '}result{rowCount === 1 ? '' : 's'} for &ldquo;{searchTerm}&rdquo;
              {totalCount > rowCount && (
                <> showing first {rowCount.toLocaleString()} of {totalCount.toLocaleString()} matches</>
              )}
              .{' '}
              <Link href={`/transparency/${section}`} className="underline hover:text-[#14100d]">
                Clear search
              </Link>
            </>
          ) : (
            <>
              <span className="font-mono text-[#14100d] text-base font-bold">{totalCount.toLocaleString()}</span>
              {' '}record{totalCount === 1 ? '' : 's'} in this dataset.
              {totalPages > 1 && (
                <> Showing rows {from + 1}-{Math.min(to + 1, totalCount)} (page {page} of {totalPages}).</>
              )}
              {section === 'donations' && ' Search by donor or recipient name to filter.'}
            </>
          )}
        </p>
        {section === 'revolving-door' && (
          <p className="text-[#14100d] text-[14px] leading-[1.7] max-w-2xl mt-6">
            The revolving door refers to senior government officials and ministers leaving public service to take up roles in the private sector, often in industries they previously regulated or had influence over. These appointments are reviewed by the Advisory Committee on Business Appointments (ACOBA), which can attach conditions such as waiting periods or restrictions on lobbying former colleagues.
          </p>
        )}
        {section === 'donations' && (
          <div className="mt-6 flex flex-wrap gap-3 text-[13px]">
            <Link href="/donors" className="font-mono underline" style={{ color: ACCENT }}>Donor index &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/foreign" className="font-mono underline" style={{ color: ACCENT }}>Foreign-source map &rarr;</Link>
            <span className="opacity-30">·</span>
            <Link href="/donations/late-disclosed" className="font-mono underline" style={{ color: ACCENT }}>Late-disclosed register &rarr;</Link>
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
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl={baseUrl}
        qsExtra={searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''}
      />
    </DossierShell>
  )
}
