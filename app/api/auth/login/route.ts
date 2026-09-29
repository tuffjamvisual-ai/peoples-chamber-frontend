import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { makeSessionCookieHeader } from '@/lib/session';

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

    const cookieHeader = makeSessionCookieHeader(user.id);
    if (!cookieHeader) {
      console.error('[login] SESSION_SECRET missing or too short — no session cookie issued');
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 });
    }

    console.log('[login] issuing session cookie for user', user.id);

    const userData = { id: user.id, email: user.email, username: user.username, postcode: user.postcode };
    return new Response(JSON.stringify({ user: userData }), {
      status: 200,
      headers: [
        ['Content-Type', 'application/json'],
        ['Set-Cookie', cookieHeader],
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
