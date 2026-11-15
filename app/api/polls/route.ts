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

  // L10 (security review, owner approved 14 Nov 2026): the database's own error text is logged, not shown.
  if (error) { console.error('[polls]', error.message); return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 }); }
  return NextResponse.json({ polls: data });
}
