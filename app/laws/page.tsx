import { supabase } from '@/lib/supabase'
import LawsClient from './LawsClient'
import Navigation from '../components/Navigation'

export const revalidate = 0

export default async function LawsPage() {
  const { data: laws, error } = await supabase
    .from('bill')
    .select('*')
    .eq('is_act', true)
    .order('last_update', { ascending: false })
  
  if (error) {
    console.error('Error fetching laws:', error)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      <LawsClient laws={laws || []} />
    </div>
  )
}
