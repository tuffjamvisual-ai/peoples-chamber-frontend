import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { readAll } from '@/lib/read-all';

// The MP profile's individual expense claims, fetched when the Expenses tab is first opened (owner's approval,
// 21 Oct 2026), instead of being read into every MP page render. Every claim, newest first (24 Oct 2026, report 36):
// this used to stop at the 1,000 most recent, so for the 201 MPs with more, older years and the refused and repaid
// lists were incomplete. Read with lib/read-all.ts.
// Cached for an hour (25 Oct 2026, report 43): revalidate alone did not cache this handler (it ran for every request),
// so it is now force-static, like a page; the profile fetches it as soon as the page is idle, so the Expenses tab
// opens at once. A failed read throws, so an error is never cached: the last good answer stays up.
export const dynamic = 'force-static';
export const revalidate = 3600;

const COLS = 'id, claim_number, year, claim_date, category, cost_type, short_description, details, amount_claimed, amount_paid, amount_not_paid, amount_repaid, status, reason_if_not_paid, journey_from, journey_to, mileage, nights';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) return NextResponse.json({ claims: [] }, { status: 400 });
  const claims = await readAll<Record<string, unknown>>(() => supabase.from('mp_expenses_detail'), {
    columns: COLS,
    filter: (q) => q.eq('member_id', memberId),
    orderBy: [{ column: 'claim_date', ascending: false }, { column: 'id' }],
    label: `/api/mps/${memberId}/expenses`,
  });
  return NextResponse.json({ claims });
}
