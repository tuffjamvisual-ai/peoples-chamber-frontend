import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { setSessionCookie } from '@/lib/session';
import { hashToken, VERIFY_TOKEN_TTL_MS } from '@/lib/auth-tokens';

export const dynamic = 'force-dynamic';

// Confirms an email from the link in the verification message.
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(`${base}/login?verified=invalid`);

  // The database keeps only the token's hash; links last VERIFY_TOKEN_TTL_MS (7 days).
  const { data: u } = await supabase
    .from('users')
    .select('id, pending_return_to, verification_sent_at')
    .eq('verification_token', hashToken(token))
    .maybeSingle();

  if (!u) return NextResponse.redirect(`${base}/login?verified=invalid`);
  const sentAt = u.verification_sent_at ? new Date(u.verification_sent_at).getTime() : 0;
  if (Date.now() - sentAt > VERIFY_TOKEN_TTL_MS) return NextResponse.redirect(`${base}/login?verified=invalid`);

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
