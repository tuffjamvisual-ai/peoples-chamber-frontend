import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const memberId = parseInt(params.id)
  
  // Fetch MP data
  const { data: mp } = await supabase
    .from('mps')
    .select('*')
    .eq('member_id', memberId)
    .single()
  
  if (!mp) {
    return NextResponse.json({ error: 'MP not found' }, { status: 404 })
  }

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

  return NextResponse.json({
    mp,
    contact,
    bio,
    sponsoredBills,
    votes,
    interests
  })
}
