// Unsubscribe link from any newsletter email. One click, no log-in.
// POST is accepted too, for mail apps that use one-click List-Unsubscribe.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function unsubscribe(token: string) {
  if (!UUID_RE.test(token)) return 'invalid';
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('token', token)
    .select('id');
  if (error) return 'error';
  return data && data.length ? 'unsubscribed' : 'invalid';
}

export async function GET(request: NextRequest) {
  const status = await unsubscribe(request.nextUrl.searchParams.get('token') || '');
  return NextResponse.redirect(new URL(`/newsletter?status=${status}`, request.url));
}

export async function POST(request: NextRequest) {
  const status = await unsubscribe(request.nextUrl.searchParams.get('token') || '');
  return NextResponse.json({ status }, { status: status === 'unsubscribed' ? 200 : 400 });
}
