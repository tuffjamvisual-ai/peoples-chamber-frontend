import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  try {
    // Try Supabase first
    const { data: cached } = await supabase
      .from('agency_cache')
      .select('*')
      .eq('slug', slug)
      .single();

    if (cached) {
      return NextResponse.json({
        name: cached.name,
        description: cached.description,
        body: cached.body,
        acronym: cached.acronym,
        ministers: cached.ministers || [],
        boardMembers: cached.board_members || [],
        parentOrgs: cached.parent_orgs || [],
        featuredDocs: cached.featured_docs || [],
        socialMedia: cached.social_media || [],
      });
    }

    // Fallback to GOV.UK API
    const res = await fetch(`https://www.gov.uk/api/content/government/organisations/${slug}`, { next: { revalidate: 3600 } });
    const data = await res.json();

    const name = data.title || '';
    const description = data.description || '';
    const body = data.details?.body?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
    const acronym = data.details?.acronym || '';

    const ministers = (data.links?.ordered_ministers || []).map((m: any) => {
      const currentRole = m.links?.role_appointments?.find((r: any) => r.details?.current);
      return {
        name: m.title,
        role: currentRole?.links?.role?.[0]?.title || '',
        slug: m.base_path?.replace('/government/people/', '') || '',
      };
    }).filter((m: any) => m.role);

    const boardMembers = (data.links?.ordered_board_members || []).map((m: any) => {
      const currentRole = m.links?.role_appointments?.find((r: any) => r.details?.current);
      return {
        name: m.title,
        role: currentRole?.links?.role?.[0]?.title || '',
        slug: m.base_path?.replace('/government/people/', '') || '',
      };
    }).filter((m: any) => m.role);

    const featuredDocs = (data.details?.ordered_featured_documents || []).map((d: any) => ({
      title: d.title,
      url: `https://www.gov.uk${d.href}`,
      summary: d.summary?.replace(/<[^>]+>/g, '').trim() || '',
      type: d.document_type,
    }));

    const socialMedia = (data.details?.social_media_links || []).map((s: any) => ({
      service: s.service_type,
      url: s.href,
    }));

    const parentOrgs = (data.links?.ordered_parent_organisations || []).map((o: any) => ({
      name: o.title,
      slug: o.base_path?.replace('/government/organisations/', '') || '',
    }));

    return NextResponse.json({ name, description, body, acronym, ministers, boardMembers, featuredDocs, socialMedia, parentOrgs });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
