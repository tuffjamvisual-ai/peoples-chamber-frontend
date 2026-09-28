import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { setSessionCookie } from '@/lib/session';

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

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, username, postcode, force_password_reset')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Correct password but reset required — no session issued yet.
    if (user.force_password_reset) {
      return NextResponse.json({ needsPasswordReset: true });
    }

    const res = NextResponse.json({ user: { id: user.id, email: user.email, username: user.username, postcode: user.postcode } });
    const cookieSet = setSessionCookie(res, user.id);
    if (!cookieSet) {
      // SESSION_SECRET not configured — catch early rather than returning a
      // sessionless login that appears to work but breaks every vote.
      console.error('Login: SESSION_SECRET missing or too short — no session cookie issued');
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 });
    }
    return res;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
