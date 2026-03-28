import { supabase } from '@/lib/supabase'
import MPsClient from './MPsClient'
import Navigation from '../components/Navigation'

export const revalidate = 3600

export default async function MPsPage() {
  const { data: mps, error } = await supabase
    .from('mps')
    .select('*')
    .eq('current_member', true)
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching MPs:', error)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      <MPsClient mps={mps || []} />
    </div>
  )
}
