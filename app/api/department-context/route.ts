import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

// Server-callable: used both by this route's GET handler and directly
// by app/departments/[slug]/page.tsx at build time.
export async function getDeptContext(slug: string): Promise<{ street_context: string | null }> {
  const { data, error } = await supabase
    .from('department_context')
    .select('street_context, generated_at')
    .eq('slug', slug)
    .single();
  if (error || !data) return { street_context: null };
  return { street_context: data.street_context ?? null };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
  return NextResponse.json(await getDeptContext(slug));
}
