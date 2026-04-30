import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import TransparencyClient from './TransparencyClient'

export const revalidate = 3600

// Route slug → { display title, Supabase table name, optional date column }.
// NOTE: route 'appgs' maps to Supabase table 'appg_register' — the table name in
// Supabase, route name preserved per spec.
// `orderBy` is per-section because each table's date column has a different name;
// omitted for sections whose tables have no natural date column or are empty.
const SECTIONS: Record<string, { title: string; table: string; orderBy?: string }> = {
  'ministers-meetings':  { title: "Ministers' Meetings",                table: 'ministers_meetings',   orderBy: 'meeting_date' },
  'lobbyists':           { title: 'Lobbyist Register',                  table: 'lobbyist_register' },
  'appgs':               { title: 'All-Party Parliamentary Groups',     table: 'appg_register' },
  'hospitality':         { title: "Ministers' Hospitality",             table: 'ministers_hospitality', orderBy: 'hospitality_date' },
  'revolving-door':      { title: 'Revolving Door',                     table: 'revolving_door',       orderBy: 'approval_date' },
  'donations':           { title: 'Political Donations',                table: 'political_donations',  orderBy: 'received_date' },
  'contracts':           { title: 'Government Contracts',               table: 'government_contracts', orderBy: 'awarded_date' },
  'companies':           { title: 'Companies House',                    table: 'companies_house' },
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

  // Build-time visibility: log row count (and any error) for each section.
  // Visible in Vercel deployment logs when this page is statically generated.
  if (error) {
    console.error(`[transparency/${section}] supabase error querying '${config.table}':`, error.message || error)
  } else {
    console.log(`[transparency/${section}] table '${config.table}' returned ${rows?.length ?? 0} rows`)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        <Link href="/transparency" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          ← Transparency Hub
        </Link>

        <h1 className="text-3xl font-bold mb-6" style={{ color: '#60a5fa' }}>{config.title}</h1>

        <TransparencyClient rows={rows || []} sectionTitle={config.title} section={section} />
      </main>
    </div>
  )
}
