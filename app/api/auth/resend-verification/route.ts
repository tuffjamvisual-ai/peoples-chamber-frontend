import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { newToken } from '@/lib/auth-tokens';
import { sendVerificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Sends a fresh email confirmation link to an account that has not confirmed its address
// (owner's approval, 22 Oct 2026: login now refuses unconfirmed accounts). The response is the
// same whether or not the address is registered or already confirmed, so it cannot be used to
// find accounts, and each address gets at most one link every 10 minutes.

const GENERIC = { message: 'If that address has an account waiting for confirmation, a new link is on its way.' };
const RESEND_GAP_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    if (!email) return NextResponse.json(GENERIC);

    const { data: user } = await supabase
      .from('users')
      .select('id, email, email_verified, verification_sent_at')
      .eq('email', email)
      .maybeSingle();

    if (!user || user.email_verified) return NextResponse.json(GENERIC);
    const lastSent = user.verification_sent_at ? new Date(user.verification_sent_at).getTime() : 0;
    if (Date.now() - lastSent < RESEND_GAP_MS) return NextResponse.json(GENERIC);

    const token = newToken();
    const { error } = await supabase
      .from('users')
      .update({ verification_token: token.hash, verification_sent_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) {
      console.error('resend-verification: failed to store token:', error.message);
      return NextResponse.json(GENERIC);
    }
    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    await sendVerificationEmail(user.email, token.raw, base);
    return NextResponse.json(GENERIC);
  } catch (e) {
    console.error('resend-verification error:', e);
    return NextResponse.json(GENERIC);
  }
}
