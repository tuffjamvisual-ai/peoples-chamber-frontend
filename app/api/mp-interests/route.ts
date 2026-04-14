import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const revalidate = 3600;

type Interest = {
  category: string;
  summary: string;
  detail: string;
  registered_date: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const { data, error } = await supabase
    .from('mp_interests')
    .select('category, summary, detail, registered_date, member_id')
    .eq('member_slug', slug)
    .order('registered_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped: Record<string, Interest[]> = {};
  let memberId: number | null = null;
  for (const row of data || []) {
    if (memberId == null) memberId = row.member_id;
    const cat = row.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({
      category: cat,
      summary: row.summary,
      detail: row.detail,
      registered_date: row.registered_date,
    });
  }

  const categories = Object.keys(grouped)
    .sort()
    .map(name => ({ name, items: grouped[name] }));

  return NextResponse.json({ slug, memberId, categories });
}
