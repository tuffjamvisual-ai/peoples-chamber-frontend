import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Typeahead search for the welfare explorer's search bar: supports
// constituencies, local authorities, and counties. Responds to either:
//   ?q=<partial name>  — fuzzy search across all three types
//   ?county=<exact>   — fetch all constituencies within a specific county
//
// Result types: 'constituency' | 'local_authority' | 'county'
// Scotland: constituencies (S14) and LAs (S12) are returned with
// scope='partial'; E&W are scope='full'. Counties are E&W only (they
// come from welfare_constituency_geography.county_name which is only
// populated for English constituencies that fall within a traditional
// county structure — Welsh and Scottish constituencies use the region
// hierarchy instead).
//
// LONDON BOROUGHS: county_gss_code (CTYUA25CD) uses the standard ONS
// prefix convention — E09 is specifically London boroughs (e.g. Hackney),
// while E10 is a true two-tier county (e.g. Kent) and E06 is a
// non-London unitary authority. Since a London borough has no separate
// county tier above it, ONS's own lookup uses the borough's own name/code
// as its CTYUA entry — which is accurate, but reads oddly as a "county"
// result to a user. `type` stays 'county' either way (routing via
// ?county= works identically), but `label` is set to 'borough' for E09
// entries so the UI can show the more natural term without changing what
// is searchable or how it resolves.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type SearchResult =
  | { type: 'constituency'; gssCode: string; name: string; scope: 'full' | 'partial'; county?: string | null }
  | { type: 'local_authority'; gssCode: string; name: string; scope: 'full' | 'partial' }
  | { type: 'county'; name: string; constituencyCount: number; label: 'county' | 'borough' };

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const county = (req.nextUrl.searchParams.get('county') || '').trim();

  if (!q && !county) {
    return NextResponse.json({ error: 'missing', message: 'Provide ?q= or ?county=' }, { status: 400 });
  }

  // ── county= exact fetch: all constituencies within a county ──────────
  if (county) {
    const { data, error } = await supabase
      .from('welfare_constituency_geography')
      .select('constituency_gss_code, constituency_name, county_name')
      .eq('county_name', county)
      .order('constituency_name');
    if (error) {
      console.error('welfare search county error:', error.message);
      return NextResponse.json({ error: 'db', message: 'Database error' }, { status: 500 });
    }
    const results: SearchResult[] = (data || []).map((r) => ({
      type: 'constituency',
      gssCode: r.constituency_gss_code,
      name: r.constituency_name,
      scope: r.constituency_gss_code.startsWith('S14') ? 'partial' : 'full',
      county: r.county_name,
    }));
    return NextResponse.json({ results });
  }

  // ── q= typeahead across all three types ─────────────────────────────
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const pattern = `%${q}%`;

  const [
    { data: constData, error: constErr },
    { data: laData, error: laErr },
    { data: countyData, error: countyErr },
  ] = await Promise.all([
    // Constituencies: from mps table
    supabase
      .from('mps')
      .select('constituency_gss_code, constituency')
      .ilike('constituency', pattern)
      .order('constituency')
      .limit(8),

    // Local authorities: from welfare_local_authority_metrics
    // (population_mid_year rows uniquely identify each LA — any metric_key
    // that has a row for every LA would do, but population is reliable)
    supabase
      .from('welfare_local_authority_metrics')
      .select('council_gss_code, council_name')
      .eq('metric_key', 'population_mid_year')
      .ilike('council_name', pattern)
      .order('council_name')
      .limit(8),

    // Counties: from welfare_constituency_geography — group by county_name,
    // return the count of constituencies so the UI can show e.g. "Kent · 17 constituencies".
    // county_gss_code is fetched too, purely to detect London boroughs (E09) for labelling.
    supabase
      .from('welfare_constituency_geography')
      .select('county_name, county_gss_code')
      .not('county_name', 'is', null)
      .ilike('county_name', pattern)
      .order('county_name')
      .limit(5),
  ]);

  if (constErr || laErr || countyErr) {
    const msg = constErr?.message || laErr?.message || countyErr?.message;
    console.error('welfare search error:', msg);
    return NextResponse.json({ error: 'db', message: 'Database error' }, { status: 500 });
  }

  const results: SearchResult[] = [];

  for (const r of constData || []) {
    if (!r.constituency_gss_code) continue;
    results.push({
      type: 'constituency',
      gssCode: r.constituency_gss_code,
      name: r.constituency,
      scope: r.constituency_gss_code.startsWith('S14') ? 'partial' : 'full',
    });
  }

  for (const r of laData || []) {
    if (!r.council_gss_code) continue;
    results.push({
      type: 'local_authority',
      gssCode: r.council_gss_code,
      name: r.council_name,
      scope: r.council_gss_code.startsWith('S12') ? 'partial' : 'full',
    });
  }

  // Deduplicate county names (the query returns one row per constituency
  // within the county, but we want one result per county name)
  const seenCounties = new Set<string>();
  for (const r of countyData || []) {
    if (!r.county_name || seenCounties.has(r.county_name)) continue;
    seenCounties.add(r.county_name);
    results.push({
      type: 'county',
      name: r.county_name,
      constituencyCount: 0, // filled in below
      label: r.county_gss_code && r.county_gss_code.startsWith('E09') ? 'borough' : 'county',
    });
  }

  // Fill constituency counts for any county results
  if (seenCounties.size > 0) {
    const { data: countRows } = await supabase
      .from('welfare_constituency_geography')
      .select('county_name')
      .in('county_name', Array.from(seenCounties));
    const counts = new Map<string, number>();
    for (const r of countRows || []) {
      counts.set(r.county_name, (counts.get(r.county_name) || 0) + 1);
    }
    for (const result of results) {
      if (result.type === 'county') {
        result.constituencyCount = counts.get(result.name) || 0;
      }
    }
  }

  return NextResponse.json({ results });
}
