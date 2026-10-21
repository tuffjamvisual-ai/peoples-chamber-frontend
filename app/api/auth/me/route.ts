import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, makeSignedInFlagHeader } from '@/lib/session';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });

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
