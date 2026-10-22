// Signed, httpOnly session cookie. Identity for authenticated actions (voting,
// history) comes ONLY from this cookie — never from a client-supplied userId —
// which closes the IDOR / sequential-id enumeration on the vote routes.
//
// Token format:  <userId>.<sessionVersion>.<expiryUnixSeconds>.<HMAC-SHA256(secret, "<userId>.<version>.<exp>")>
// sessionVersion is users.session_version (owner's approval, 22 Oct 2026). Password reset, password
// change and logout increase it (bumpSessionVersion), so every cookie issued before then stops
// working. Verifying a token therefore reads the user's current version from the database, which
// is why verifySessionToken and getSessionUserId are async. Tokens in the old three part format
// (no version) are refused, so everyone signed in before this change signs in once more.
// Requires SESSION_SECRET in the environment (>= 16 chars). If it is missing the
// helpers fail closed: no cookie is issued and getSessionUserId() returns null,
// so protected routes reject rather than fall back to trusting the client.

import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase-admin';

const COOKIE_NAME = 'og_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days
// A readable marker set alongside the httpOnly session cookie, holding nothing but "1": the browser checks it before
// calling /api/auth/me, so visitors who have never signed in make no call (owner's approval, 21 Oct 2026; the call
// returned 401 to anonymous visitors 4,134 times a week). Identity still comes only from the signed session cookie.
const SIGNED_IN_FLAG = 'og_signed_in';

function getSecret(): string | null {
  const s = process.env.SESSION_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/** The user's current session_version, or null if the user does not exist or the read failed. */
async function currentSessionVersion(userId: number): Promise<number | null> {
  const { data, error } = await supabaseAdmin.from('users').select('session_version').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return Number(data.session_version);
}

/** Increase the user's session_version, ending every session issued before. Returns the new version. */
export async function bumpSessionVersion(userId: number): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc('bump_session_version', { p_user_id: userId });
  if (error || data == null) return null;
  return Number(data);
}

/** Build a signed session token for a user id at their current session_version, or null. */
export async function makeSessionToken(userId: number): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const version = await currentSessionVersion(userId);
  if (version == null) return null;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${userId}.${version}.${exp}`;
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Build the raw Set-Cookie header value for a session.
 * Returns null if SESSION_SECRET is missing or too short.
 * Use this when you need to set the header on the raw Response constructor.
 */
export async function makeSessionCookieHeader(userId: number): Promise<string | null> {
  const token = await makeSessionToken(userId);
  if (!token) return null;
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${MAX_AGE_SEC}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** Raw Set-Cookie value for the signed-in marker, sent with makeSessionCookieHeader. */
export function makeSignedInFlagHeader(): string {
  const parts = [`${SIGNED_IN_FLAG}=1`, 'Path=/', `Max-Age=${MAX_AGE_SEC}`, 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

/** Set the signed-in marker with Next.js's cookies() API. */
export async function setSignedInFlag(): Promise<void> {
  const store = await cookies();
  store.set(SIGNED_IN_FLAG, '1', { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: MAX_AGE_SEC });
}

/**
 * Set the signed session cookie using Next.js's cookies() API.
 * Returns false if SESSION_SECRET is missing or too short.
 * Must be called from a Route Handler or Server Action.
 */
export async function setSessionCookie(userId: number): Promise<boolean> {
  const token = await makeSessionToken(userId);
  if (!token) return false;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  });
  await setSignedInFlag();
  return true;
}

/** Clear the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(SIGNED_IN_FLAG);
}

/** Cookie name, exported so server components can read it via next/headers. */
export const SESSION_COOKIE_NAME = COOKIE_NAME;

/**
 * Verify a raw session token value and return the authenticated user id, or null.
 * Never trusts client-supplied ids: identity comes only from the signed token.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<number | null> {
  const secret = getSecret();
  if (!secret || !token) return null;
  const lastDot = token.lastIndexOf('.');
  if (lastDot < 0) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const parts = payload.split('.');
  if (parts.length !== 3) return null;
  const uid = Number(parts[0]);
  const version = Number(parts[1]);
  const exp = Number(parts[2]);
  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(version) || !Number.isFinite(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  // A reset, password change or logout since this token was issued makes it stale.
  if ((await currentSessionVersion(uid)) !== version) return null;
  return uid;
}

/**
 * Verify the session cookie on a request and return the authenticated user id,
 * or null. Never trusts client-supplied ids: identity comes only from the cookie.
 */
export async function getSessionUserId(req: NextRequest): Promise<number | null> {
  return verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);
}

