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

  if (error || !user) {
    // DB issue or user row missing. The cookie IS cryptographically valid
    // (verified above) — don't sign the user out for a database hiccup.
    // Return minimal data from the token so the UI stays authenticated.
    // All write actions (vote, etc.) re-verify independently server-side.
    console.warn('[auth/me] db fallback for userId', userId, error?.message ?? 'no row');
    return NextResponse.json({ user: { id: userId, email: null, username: null, postcode: null } });
  }
  console.log('[auth/me] ok for userId', userId);
  return NextResponse.json({ user });
}
