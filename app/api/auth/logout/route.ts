import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Clears the httpOnly session cookie server-side. The client also drops its
// local display copy of the user; the cookie is the authoritative session.
export async function POST() {
  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
