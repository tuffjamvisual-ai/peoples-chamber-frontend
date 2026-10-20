import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { toCardBill } from '@/lib/data';

// Live search endpoint for the /bills search bar. The grid components
// previously filtered only the 20 server-paginated bills loaded for
// the current page, so typing "tobacco" on page 1 silently failed if
// the Tobacco and Vapes Act sat 60 pages deeper. This route searches
// the full table by title (case-insensitive substring) and returns up
// to 50 matches.
//
// Acts and withdrawn bills are included — when a user types a name
// into the search bar they're looking for that specific bill, not
// just live ones. The columns and the row shape (toCardBill, with the
// summary cut to card length) are the same as lib/data.ts getBillsPage
// so the BillCoverCard renders identically.

const COLS =
  'id, parliament_id, title, category, description, long_title, current_stage, stage_date, ' +
  'originating_house, introduced_session_id, ' +
  'sponsor_name, sponsor_party, sponsor_party_colour, ' +
  'vote_count_yes, vote_count_no, vote_count_abstain, ' +
  'commons_ayes, commons_noes, last_update, bill_withdrawn, is_act';

const MAX_RESULTS = 50;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get('q') || '').trim();

  if (raw.length < 2) {
    return NextResponse.json({ bills: [], total: 0 });
  }

  // Escape PostgREST ilike wildcards in the user term so a stray %
  // doesn't widen the match (and a _ doesn't behave like .).
  const safe = raw.replace(/[%_\\]/g, (c) => '\\' + c);
  const pattern = `%${safe}%`;

  const { data, error, count } = await supabase
    .from('bill')
    .select(COLS, { count: 'exact' })
    .ilike('title', pattern)
    .is('hidden_reason', null)
    .order('last_update', { ascending: false, nullsFirst: false })
    .limit(MAX_RESULTS);

  if (error) {
    console.error('[bills/search] supabase error:', error.message);
    return NextResponse.json({ bills: [], total: 0, error: error.message }, { status: 500 });
  }

  const bills = ((data as unknown as Record<string, unknown>[]) || []).map(toCardBill);

  return NextResponse.json({ bills, total: count ?? bills.length });
}
