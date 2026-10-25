import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, sessionTokenState, clearedSessionCookieHeaders, makeSignedInFlagHeader } from '@/lib/session';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // A session that has ended (expired, signed out elsewhere, password changed) gets 401 and both cookies removed, and
  // the browser then forgets its stored user (AuthContext), so the visitor shows as signed out everywhere (25 Oct 2026,
  // report 58). When the database cannot be read the answer is 503 and nothing is cleared.
  const session = await sessionTokenState(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (session.state === 'unknown') return NextResponse.json({ user: null, error: 'Session check unavailable' }, { status: 503 });
  if (session.state === 'ended') {
    const res = NextResponse.json({ user: null }, { status: 401 });
    for (const c of clearedSessionCookieHeaders()) res.headers.append('Set-Cookie', c);
    return res;
  }
  const userId = session.userId;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, username, postcode')
    .eq('id', userId)
    .single();

  // Signed in: (re)set the readable marker, so sessions from before it existed get one too.
  const res = (error || !user)
    ? NextResponse.json({ user: { id: userId, email: '', username: null, postcode: null } })
    : NextResponse.json({ user });
  if (!request.cookies.get('og_signed_in')) res.headers.append('Set-Cookie', makeSignedInFlagHeader());
  return res;
}
