// Signed, httpOnly session cookie. Identity for authenticated actions (voting,
// history) comes ONLY from this cookie — never from a client-supplied userId —
// which closes the IDOR / sequential-id enumeration on the vote routes.
//
// Token format:  <userId>.<expiryUnixSeconds>.<HMAC-SHA256(secret, "<userId>.<exp>")>
// Requires SESSION_SECRET in the environment (>= 16 chars). If it is missing the
// helpers fail closed: no cookie is issued and getSessionUserId() returns null,
// so protected routes reject rather than fall back to trusting the client.

import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'og_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 16 ? s : null;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/** Build a signed session token for a user id, or null if no secret configured. */
export function makeSessionToken(userId: number): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Set the signed session cookie on a response. Returns false if no secret. */
export function setSessionCookie(res: NextResponse, userId: number): boolean {
  const token = makeSessionToken(userId);
  if (!token) return false;
  res.cookies.set(COOKIE_NAME, token, { ...cookieOpts, maxAge: MAX_AGE_SEC });
  return true;
}

/** Clear the session cookie (logout). */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', { ...cookieOpts, maxAge: 0 });
}

/** Cookie name, exported so server components can read it via next/headers. */
export const SESSION_COOKIE_NAME = COOKIE_NAME;

/**
 * Verify a raw session token value and return the authenticated user id, or null.
 * Never trusts client-supplied ids: identity comes only from the signed token.
 */
export function verifySessionToken(token: string | undefined | null): number | null {
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
  const [uidStr, expStr] = payload.split('.');
  const uid = Number(uidStr);
  const exp = Number(expStr);
  if (!Number.isInteger(uid) || uid <= 0 || !Number.isFinite(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  return uid;
}

/**
 * Verify the session cookie on a request and return the authenticated user id,
 * or null. Never trusts client-supplied ids: identity comes only from the cookie.
 */
export function getSessionUserId(req: NextRequest): number | null {
  return verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);
}
