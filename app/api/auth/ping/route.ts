import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Diagnostic: shows which cookies arrive at the server and whether the
// og_session cookie verifies. Safe to expose — no secret values returned.
export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll().map((c) => c.name);
  const rawSession = request.cookies.get('og_session')?.value ?? null;
  const userId = getSessionUserId(request);
  return NextResponse.json({
    cookies_received: allCookies,
    og_session_present: !!rawSession,
    og_session_prefix: rawSession ? rawSession.slice(0, 12) + '...' : null,
    session_valid: userId !== null,
    user_id: userId,
  });
}
