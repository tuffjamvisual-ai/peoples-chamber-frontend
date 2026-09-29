import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  console.log('[auth/me] cookies received:', cookieNames);
  const userId = getSessionUserId(request);
  console.log('[auth/me] userId from session:', userId);
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, username, postcode')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[auth/me] db error for userId', userId, error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  if (!user) {
    console.warn('[auth/me] user not found for userId', userId);
    return NextResponse.json({ user: null }, { status: 401 });
  }
  console.log('[auth/me] success for userId', userId);
  return NextResponse.json({ user });
}
