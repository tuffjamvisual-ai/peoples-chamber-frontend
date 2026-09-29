import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { makeSessionCookieHeader } from '@/lib/session';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = (body.token as string | undefined)?.trim();
    const newPassword = body.newPassword as string | undefined;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 },
      );
    }

    const pwOk = newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword);
    if (!pwOk) {
      return NextResponse.json(
        { error: 'Password must be 8 or more characters with a letter and a number' },
        { status: 400 },
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, postcode, reset_token_sent_at')
      .eq('reset_token', token)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has already been used.' },
        { status: 400 },
      );
    }

    const sentAt = user.reset_token_sent_at ? new Date(user.reset_token_sent_at).getTime() : 0;
    if (Date.now() - sentAt > TOKEN_TTL_MS) {
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('users')
      .update({
        password: hashedNew,
        reset_token: null,
        reset_token_sent_at: null,
        force_password_reset: false,
      })
      .eq('id', user.id);

    const userData = { id: user.id, email: user.email, username: user.username, postcode: user.postcode };
    const cookieHeader = makeSessionCookieHeader(user.id);
    if (!cookieHeader) {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }
    return new Response(JSON.stringify({ user: userData }), {
      status: 200,
      headers: [
        ['Content-Type', 'application/json'],
        ['Set-Cookie', cookieHeader],
      ],
    });
  } catch (e) {
    console.error('reset-password error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
