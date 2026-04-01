import { NextResponse } from 'next/server';
import { govukSlugs } from '@/lib/govuk-slugs';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const govukSlug = govukSlugs[slug];
  if (!govukSlug) return NextResponse.json({ error: 'department not found' }, { status: 404 });

  try {
    const res = await fetch(`https://www.gov.uk/api/content/government/organisations/${govukSlug}`, {
      next: { revalidate: 3600 }
    });
    const data = await res.json();

    const ministers = (data.links?.ordered_ministers || []).map((m: any) => {
      const currentRole = m.links?.role_appointments?.find((r: any) => r.details?.current);
      const roleTitle = currentRole?.links?.role?.[0]?.title || '';
      const roleBody = currentRole?.links?.role?.[0]?.details?.body || '';
      return {
        name: m.title,
        photo: m.details?.image?.url || '',
        role: roleTitle,
        responsibilities: roleBody,
        url: m.web_url,
      };
    }).filter((m: any) => m.role);

    const childOrgs = (data.links?.ordered_child_organisations || []).map((o: any) => ({
      name: o.title,
      url: o.web_url,
      status: o.details?.organisation_govuk_status?.status || 'live',
    }));

    const featuredDocs = (data.details?.ordered_featured_documents || []).map((d: any) => ({
      title: d.title,
      url: d.href,
      summary: d.summary,
    }));

    return NextResponse.json({
      title: data.title,
      description: data.description,
      ministers,
      childOrgs,
      featuredDocs,
      updatedAt: data.public_updated_at,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
