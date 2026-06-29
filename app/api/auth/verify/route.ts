import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Confirms an email from the link in the verification message.
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(`${base}/login?verified=invalid`);

  const { data: u } = await supabase
    .from('users')
    .select('id')
    .eq('verification_token', token)
    .maybeSingle();

  if (!u) return NextResponse.redirect(`${base}/login?verified=invalid`);

  await supabase
    .from('users')
    .update({ email_verified: true, verification_token: null })
    .eq('id', u.id);

  return NextResponse.redirect(`${base}/login?verified=1`);
}
