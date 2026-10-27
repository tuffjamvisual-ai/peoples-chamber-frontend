// "Stop these emails" from any weekly digest (job 74): one click, no sign in. The token in the link is checked by its
// hash (member_alert_settings.unsubscribe_token_hash) and turns that member's digest off; follows are kept, so the
// member can turn it back on from the preferences page. POST is accepted for mail apps' one click List-Unsubscribe.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { unsubscribeByToken } from '@/lib/member-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const status = await unsubscribeByToken(supabaseAdmin, request.nextUrl.searchParams.get('token') || '');
  return NextResponse.redirect(new URL(`/preferences?digest=${status}`, request.url));
}

export async function POST(request: NextRequest) {
  const status = await unsubscribeByToken(supabaseAdmin, request.nextUrl.searchParams.get('token') || '');
  return NextResponse.json({ status }, { status: status === 'unsubscribed' ? 200 : 400 });
}
