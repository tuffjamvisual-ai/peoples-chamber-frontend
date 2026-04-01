import { NextResponse } from 'next/server';
import { govukSlugs } from '@/lib/govuk-slugs';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  try {
    // Try Supabase first
    const [ministersRes, officialsRes, agenciesRes] = await Promise.all([
      supabase.from('dept_ministers').select('*').eq('dept_slug', slug).order('id'),
      supabase.from('dept_officials').select('*').eq('dept_slug', slug).order('id'),
      supabase.from('dept_agencies').select('*').eq('dept_slug', slug).order('name'),
    ]);

    if (ministersRes.data && ministersRes.data.length > 0) {
      // Supabase has data — use it
      const ministers = ministersRes.data.map(m => ({
        name: m.name,
        photo: '',
        role: m.role,
        slug: m.slug,
        url: '',
        is_secretary_of_state: m.is_secretary_of_state,
      }));

      const boardMembers = officialsRes.data?.map(m => ({
        name: m.name,
        photo: '',
        role: m.role,
        slug: m.slug,
        url: '',
        category: m.category,
      })) || [];

      const childOrgs = agenciesRes.data?.map(o => ({
        name: o.name,
        url: o.url,
        acronym: o.acronym,
      })) || [];

      // Still fetch featured docs and social from GOV.UK live
      const govukSlug = govukSlugs[slug];
      let featuredDocs: any[] = [];
      let featuredLinks: any[] = [];
      let socialMedia: any[] = [];
      let foiEmail = '';
      let pressPhone = '';

      if (govukSlug) {
        try {
          const res = await fetch(`https://www.gov.uk/api/content/government/organisations/${govukSlug}`, { next: { revalidate: 3600 } });
          const data = await res.json();
          featuredDocs = (data.details?.ordered_featured_documents || []).map((d: any) => ({
            title: d.title,
            url: `https://www.gov.uk${d.href}`,
            summary: d.summary?.replace(/<[^>]+>/g, '').trim() || '',
            type: d.document_type,
            date: d.public_updated_at,
          }));
          featuredLinks = (data.details?.ordered_featured_links || []).map((l: any) => ({ title: l.title, url: l.href }));
          socialMedia = (data.details?.social_media_links || []).map((s: any) => ({ service: s.service_type, url: s.href, title: s.title }));
          foiEmail = data.links?.ordered_foi_contacts?.[0]?.details?.email_addresses?.[0]?.email || '';
          pressPhone = data.links?.ordered_contacts?.find((c: any) => c.title?.toLowerCase().includes('media'))?.details?.phone_numbers?.[0]?.number || '';
        } catch {}
      }

      return NextResponse.json({ ministers, boardMembers, childOrgs, featuredDocs, featuredLinks, socialMedia, foiEmail, pressPhone });
    }

    // Fallback to live GOV.UK API
    const govukSlug = govukSlugs[slug];
    if (!govukSlug) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const res = await fetch(`https://www.gov.uk/api/content/government/organisations/${govukSlug}`, { next: { revalidate: 3600 } });
    const data = await res.json();

    const ministers = (data.links?.ordered_ministers || []).map((m: any, i: number) => {
      const currentRole = m.links?.role_appointments?.find((r: any) => r.details?.current);
      return { name: m.title, photo: '', role: currentRole?.links?.role?.[0]?.title || '', slug: m.base_path?.replace('/government/people/', '') || '', url: m.web_url, is_secretary_of_state: i === 0 };
    }).filter((m: any) => m.role);

    const boardMembers = (data.links?.ordered_board_members || []).map((m: any) => {
      const currentRole = m.links?.role_appointments?.find((r: any) => r.details?.current);
      return { name: m.title, photo: '', role: currentRole?.links?.role?.[0]?.title || '', slug: m.base_path?.replace('/government/people/', '') || '', url: m.web_url };
    }).filter((m: any) => m.role);

    const childOrgs = (data.links?.ordered_child_organisations || []).filter((o: any) => o.details?.organisation_govuk_status?.status === 'live').map((o: any) => ({ name: o.title, url: o.web_url, acronym: o.details?.acronym || '' }));
    const featuredDocs = (data.details?.ordered_featured_documents || []).map((d: any) => ({ title: d.title, url: `https://www.gov.uk${d.href}`, summary: d.summary?.replace(/<[^>]+>/g, '').trim() || '', type: d.document_type, date: d.public_updated_at }));
    const featuredLinks = (data.details?.ordered_featured_links || []).map((l: any) => ({ title: l.title, url: l.href }));
    const socialMedia = (data.details?.social_media_links || []).map((s: any) => ({ service: s.service_type, url: s.href, title: s.title }));
    const foiEmail = data.links?.ordered_foi_contacts?.[0]?.details?.email_addresses?.[0]?.email || '';
    const pressPhone = data.links?.ordered_contacts?.find((c: any) => c.title?.toLowerCase().includes('media'))?.details?.phone_numbers?.[0]?.number || '';

    return NextResponse.json({ ministers, boardMembers, childOrgs, featuredDocs, featuredLinks, socialMedia, foiEmail, pressPhone });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
