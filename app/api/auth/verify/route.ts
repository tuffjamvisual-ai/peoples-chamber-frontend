import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { setSessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Confirms an email from the link in the verification message.
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(`${base}/login?verified=invalid`);

  const { data: u } = await supabase
    .from('users')
    .select('id, pending_return_to')
    .eq('verification_token', token)
    .maybeSingle();

  if (!u) return NextResponse.redirect(`${base}/login?verified=invalid`);

  await supabase
    .from('users')
    .update({ email_verified: true, verification_token: null, pending_return_to: null })
    .eq('id', u.id);

  const dest =
    u.pending_return_to && u.pending_return_to !== '/'
      ? `${base}/login?verified=1&returnTo=${encodeURIComponent(u.pending_return_to)}`
      : `${base}/login?verified=1`;
  await setSessionCookie(u.id);
  return NextResponse.redirect(dest);
}
