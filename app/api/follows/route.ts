// Follows for the signed in member (job 74). The member comes only from the session cookie; every read and write is
// on their own rows (lib/member-data.ts).
//   GET                       the member's follows
//   GET ?kind=mp&key=4597     whether they follow that page, and whether they have given consent yet
//   POST {kind, key, consent} follow; the first follow needs consent: true (the ticked box), else 409 needs_consent
//   DELETE {kind, key}        unfollow
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionUserId } from '@/lib/session';
import { addFollow, isFollowKind, isFollowing, listFollows, removeFollow } from '@/lib/member-data';
import { NO_STORE, badRequest, readJson, resultResponse, unauthorised } from '@/lib/member-http';
import { resolveFollowTarget } from '@/lib/follow-targets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  const kind = request.nextUrl.searchParams.get('kind');
  const key = request.nextUrl.searchParams.get('key');
  if (kind == null && key == null) return resultResponse(await listFollows(supabaseAdmin, userId), (follows) => ({ follows }));
  if (!isFollowKind(kind) || !key) return badRequest();
  return resultResponse(await isFollowing(supabaseAdmin, userId, kind, key), (v) => v);
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  const body = await readJson(request);
  const kind = body?.kind;
  const key = typeof body?.key === 'string' ? body.key : '';
  if (!isFollowKind(kind) || !key) return badRequest();
  let target;
  try { target = await resolveFollowTarget(kind, key); } catch (e) {
    console.error('[follows] target lookup:', (e as Error).message);
    return NextResponse.json({ error: 'error' }, { status: 500, headers: NO_STORE });
  }
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  return resultResponse(await addFollow(supabaseAdmin, userId, kind, key, target.label, target.state, body?.consent === true), () => ({ following: true }));
}

export async function DELETE(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  const body = await readJson(request);
  const kind = body?.kind;
  const key = typeof body?.key === 'string' ? body.key : '';
  if (!isFollowKind(kind) || !key) return badRequest();
  return resultResponse(await removeFollow(supabaseAdmin, userId, kind, key), () => ({ following: false }));
}
