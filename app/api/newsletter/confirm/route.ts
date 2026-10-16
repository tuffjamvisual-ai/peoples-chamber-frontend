// Confirmation link from the newsletter email: marks the address confirmed, then shows /newsletter.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const to = (status: string) => NextResponse.redirect(new URL(`/newsletter?status=${status}`, request.url));
  if (!UUID_RE.test(token)) return to('invalid');
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), unsubscribed_at: null })
    .eq('token', token)
    .select('id');
  if (error) return to('error');
  return to(data && data.length ? 'confirmed' : 'invalid');
}
