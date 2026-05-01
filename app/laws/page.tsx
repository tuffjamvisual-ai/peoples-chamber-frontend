import { supabase } from '@/lib/supabase'
import LawsClient from './LawsClient'
import Navigation from '../components/Navigation'

export const revalidate = 0

export default async function LawsPage() {
  const allLaws: any[] = []
  let hasMore = true
  let rangeStart = 0
  const rangeSize = 1000

  while (hasMore) {
    const { data: laws, error } = await supabase
      .from('bill')
      .select('*')
      .eq('is_act', true)
      .order('last_update', { ascending: false })
      .range(rangeStart, rangeStart + rangeSize - 1)

    if (error) {
      console.error('Error fetching laws:', error)
      break
    }

    if (!laws || laws.length === 0) {
      hasMore = false
      break
    }

    allLaws.push(...laws)

    if (laws.length < rangeSize) {
      hasMore = false
    } else {
      rangeStart += rangeSize
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />
      <LawsClient laws={allLaws} />
    </div>
  )
}
