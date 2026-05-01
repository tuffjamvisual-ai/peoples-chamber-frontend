import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import TransparencyClient from './TransparencyClient'

export const revalidate = 3600

const ACCENT = '#ffffff'
const PAGE_LIMIT = 100

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

export default async function TransparencySectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { section } = await params
  const { q } = await searchParams
  const config = SECTIONS[section]
  if (!config) notFound()

  // Donations uses server-side search; all other sections ignore q.
  const searchTerm = section === 'donations' && q?.trim() ? q.trim() : null

  // Total count (with search filter applied for donations).
  let countQ = supabase.from(config.table).select('*', { count: 'exact', head: true })
  if (searchTerm) {
    const like = `%${searchTerm}%`
    countQ = countQ.or(`donor_name.ilike.${like},recipient_name.ilike.${like}`)
  }
  const { count: total } = await countQ

  // Data rows — hard-capped at PAGE_LIMIT.
  let dataQ = supabase.from(config.table).select('*').limit(PAGE_LIMIT)
  if (config.orderBy) dataQ = dataQ.order(config.orderBy, { ascending: false, nullsFirst: false })
  if (searchTerm) {
    const like = `%${searchTerm}%`
    dataQ = dataQ.or(`donor_name.ilike.${like},recipient_name.ilike.${like}`)
  }
  const { data: rows, error } = await dataQ

  if (error) {
    console.error(`[transparency/${section}] supabase error querying '${config.table}':`, error.message || error)
  }

  const rowCount = rows?.length ?? 0
  const totalCount = total ?? 0

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link
          href="/transparency"
          className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.25em] text-white hover:text-white mb-8 transition-colors"
        >
          ← Transparency Hub
        </Link>

        <header className="border-b border-[#2e2e2e] pb-10 mb-10">
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
                {section === 'donations'
                  ? ' Search by donor or recipient name to filter.'
                  : rowCount < totalCount
                    ? ` Showing the most recent ${rowCount.toLocaleString()}. Use search to filter.`
                    : ' Use the search to filter live.'}
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
      </main>
    </div>
  )
}
