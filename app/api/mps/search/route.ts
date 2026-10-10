import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Typeahead search for the "Find Your MP" page's name search box.
// Matches against the MP's name and their constituency name, since a
// visitor who doesn't know their MP's name by heart often does know
// their constituency. Restricted to current members only (same
// current_member convention used elsewhere for the mps table —
// current_member is null for older/legacy rows that predate the column,
// so null is treated as current, same as app/topics/[slug]/page.tsx and
// app/api/sync-mp-contributions/route.ts).

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Strip characters with special meaning in PostgREST's ilike/or filter
  // syntax (% and _ are ilike wildcards, commas and parentheses
  // separate/group .or() conditions) — same sanitisation already used by
  // app/api/councils/search/route.ts and app/mps/[id]/page.tsx.
  const safe = q.replace(/[%_,()]/g, '');
  if (safe.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const pattern = `%${safe}%`;

  const { data, error } = await supabase
    .from('mps')
    .select('member_id, name, constituency, party')
    .or(`name.ilike.${pattern},constituency.ilike.${pattern}`)
    // current_member is null for older/legacy rows that predate the
    // column, so "not false" (rather than "is true") is what actually
    // means "current", same convention as app/topics/[slug]/page.tsx.
    // A plain .not() filter here (rather than a second .or()) keeps this
    // unambiguously ANDed with the name/constituency match above —
    // chaining two .or() calls isn't used anywhere else in this
    // codebase, so it wasn't worth relying on for this.
    .not('current_member', 'eq', false)
    .order('name', { ascending: true })
    .limit(8);

  if (error) {
    console.error('mps search error:', error.message);
    return NextResponse.json({ error: 'db', message: 'Database error' }, { status: 500 });
  }

  const results = (data || []).map((r) => ({
    memberId: r.member_id,
    name: r.name,
    constituency: r.constituency,
    party: r.party,
  }));

  return NextResponse.json({ results });
}
