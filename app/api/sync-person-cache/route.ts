import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RoleAppt = {
  title: string;
  organisation: string;
  startDate: string;
  endDate: string;
  current: boolean;
  body: string;
};

type Person = {
  name: string;
  photo: string;
  current_roles: RoleAppt[];
  past_roles: RoleAppt[];
};

async function fetchPerson(slug: string): Promise<Person> {
  const res = await fetch(`https://www.gov.uk/api/content/government/people/${slug}`);
  if (!res.ok) throw new Error(`gov.uk ${res.status}`);
  const data = await res.json();

  type GovukRoleAppt = {
    details?: { started_on?: string; ended_on?: string; current?: boolean };
    links?: {
      role?: Array<{
        title: string;
        details?: { body?: string };
        links?: { ordered_parent_organisations?: Array<{ title: string }> };
      }>;
    };
  };

  const allRoles: RoleAppt[] = ((data?.links?.role_appointments as GovukRoleAppt[]) || []).map((r) => ({
    title: r.links?.role?.[0]?.title || '',
    organisation: r.links?.role?.[0]?.links?.ordered_parent_organisations?.[0]?.title || '',
    startDate: r.details?.started_on || '',
    endDate: r.details?.ended_on || '',
    current: !!r.details?.current,
    body: r.links?.role?.[0]?.details?.body || '',
  }));

  const current_roles = allRoles.filter((r) => r.current);
  const past_roles = allRoles
    .filter((r) => !r.current)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

  return {
    name: (data as { title?: string }).title || '',
    photo: (data as { details?: { image?: { url?: string } } }).details?.image?.url || '',
    current_roles,
    past_roles,
  };
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  // Source of truth: slugs in dept_ministers ∪ dept_officials.
  const [{ data: m }, { data: o }] = await Promise.all([
    supabase.from('dept_ministers').select('slug').not('slug', 'is', null),
    supabase.from('dept_officials').select('slug').not('slug', 'is', null),
  ]);
  const slugs = Array.from(
    new Set(
      [...(m || []), ...(o || [])]
        .map((r: { slug: string | null }) => r.slug || '')
        .filter(Boolean),
    ),
  );

  const results: Array<{ slug: string; status: 'ok' | 'fail'; detail?: string }> = [];
  for (const slug of slugs) {
    try {
      const p = await fetchPerson(slug);

      // Preserve a bucket photo URL if we already mirrored it locally.
      // gov.uk asset URLs rotate and we don't want every sync to undo
      // the work of the photo-backfill (Lord Livermore et al.).
      const { data: existing } = await supabase
        .from('person_cache')
        .select('photo')
        .eq('slug', slug)
        .maybeSingle();
      const photo =
        existing?.photo && existing.photo.includes('supabase.co')
          ? existing.photo
          : p.photo;

      const { error } = await supabase.from('person_cache').upsert(
        { slug, ...p, photo, last_synced: new Date().toISOString() },
        { onConflict: 'slug' },
      );
      if (error) throw error;
      results.push({ slug, status: 'ok' });
    } catch (err) {
      results.push({ slug, status: 'fail', detail: (err as Error).message });
    }
  }

  return NextResponse.json({
    ok: results.filter((r) => r.status === 'ok').length,
    fail: results.filter((r) => r.status === 'fail').length,
    syncedAt: new Date().toISOString(),
    results,
  });
}
