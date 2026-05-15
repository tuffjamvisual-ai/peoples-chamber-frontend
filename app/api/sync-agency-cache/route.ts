import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type AgencyData = {
  name: string;
  description: string;
  body: string;
  acronym: string;
  ministers: { name: string; role: string; slug: string }[];
  board_members: { name: string; role: string; slug: string }[];
  parent_orgs: { name: string; slug: string }[];
  featured_docs: { title: string; url: string; summary: string; type: string }[];
  social_media: { service: string; url: string }[];
};

async function fetchAgency(slug: string): Promise<AgencyData> {
  const res = await fetch(`https://www.gov.uk/api/content/government/organisations/${slug}`);
  if (!res.ok) throw new Error(`gov.uk ${res.status}`);
  const data = await res.json();
  const details = (data?.details || {}) as Record<string, unknown>;
  const links = (data?.links || {}) as Record<string, unknown>;

  type GovukRoleAppt = { details?: { current?: boolean }; links?: { role?: Array<{ title: string }> } };
  type GovukPerson = { title: string; base_path?: string; links?: { role_appointments?: GovukRoleAppt[] } };

  const mapPerson = (m: GovukPerson) => {
    const currentRole = m.links?.role_appointments?.find((r) => r.details?.current);
    return {
      name: m.title,
      role: currentRole?.links?.role?.[0]?.title || '',
      slug: m.base_path?.replace('/government/people/', '') || '',
    };
  };

  return {
    name: (data as { title?: string }).title || '',
    description: (data as { description?: string }).description || '',
    body: String((details.body as string) || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    acronym: (details.acronym as string) || '',
    ministers: (((links.ordered_ministers as GovukPerson[]) || []).map(mapPerson).filter((m) => m.role)),
    board_members: (((links.ordered_board_members as GovukPerson[]) || []).map(mapPerson).filter((m) => m.role)),
    parent_orgs: ((links.ordered_parent_organisations as Array<{ title: string; base_path?: string }>) || []).map((o) => ({
      name: o.title,
      slug: o.base_path?.replace('/government/organisations/', '') || '',
    })),
    featured_docs: ((details.ordered_featured_documents as Array<{ title: string; href: string; summary?: string; document_type?: string }>) || []).map((d) => ({
      title: d.title,
      url: `https://www.gov.uk${d.href}`,
      summary: (d.summary || '').replace(/<[^>]+>/g, '').trim(),
      type: d.document_type || '',
    })),
    social_media: ((details.social_media_links as Array<{ service_type: string; href: string }>) || []).map((s) => ({
      service: s.service_type,
      url: s.href,
    })),
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

  // Source of truth: distinct agency slugs in dept_agencies.
  const { data: rows, error: srcErr } = await supabase
    .from('dept_agencies')
    .select('url')
    .ilike('url', '%/government/organisations/%');
  if (srcErr) return NextResponse.json({ error: srcErr.message }, { status: 500 });

  const slugs = Array.from(
    new Set(
      (rows || [])
        .map((r: { url: string }) => r.url.replace(/^.*\/government\/organisations\//, ''))
        .filter(Boolean),
    ),
  );

  const results: Array<{ slug: string; status: 'ok' | 'fail'; detail?: string }> = [];
  for (const slug of slugs) {
    try {
      const a = await fetchAgency(slug);
      const { error } = await supabase.from('agency_cache').upsert(
        { slug, ...a, updated_at: new Date().toISOString() },
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
