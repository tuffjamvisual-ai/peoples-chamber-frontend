import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (userId == null) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .select('newsletter_opt_in')
    .eq('id', userId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ newsletter_opt_in: data.newsletter_opt_in ?? false });
}

export async function POST(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (userId == null) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const optIn = body.newsletter_opt_in === true;

  const { error } = await supabase
    .from('users')
    .update({ newsletter_opt_in: optIn })
    .eq('id', userId);

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json({ newsletter_opt_in: optIn });
}
