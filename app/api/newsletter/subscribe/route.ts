// Email-only newsletter sign-up (audit reassessment, 16 Oct 2026). Adds the address as
// 'pending' and sends a confirmation link; the address joins the list only when the link is
// clicked. The reply is the same whether or not the address was already known, so the form
// cannot be used to find out who subscribes.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { emailEnabled, sendNewsletterConfirmation } from '@/lib/email';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_GAP_MS = 10 * 60 * 1000; // at most one confirmation email per address every 10 minutes

export async function POST(request: NextRequest) {
  // No email key (local or preview builds): answer before touching the database, as /api/commission does, so no
  // pending address is stored that could never be confirmed.
  if (!emailEnabled) return NextResponse.json({ error: 'Signing up is unavailable just now. Please try again later.' }, { status: 503 });
  let body: { email?: unknown; website?: unknown; source?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  // Honeypot: a hidden field people never see. Bots that fill it get a normal-looking reply.
  if (typeof body.website === 'string' && body.website.trim() !== '') return NextResponse.json({ ok: true });

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const source = typeof body.source === 'string' ? body.source.slice(0, 40) : null;

  const { data: existing, error: readErr } = await supabase
    .from('newsletter_subscribers')
    .select('id, status, token, last_sent_at')
    .eq('email', email) // stored lower-cased
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: 'Signing up is unavailable just now. Please try again later.' }, { status: 500 });

  if (existing?.status === 'confirmed') return NextResponse.json({ ok: true });
  if (existing?.last_sent_at && Date.now() - new Date(existing.last_sent_at).getTime() < RESEND_GAP_MS) {
    return NextResponse.json({ ok: true });
  }

  let token: string;
  if (existing) {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({ status: 'pending', last_sent_at: new Date().toISOString(), unsubscribed_at: null })
      .eq('id', existing.id)
      .select('token')
      .single();
    if (error || !data) return NextResponse.json({ error: 'Signing up is unavailable just now. Please try again later.' }, { status: 500 });
    token = data.token;
  } else {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email, source, last_sent_at: new Date().toISOString() })
      .select('token')
      .single();
    if (error || !data) return NextResponse.json({ error: 'Signing up is unavailable just now. Please try again later.' }, { status: 500 });
    token = data.token;
  }

  const base = process.env.NODE_ENV === 'production' ? 'https://www.opengovt.uk' : new URL(request.url).origin;
  const sent = await sendNewsletterConfirmation(email, token, base);
  if (!sent.sent) return NextResponse.json({ error: 'We could not send the confirmation email. Please try again later.' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
