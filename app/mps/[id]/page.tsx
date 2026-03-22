import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import { notFound } from 'next/navigation'
import MPProfileClient from './MPProfileClient'

export const revalidate = 3600

// Generate static pages for all MPs at build time
export async function generateStaticParams() {
  const { data: mps } = await supabase
    .from('mps')
    .select('member_id')
    .eq('current_member', true)
  
  return (mps || []).map((mp) => ({
    id: mp.member_id.toString()
  }))
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MPProfilePage({ params }: PageProps) {
  const resolvedParams = await params
  const memberId = parseInt(resolvedParams.id)
  
  // Fetch MP data server-side
  const { data: mp } = await supabase
    .from('mps')
    .select('*')
    .eq('member_id', memberId)
    .single()
  
  if (!mp) notFound()

  // Fetch contact info
  const { data: contact } = await supabase
    .from('mp_contact')
    .select('*')
    .eq('member_id', memberId)
    .single()

  // Fetch biography
  const { data: bio } = await supabase
    .from('mp_biography')
    .select('*')
    .eq('member_id', memberId)
    .single()

  // Fetch sponsored bills
  const { data: sponsoredBills } = await supabase
    .from('bill')
    .select('*')
    .eq('sponsor_name', mp.name)
    .order('created_at', { ascending: false })

  // Fetch voting records
  const { data: votes } = await supabase
    .from('mp_division_votes')
    .select('*')
    .eq('member_id', memberId)
    .order('division_date', { ascending: false })

  // Fetch registered interests
  const { data: interests } = await supabase
    .from('mp_registered_interests')
    .select('*')
    .eq('member_id', memberId)
    .order('category_sort_order', { ascending: true })

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        <Link 
          href="/mps"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <span>←</span>
          <span>Back to all MPs</span>
        </Link>

        {/* Header */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 mb-6">
          <div className="flex items-start gap-6">
            {mp.photo_url ? (
              <img
                src={mp.photo_url}
                alt={mp.name}
                className="w-32 h-32 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-400 text-4xl font-bold">
                  {mp.name?.charAt(0)}
                </span>
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">
                {mp.display_name || mp.name}
              </h1>
              
              {mp.constituency && (
                <p className="text-xl text-gray-300 mb-3">
                  MP for {mp.constituency}
                </p>
              )}

              {mp.party && (
                <span
                  className="inline-block px-4 py-2 text-sm font-semibold rounded"
                  style={{
                    backgroundColor: mp.party_colour + '20',
                    color: mp.party_colour,
                    borderColor: mp.party_colour + '40',
                    borderWidth: '1px'
                  }}
                >
                  {mp.party}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Client Component with Interactive Menu */}
        <MPProfileClient
          mp={mp}
          contact={contact}
          bio={bio}
          sponsoredBills={sponsoredBills || []}
          votes={votes || []}
          interests={interests || []}
        />
      </main>
    </div>
  )
}
