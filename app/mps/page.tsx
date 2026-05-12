import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import MPsClient from './MPsClient'
import Navigation from '../components/Navigation'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'MPs',
  description:
    'Search and explore profiles of all 650 current Members of Parliament including voting records, financial interests and contact details.',
  alternates: { canonical: '/mps' },
}

export default async function MPsPage() {
  const { data: mps, error } = await supabase
    .from('mps')
    .select('*')
    .eq('current_member', true)
    .order('name', { ascending: true })

  if (error) console.error('Error fetching MPs:', error)

  return (
    <div className="min-h-screen bg-[#505050] text-white">
      <Navigation />
      <MPsClient mps={mps || []} />
    </div>
  )
}
