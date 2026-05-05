import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  try {
    const { data: ministerRow } = await supabase
      .from('dept_ministers')
      .select('photo_url')
      .eq('slug', slug)
      .maybeSingle();
    const photo = ministerRow?.photo_url || '';

    const res = await fetch(
      `https://www.gov.uk/api/content/government/people/${slug}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const data = await res.json();

    const allRoles = (data.links?.role_appointments || []).map((r: any) => ({
      title: r.links?.role?.[0]?.title || '',
      organisation: r.links?.role?.[0]?.links?.ordered_parent_organisations?.[0]?.title || '',
      startDate: r.details?.started_on || '',
      endDate: r.details?.ended_on || '',
      current: r.details?.current || false,
      body: r.links?.role?.[0]?.details?.body || '',
    }));

    const currentRoles = allRoles.filter((r: any) => r.current);
    const pastRoles = allRoles.filter((r: any) => !r.current)
      .sort((a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    return NextResponse.json({
      name: data.title,
      photo,
      currentRoles,
      pastRoles,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
