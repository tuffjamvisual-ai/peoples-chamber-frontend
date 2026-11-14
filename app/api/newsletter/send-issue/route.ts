// POST /api/newsletter/send-issue: preview, test or send one issue of opengovt Weekly (T1-NLSEND step 2, COWORK-TO-T1
// ENTRY 53, owner approved 14 Nov 2026). The rules are in lib/newsletter-send.ts. Not linked from any page, not in the
// sitemap, never cached, noindex, and refused without the server secret.
// Body: { "mode": "preview" | "test" | "send", "issueDate": "YYYY-MM-DD", "issue": "<the issue markdown>" }
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { handleSendIssue, type OutEmail, type SendDeps } from '@/lib/newsletter-send';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
// Rate limit, per server instance: at most 10 requests in 10 minutes (refused ones count too).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 10;
const recent: number[] = [];

function resend(): { client: Resend; from: string } {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) throw new Error('RESEND_API_KEY and RESEND_FROM are not set');
  return { client: new Resend(key), from };
}
const payload = (from: string, e: OutEmail) => ({ from, to: e.to, subject: e.subject, html: e.html, text: e.text, headers: e.headers });

const deps: SendDeps = {
  secret: process.env.CRON_SECRET,
  async confirmedSubscribers() {
    const { data, error } = await supabaseAdmin.from('newsletter_subscribers').select('email, token').eq('status', 'confirmed');
    if (error) throw new Error(`subscribers: ${error.message}`);
    return (data ?? []) as { email: string; token: string }[];
  },
  async tokenFor(email) {
    const { data, error } = await supabaseAdmin.from('newsletter_subscribers').select('token').eq('email', email.toLowerCase()).maybeSingle();
    if (error) throw new Error(`subscriber: ${error.message}`);
    return (data?.token as string | undefined) ?? null;
  },
  async sendOne(e) {
    const { client, from } = resend();
    const { data, error } = await client.emails.send(payload(from, e));
    if (error || !data) throw new Error(`Resend: ${error?.message ?? 'no id returned'}`);
    return { id: data.id };
  },
  async sendBatch(emails, idempotencyKey) {
    const { client, from } = resend();
    const { data, error } = await client.batch.send(emails.map((e) => payload(from, e)), { idempotencyKey });
    if (error || !data) throw new Error(`Resend: ${error?.message ?? 'no ids returned'}`);
    return { ids: (data.data ?? []).map((d) => d.id) };
  },
  async sentSubjects() {
    // Resend's list of sent emails, newest first, up to 500 (five pages of 100): far more than a week of this site's
    // email. [TEST] emails carry a different subject, so they never block the real send.
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    const subjects: string[] = [];
    let after: string | null = null;
    for (let page = 0; page < 5; page++) {
      const url = new URL('https://api.resend.com/emails');
      url.searchParams.set('limit', '100');
      if (after) url.searchParams.set('after', after);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
      if (!res.ok) throw new Error(`Resend list answered ${res.status}`);
      const json = (await res.json()) as { data?: { id: string; subject?: string }[]; has_more?: boolean };
      const rows = json.data ?? [];
      subjects.push(...rows.map((r) => r.subject ?? ''));
      if (!json.has_more || !rows.length) break;
      after = rows[rows.length - 1].id;
    }
    return subjects;
  },
  pause: (ms) => new Promise((r) => setTimeout(r, ms)),
};

export async function POST(request: NextRequest) {
  const now = Date.now();
  while (recent.length && now - recent[0] > WINDOW_MS) recent.shift();
  if (recent.length >= MAX_IN_WINDOW) return NextResponse.json({ error: 'too many requests' }, { status: 429, headers: { ...HEADERS, 'Retry-After': '600' } });
  recent.push(now);
  let body: unknown = null;
  try { body = await request.json(); } catch { body = null; }
  try {
    const r = await handleSendIssue(request.headers.get('authorization'), body, deps);
    return NextResponse.json(r.body, { status: r.status, headers: HEADERS });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: HEADERS });
  }
}

export function GET() {
  return NextResponse.json({ error: 'POST only' }, { status: 405, headers: { ...HEADERS, Allow: 'POST' } });
}
