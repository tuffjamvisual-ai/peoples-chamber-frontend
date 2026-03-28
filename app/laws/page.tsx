import { supabase } from '@/lib/supabase'
import LawsClient from './LawsClient'
import Navigation from '../components/Navigation'

export const revalidate = 3600

export default async function LawsPage() {
  const { data: laws, error } = await supabase
    .from('bill')
    .select('*')
    .eq('current_stage', 'Royal Assent')
    .order('stage_date', { ascending: false })
  
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
