import { NextRequest, NextResponse } from 'next/server';
import { bumpSessionVersion, clearSessionCookie, getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Signing out ends the session everywhere (owner's approval, 22 Oct 2026): the user's
// session_version goes up, so cookies on other devices stop working too.
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId) await bumpSessionVersion(userId);
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
