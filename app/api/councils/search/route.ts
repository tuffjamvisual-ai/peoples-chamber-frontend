import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Typeahead search for the homepage's local-authority search bar.
// Matches against both the council's full name ("Adur District Council")
// and its short name ("Adur"), since users are far more likely to type
// the short form. Covers all 382 councils across all four nations —
// no GB-only restriction here, unlike the welfare explorer's search
// (PIP/DLA/Carer's Allowance devolution doesn't apply to "does this
// council exist", only to which welfare benefits a given council's page
// can show).

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Strip characters that have special meaning in PostgREST's ilike/or
  // filter syntax (% and _ are ilike wildcards, commas and parentheses
  // separate/group .or() conditions) so a search term containing them
  // can't break the filter string or search with an unintended wildcard.
  // Same sanitisation app/mps/[id]/page.tsx already applies for the same
  // reason.
  const safe = q.replace(/[%_,()]/g, '');
  if (safe.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const pattern = `%${safe}%`;

  const { data, error } = await supabase
    .from('councils')
    .select('slug, name, short_name, type_label, country')
    .or(`name.ilike.${pattern},short_name.ilike.${pattern}`)
    .order('name', { ascending: true })
    .limit(8);

  if (error) {
    console.error('councils search error:', error.message);
    return NextResponse.json({ error: 'db', message: 'Database error' }, { status: 500 });
  }

  const results = (data || []).map((r) => ({
    slug: r.slug,
    name: r.name,
    shortName: r.short_name,
    typeLabel: r.type_label,
    country: r.country,
  }));

  return NextResponse.json({ results });
}
