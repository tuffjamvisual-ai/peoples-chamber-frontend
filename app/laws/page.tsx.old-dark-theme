import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import LawsClient from './LawsClient'
import Navigation from '../components/Navigation'

// Render on demand — large Supabase query (all Acts) hits the 60s
// build-budget under concurrent worker pressure. Same pattern as
// /bills, /departments, /earnings, /expenses.
export const dynamic = 'force-dynamic'
export const revalidate = 600

export const metadata: Metadata = {
  title: 'UK Laws — every Act of Parliament',
  description: 'Browse Acts of the UK Parliament that have received Royal Assent — searchable, filterable, with original sponsor and stage history.',
  alternates: { canonical: '/laws' },
}

export default async function LawsPage() {
  const { data: laws, error } = await supabase
    .from('bill')
    .select(
      'id, title, plain_summary, originating_house, sponsor_name, sponsor_party, sponsor_party_colour, last_update'
    )
    .eq('is_act', true)
    .order('last_update', { ascending: false })
    .range(0, 4999)

  if (error) console.error('Error fetching laws:', error)

  return (
    <div className="min-h-screen bg-[#606060]">
      <Navigation />
      <LawsClient laws={laws || []} />
    </div>
  )
}
