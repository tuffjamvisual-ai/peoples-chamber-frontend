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
      const { error: dbErr } = await supabase
        .from('users')
        .update({ reset_token: token, reset_token_sent_at: new Date().toISOString() })
        .eq('id', user.id);
      if (dbErr) {
        console.error('forgot: failed to store reset token:', dbErr.message);
      } else {
        // Await the send — fire-and-forget is unsafe in serverless (process may
        // terminate before the Promise resolves).
        const result = await sendPasswordResetEmail(user.email, token, base);
        if (!result.sent) {
          console.error('forgot: email not sent:', result.reason);
        }
      }
    }

    return NextResponse.json(GENERIC);
  } catch (e) {
    console.error('forgot error:', e);
    // Still return generic — don't reveal error state to the caller.
    return NextResponse.json(GENERIC);
  }
}
