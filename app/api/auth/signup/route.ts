import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { resolveMx } from 'dns/promises';
import { randomUUID } from 'crypto';
import { emailEnabled, sendVerificationEmail, sendSignupNotification } from '@/lib/email';
import { setSessionCookie } from '@/lib/session';
import disposableDomains from 'disposable-email-domains';

// Permissive but blocks obvious garbage. Real format validation happens
// at the deliverability layer (MX check + send a verification email).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Open-source throwaway-domain blocklist (disposable-email-domains, ~121k domains).
const DISPOSABLE_DOMAINS = new Set(disposableDomains.map((d) => d.toLowerCase()));

async function domainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;
  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch {
    // Fallback: a domain without explicit MX may still accept on its A record,
    // but for signup-time validation we treat MX-less domains as undeliverable.
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = body.password as string | undefined;
    const username = (body.username as string | undefined)?.trim();
    const postcode = (body.postcode as string | undefined) ?? null;
    const email = (body.email as string | undefined)?.trim().toLowerCase();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!(await domainAcceptsMail(email))) {
      return NextResponse.json(
        { error: 'That email domain doesn\'t accept mail. Check the spelling.' },
        { status: 400 }
      );
    }

    if (DISPOSABLE_DOMAINS.has(email.split('@')[1])) {
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed. Please use a permanent address.' },
        { status: 400 }
      );
    }

    // Check if email already exists (case-insensitive — email is now stored lowercase)
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const token = randomUUID();
    const verified = !emailEnabled; // auto-verify when email sending is not configured

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        postcode,
        username,
        email_verified: verified,
        verification_token: verified ? null : token,
        verification_sent_at: verified ? null : new Date().toISOString(),
      })
      .select('id, email, username, postcode, email_verified, created_at')
      .single();

    if (error) {
      console.error('Signup error:', error);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    if (!verified) {
      const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
      await sendVerificationEmail(email, token, base);
    }

    // Notify the contact inbox of the new signup. Fire-and-forget: a failed or
    // slow notification must never block or fail the user's registration.
    sendSignupNotification({
      email: user.email,
      username: user.username,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
    }).catch((e) => console.error('Signup notification failed:', e));

    const res = NextResponse.json({ user, needsVerification: !verified });
    if (verified) setSessionCookie(res, user.id);
    return res;

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
