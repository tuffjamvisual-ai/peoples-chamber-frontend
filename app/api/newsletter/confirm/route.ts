// Confirmation link from the newsletter email: marks the address confirmed, notifies the
// owner (first confirmation only, so clicking the link twice does not send a second
// notification), then shows /newsletter.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { sendNewsletterSubscriberNotification } from '@/lib/email';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const to = (status: string) => NextResponse.redirect(new URL(`/newsletter?status=${status}`, request.url));
  if (!UUID_RE.test(token)) return to('invalid');

  const confirmedAt = new Date().toISOString();
  // Only rows not already confirmed are updated, so `changed` is empty on a repeat click.
  const { data: changed, error } = await supabase
    .from('newsletter_subscribers')
    .update({ status: 'confirmed', confirmed_at: confirmedAt, unsubscribed_at: null })
    .eq('token', token)
    .neq('status', 'confirmed')
    .select('email, source');
  if (error) return to('error');

  if (changed && changed.length) {
    const { count } = await supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed');
    // Awaited so the serverless function does not stop before the email is handed to Resend;
    // the notification never throws, and a failure does not affect the reader's confirmation.
    await sendNewsletterSubscriberNotification({ email: changed[0].email, source: changed[0].source, confirmedAt, totalConfirmed: count ?? null });
    return to('confirmed');
  }

  // Nothing changed: either already confirmed (a repeat click) or an unknown token.
  const { data: existing } = await supabase.from('newsletter_subscribers').select('id').eq('token', token).maybeSingle();
  return to(existing ? 'confirmed' : 'invalid');
}
