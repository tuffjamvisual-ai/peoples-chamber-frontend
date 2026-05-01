import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import TransparencyClient from './TransparencyClient'

export const revalidate = 3600

const ACCENT = '#60a5fa'

// Route slug → { display title, Supabase table name, optional date column }.
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
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  const config = SECTIONS[section]
  if (!config) notFound()

  const baseQuery = supabase.from(config.table).select('*').limit(2000)
  const finalQuery = config.orderBy
    ? baseQuery.order(config.orderBy, { ascending: false, nullsFirst: false })
    : baseQuery
  const { data: rows, error } = await finalQuery

  if (error) {
    console.error(`[transparency/${section}] supabase error querying '${config.table}':`, error.message || error)
  } else {
    console.log(`[transparency/${section}] table '${config.table}' returned ${rows?.length ?? 0} rows`)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link
          href="/transparency"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-gray-200 hover:text-white mb-8 transition-colors"
        >
          ← Transparency Hub
        </Link>

        <header className="border-b border-[#1e2a3a] pb-10 mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: ACCENT }}>
            Dataset
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight text-white mb-4">
            {config.title}
          </h1>
          <p className="text-gray-200 text-[14px] leading-[1.7] max-w-2xl">
            <span className="font-mono text-white text-base font-bold">{(rows?.length ?? 0).toLocaleString()}</span>{' '}
            record{rows?.length === 1 ? '' : 's'} in this dataset. Use the search to filter live.
          </p>
        </header>

        <TransparencyClient rows={rows || []} sectionTitle={config.title} section={section} />
      </main>
    </div>
  )
}
