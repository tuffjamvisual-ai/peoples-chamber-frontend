import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { setSessionCookie } from '@/lib/session';

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

    const pwOk = newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword);
    if (!pwOk) {
      return NextResponse.json(
        { error: 'New password must be 8 or more characters with a letter and a number' },
        { status: 400 },
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, username, postcode')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('users')
      .update({ password: hashedNew, force_password_reset: false })
      .eq('id', user.id);

    const res = NextResponse.json({ user: { id: user.id, email: user.email, username: user.username, postcode: user.postcode } });
    const cookieSet = setSessionCookie(res, user.id);
    if (!cookieSet) {
      console.error('change-password: SESSION_SECRET missing or too short — no session cookie issued');
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 });
    }
    return res;
  } catch (e) {
    console.error('change-password error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
