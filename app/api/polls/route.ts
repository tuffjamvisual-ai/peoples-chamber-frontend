import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // ?archived=true returns the archived (outdated) polls for the archive page;
  // by default only active polls are returned.
  const archived = request.nextUrl.searchParams.get('archived') === 'true';

  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('archived', archived)
    .eq('poll_type', 'yesno') // exclude the reader voting-intention poll from the yes/no list
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ polls: data });
}
