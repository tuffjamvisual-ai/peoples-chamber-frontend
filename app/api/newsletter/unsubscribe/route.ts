// Unsubscribe from the newsletter (no log-in). Opening the link (GET) changes nothing: it leads to a page with one
// "Unsubscribe" button, so mail link checkers cannot unsubscribe anyone (security review L6, ENTRY 58 item 2,
// lib/unsubscribe-request.ts). That page's form and a mail program's one-click unsubscribe (List-Unsubscribe-Post) POST
// here and unsubscribe.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { TOKEN_RE, unsubscribeAction } from '@/lib/unsubscribe-request';

export const dynamic = 'force-dynamic';

async function unsubscribe(token: string) {
  if (!TOKEN_RE.test(token)) return 'invalid';
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('token', token)
    .select('id');
  if (error) return 'error';
  return data && data.length ? 'unsubscribed' : 'invalid';
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const to = new URL('/newsletter/unsubscribe', request.url);
  if (token) to.searchParams.set('token', token);
  return NextResponse.redirect(to, 303);
}

export async function POST(request: NextRequest) {
  let form: FormData | null = null;
  try { form = await request.formData(); } catch { form = null; }
  const token = request.nextUrl.searchParams.get('token') || String(form?.get('token') ?? '');
  const action = unsubscribeAction('POST', { confirm: form ? String(form.get('confirm') ?? '') : null });
  const status = await unsubscribe(token);
  if (action === 'form-confirmed') return NextResponse.redirect(new URL(`/newsletter/status/${status}`, request.url), 303);
  return NextResponse.json({ status }, { status: status === 'unsubscribed' ? 200 : 400 });
}
