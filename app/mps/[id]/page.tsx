import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import { notFound } from 'next/navigation'
import MPProfileClient from './MPProfileClient'

export const revalidate = 3600

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
  
  const { data: mp } = await supabase
    .from('mps')
    .select('*')
    .eq('member_id', memberId)
    .single()
  
  if (!mp) notFound()

  const { data: contact } = await supabase
    .from('mp_contact')
    .select('*')
    .eq('member_id', memberId)
    .single()

  const { data: bio } = await supabase
    .from('mp_biography')
    .select('*')
    .eq('member_id', memberId)
    .single()

  const { data: sponsoredBills } = await supabase
    .from('bill')
    .select('*')
    .eq('sponsor_name', mp.name)
    .order('created_at', { ascending: false })

  const { data: votes } = await supabase
    .from('mp_division_votes')
    .select('*')
    .eq('member_id', memberId)
    .order('division_date', { ascending: false })

  const { data: interests } = await supabase
    .from('mp_registered_interests')
    .select('*')
    .eq('member_id', memberId)
    .order('category_sort_order', { ascending: true })

  // Financial interests — separate table keyed by member_slug. Slug derivation
  // prefers mp.slug if the column exists, else kebab-case from mp.name.
  const mpSlug = (mp.slug as string | undefined)
    || ((mp.name as string | undefined)?.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    || ''

  const { data: financialInterestRows } = await supabase
    .from('mp_interests')
    .select('category, summary, detail, registered_date')
    .eq('member_slug', mpSlug)
    .order('registered_date', { ascending: false })

  const grouped: Record<string, { summary: string; detail: string; registered_date: string | null }[]> = {}
  for (const row of financialInterestRows || []) {
    const cat = row.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({ summary: row.summary, detail: row.detail, registered_date: row.registered_date })
  }
  const financialInterests = Object.keys(grouped).sort().map(name => ({ name, items: grouped[name] }))

  const partyColour = mp.party_colour ? '#' + mp.party_colour.replace('#', '') : '#3b82f6'

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

        {/* Header with party colour gradient */}
        <div className="rounded-xl overflow-hidden mb-6 relative" style={{ background: `linear-gradient(135deg, ${partyColour}33 0%, #0a0f1a 60%)`, border: `1px solid ${partyColour}40` }}>
          <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top left, ${partyColour}, transparent 60%)` }} />
          <div className="relative p-6 flex items-center gap-6">
            <div className="relative flex-shrink-0">
              {mp.photo_url ? (
                <img
                  src={mp.photo_url}
                  alt={mp.name}
                  className="w-28 h-28 rounded-full object-cover"
                  style={{ border: `3px solid ${partyColour}` }}
                />
              ) : (
                <div className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white" style={{ border: `3px solid ${partyColour}`, background: partyColour + '33' }}>
                  {mp.name?.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
                {mp.display_name || mp.name}
              </h1>
              {mp.constituency && (
                <p className="text-lg text-gray-300 mb-3">MP for {mp.constituency}</p>
              )}
              {mp.party && (
                <span className="inline-block px-4 py-1.5 text-sm font-semibold rounded-full text-white" style={{ backgroundColor: partyColour }}>
                  {mp.party}
                </span>
              )}
            </div>
          </div>
        </div>

        <MPProfileClient
          mp={mp}
          contact={contact}
          bio={bio}
          sponsoredBills={sponsoredBills || []}
          votes={votes || []}
          interests={interests || []}
          partyColour={partyColour}
          financialInterests={financialInterests}
        />
      </main>
    </div>
  )
}
