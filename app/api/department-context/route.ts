import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('department_context')
    .select('street_context, generated_at')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ street_context: null });
  }

  return NextResponse.json(data);
}
