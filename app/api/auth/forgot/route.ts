import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

// Always return this regardless of whether the email exists — prevents user enumeration.
const GENERIC = { message: "If that address is registered, a reset link is on its way." };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    if (!email) return NextResponse.json(GENERIC);

    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (user) {
      const token = randomUUID();
      await supabase
        .from('users')
        .update({ reset_token: token, reset_token_sent_at: new Date().toISOString() })
        .eq('id', user.id);
      // Fire-and-forget — a slow send must not block the response.
      sendPasswordResetEmail(user.email, token, base).catch((e) =>
        console.error('sendPasswordResetEmail failed:', e),
      );
    }

    return NextResponse.json(GENERIC);
  } catch (e) {
    console.error('forgot error:', e);
    // Still return generic — don't reveal error state to the caller.
    return NextResponse.json(GENERIC);
  }
}
