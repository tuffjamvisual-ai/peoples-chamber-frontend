import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// The MP profile's individual expense claims, fetched when the Expenses tab is first opened (owner's approval,
// 21 Oct 2026), instead of being read into every MP page render (up to 1,000 rows, about 280 ms). Same rows and
// order the page used: the 1,000 most recent claims, newest first. Cached like the votes route.
export const revalidate = 3600;

const COLS = 'claim_number, year, claim_date, category, cost_type, short_description, details, amount_claimed, amount_paid, amount_not_paid, amount_repaid, status, reason_if_not_paid, journey_from, journey_to, mileage, nights';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) return NextResponse.json({ claims: [] }, { status: 400 });
  const { data, error } = await supabase
    .from('mp_expenses_detail')
    .select(COLS)
    .eq('member_id', memberId)
    .order('claim_date', { ascending: false })
    .range(0, 999);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ claims: data ?? [] });
}
