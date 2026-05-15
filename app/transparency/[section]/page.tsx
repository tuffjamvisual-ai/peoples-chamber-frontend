import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import TransparencyClient from './TransparencyClient'

export const revalidate = 3600

const ACCENT = '#ffffff'
const PAGE_LIMIT = 100   // rows per page

const SECTIONS: Record<string, { title: string; table: string; orderBy?: string }> = {
  'ministers-meetings': { title: "Ministers' Meetings", table: 'ministers_meetings', orderBy: 'meeting_date' },
  'lobbyists':          { title: 'Lobbyist Register', table: 'lobbyist_register' },
  'appgs':              { title: 'All-Party Parliamentary Groups', table: 'appg_register' },
  'hospitality':        { title: "Ministers' Hospitality", table: 'ministers_hospitality', orderBy: 'hospitality_date' },
  'revolving-door':     { title: 'Revolving Door', table: 'revolving_door', orderBy: 'approval_date' },
  'donations':          { title: 'Political Donations', table: 'political_donations', orderBy: 'received_date' },
  'contracts':          { title: 'Government Contracts', table: 'government_contracts', orderBy: 'awarded_date' },
  'companies':          { title: 'Companies House', table: 'companies_house' },
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
    description: `${config.title} — public-record data for UK government transparency.`,
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
    <div className="min-h-screen bg-[#606060] text-white">
      <Navigation />
      <main className="bg-[#505050] shadow-[0_0_40px_rgba(0,0,0,0.4)] max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link
          href="/transparency"
          className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.25em] text-white hover:text-white mb-8 transition-colors"
        >
          ← Transparency Hub
        </Link>

        <header className="border-b border-[#5a5a5a] pb-10 mb-10">
          <p className="text-[13px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: ACCENT }}>
            Dataset
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white mb-4">
            {config.title}
          </h1>
          <p className="text-white text-[14px] leading-[1.7] max-w-2xl">
            {searchTerm ? (
              <>
                <span className="font-mono text-white text-base font-bold">{rowCount.toLocaleString()}</span>
                {' '}result{rowCount === 1 ? '' : 's'} for &ldquo;{searchTerm}&rdquo;
                {totalCount > rowCount && (
                  <> — showing first {rowCount.toLocaleString()} of {totalCount.toLocaleString()} matches</>
                )}
                .{' '}
                <Link href={`/transparency/${section}`} className="underline hover:text-white">
                  Clear search
                </Link>
              </>
            ) : (
              <>
                <span className="font-mono text-white text-base font-bold">{totalCount.toLocaleString()}</span>
                {' '}record{totalCount === 1 ? '' : 's'} in this dataset.
                {totalPages > 1 && (
                  <> Showing rows {from + 1}–{Math.min(to + 1, totalCount)} (page {page} of {totalPages}).</>
                )}
                {section === 'donations' && ' Search by donor or recipient name to filter.'}
              </>
            )}
          </p>
          {section === 'revolving-door' && (
            <p className="text-white text-[14px] leading-[1.7] max-w-2xl mt-6">
              The revolving door refers to senior government officials and ministers leaving public service to take up roles in the private sector — often in industries they previously regulated or had influence over. These appointments are reviewed by the Advisory Committee on Business Appointments (ACOBA), which can attach conditions such as waiting periods or restrictions on lobbying former colleagues.
            </p>
          )}
        </header>

        <TransparencyClient
          rows={rows || []}
          sectionTitle={config.title}
          section={section}
          total={totalCount}
          searchQuery={searchTerm ?? ''}
        />

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Pagination">
            {prevHref ? (
              <Link href={prevHref} className="px-3 py-1.5 bg-[#404040] text-white rounded text-sm hover:bg-[#505050] transition-colors">
                ← Previous
              </Link>
            ) : (
              <span className="px-3 py-1.5 bg-[#404040] text-[#888] rounded text-sm opacity-50">← Previous</span>
            )}
            <span className="px-4 py-1.5 bg-[#353535] text-white rounded text-sm font-mono border border-[#5a5a5a]">
              {page} / {totalPages}
            </span>
            {nextHref ? (
              <Link href={nextHref} className="px-3 py-1.5 bg-[#404040] text-white rounded text-sm hover:bg-[#505050] transition-colors">
                Next →
              </Link>
            ) : (
              <span className="px-3 py-1.5 bg-[#404040] text-[#888] rounded text-sm opacity-50">Next →</span>
            )}
          </nav>
        )}
      </main>
    </div>
  )
}
