import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { makeSessionCookieHeader, makeSignedInFlagHeader } from '@/lib/session';
import { BCRYPT_COST } from '@/lib/auth-tokens';
import { blocked, clearAccount, DUMMY_HASH, noteFailure, TOO_MANY } from '@/lib/auth-throttle';
import { clientIp } from '@/lib/email-limits';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = body.password as string | undefined;
    const email = (body.email as string | undefined)?.trim().toLowerCase();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Security review M3: refused for 15 minutes after repeated failures (lib/auth-throttle.ts).
    const ip = clientIp(request.headers);
    if (blocked(email, ip)) return NextResponse.json({ error: TOO_MANY }, { status: 429 });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, username, postcode, force_password_reset, email_verified')
      .eq('email', email)
      .single();

    // L4: a password is compared even when no account has this address, so the answer takes as long either way.
    const validPassword = await bcrypt.compare(password, error || !user ? DUMMY_HASH : user.password);
    if (error || !user || !validPassword) {
      noteFailure(email, ip);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    clearAccount(email);

    // Hashes made at a lower cost are upgraded on the next successful sign in. A failure here is
    // logged and does not block the sign in.
    if (bcrypt.getRounds(user.password) < BCRYPT_COST) {
      const upgraded = await bcrypt.hash(password, BCRYPT_COST);
      const { error: rehashErr } = await supabase.from('users').update({ password: upgraded }).eq('id', user.id);
      if (rehashErr) console.error('[login] rehash failed:', rehashErr.message);
    }

    // Correct password but the email address was never confirmed: no session (owner's approval,
    // 22 Oct 2026). The page offers to resend the link through /api/auth/resend-verification.
    if (!user.email_verified) {
      return NextResponse.json(
        { error: 'Please confirm your email address first. Check your inbox for the link, or send a new one.', needsVerification: true },
        { status: 403 }
      );
    }

    // Correct password but reset required — no session issued yet.
    if (user.force_password_reset) {
      return NextResponse.json({ needsPasswordReset: true });
    }

    const cookieHeader = await makeSessionCookieHeader(user.id);
    if (!cookieHeader) {
      console.error('[login] SESSION_SECRET missing or too short; no session cookie issued');
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 });
    }

    const userData = { id: user.id, email: user.email, username: user.username, postcode: user.postcode };
    return new Response(JSON.stringify({ user: userData }), {
      status: 200,
      headers: [
        ['Content-Type', 'application/json'],
        ['Set-Cookie', cookieHeader],
        ['Set-Cookie', makeSignedInFlagHeader()],
      ],
    });

  } catch (error) {
    console.error('[login] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
