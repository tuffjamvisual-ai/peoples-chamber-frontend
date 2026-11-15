import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { bumpSessionVersion, setSessionCookie } from '@/lib/session';
import { BCRYPT_COST } from '@/lib/auth-tokens';
import { blocked, clearAccount, DUMMY_HASH, noteFailure, TOO_MANY } from '@/lib/auth-throttle';
import { clientIp } from '@/lib/email-limits';
import { passwordOk, PASSWORD_RULE_TEXT } from '@/lib/password-rule';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    const currentPassword = body.currentPassword as string | undefined;
    const newPassword = body.newPassword as string | undefined;

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Email, current password, and new password are required' },
        { status: 400 },
      );
    }

    if (!passwordOk(newPassword)) {
      return NextResponse.json(
        { error: `New password must be ${PASSWORD_RULE_TEXT}` },
        { status: 400 },
      );
    }

    // Security review M3: refused for 15 minutes after repeated failures (lib/auth-throttle.ts).
    const ip = clientIp(request.headers);
    if (blocked(email, ip)) return NextResponse.json({ error: TOO_MANY }, { status: 429 });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, username, postcode, email_verified')
      .eq('email', email)
      .single();

    // L4: one answer whether the address has no account or the password is wrong, and a password compared either way.
    const valid = await bcrypt.compare(currentPassword, error || !user ? DUMMY_HASH : user.password);
    if (error || !user || !valid) {
      noteFailure(email, ip);
      return NextResponse.json({ error: 'Email or current password is incorrect' }, { status: 401 });
    }
    clearAccount(email);

    // This route signs the user in, so it applies the same rule as login: no session for an
    // unconfirmed email address.
    if (!user.email_verified) {
      return NextResponse.json(
        { error: 'Please confirm your email address first. Check your inbox for the link, or send a new one.', needsVerification: true },
        { status: 403 },
      );
    }

    const hashedNew = await bcrypt.hash(newPassword, BCRYPT_COST);

    await supabase
      .from('users')
      .update({ password: hashedNew, force_password_reset: false })
      .eq('id', user.id);

    // Every session issued before the change stops working; the new cookie carries the new version.
    if ((await bumpSessionVersion(user.id)) == null) {
      return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
    }

    const cookieSet = await setSessionCookie(user.id);
    if (!cookieSet) {
      console.error('change-password: SESSION_SECRET missing or too short; no session cookie issued');
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 });
    }
    return NextResponse.json({ user: { id: user.id, email: user.email, username: user.username, postcode: user.postcode } });
  } catch (e) {
    console.error('change-password error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
