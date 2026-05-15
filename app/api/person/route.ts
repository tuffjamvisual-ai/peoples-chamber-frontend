import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

// Reads cached person data from person_cache (refreshed weekly by
// /api/sync-person-cache). The gov.uk fetch used to live here on every
// request; now the request path is pure Supabase. Falls back to the
// matching dept_ministers / dept_officials row for photo if the cache
// entry doesn't exist yet (e.g. brand-new appointee not yet synced).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  try {
    const [{ data: cached }, { data: ministerRow }] = await Promise.all([
      supabase
        .from('person_cache')
        .select('name, photo, current_roles, past_roles')
        .eq('slug', slug)
        .maybeSingle(),
      supabase
        .from('dept_ministers')
        .select('photo_url, name')
        .eq('slug', slug)
        .maybeSingle(),
    ]);

    if (cached) {
      return NextResponse.json({
        name: cached.name,
        photo: cached.photo || ministerRow?.photo_url || '',
        currentRoles: cached.current_roles || [],
        pastRoles: cached.past_roles || [],
      });
    }

    // Cache miss — return a minimal record from dept_ministers if we have
    // one, so the page can at least show the header. Empty roles arrays
    // until the next cron run picks the slug up.
    if (ministerRow) {
      return NextResponse.json({
        name: ministerRow.name || '',
        photo: ministerRow.photo_url || '',
        currentRoles: [],
        pastRoles: [],
      });
    }

    return NextResponse.json({ error: 'not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
  }
}
