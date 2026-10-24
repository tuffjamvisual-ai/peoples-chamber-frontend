import { NextResponse } from 'next/server';
import { normaliseCommission, validateCommission, UNAVAILABLE_MESSAGE, SUCCESS_MESSAGE } from '@/lib/commission';
import { sendCommissionRequest } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Commission research requests (owner's brief, 24 Oct 2026). Checks every field with the same rules as the form
// (lib/commission.ts), then emails the request to contact@opengovt.uk with reply-to set to the client. The client is
// not emailed, and nothing is written to the database.
//
// At most 5 requests per IP an hour. This is the same in-memory pattern as proxy.ts: per server instance and reset on
// a cold start, so a best-effort limit, not a shared one. A filled honeypot field gets the normal success answer and
// no email.

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function overLimit(ip: string, now: number): boolean {
  // Drop timestamps older than the window, for this IP and (lazily) for the rest.
  for (const [key, times] of recent) {
    const kept = times.filter((t) => now - t < WINDOW_MS);
    if (kept.length) recent.set(key, kept); else recent.delete(key);
  }
  const times = recent.get(ip) ?? [];
  if (times.length >= MAX_PER_WINDOW) return true;
  recent.set(ip, [...times, now]);
  return false;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  if (overLimit(ip, Date.now())) {
    return NextResponse.json({ error: 'Too many requests. Please try again later or email contact@opengovt.uk.' }, { status: 429, headers: { 'Retry-After': '3600' } });
  }

  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const r = normaliseCommission(raw as Record<string, unknown>);

  // A bot filled the hidden field: answer as if it worked, send nothing.
  if (r.website) return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });

  const errors = validateCommission(r);
  if (Object.keys(errors).length) return NextResponse.json({ error: 'Please correct the highlighted fields.', errors }, { status: 400 });

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: UNAVAILABLE_MESSAGE }, { status: 503 });

  const result = await sendCommissionRequest(r);
  if (!result.sent) {
    console.error('commission request email failed:', result.reason);
    return NextResponse.json({ error: UNAVAILABLE_MESSAGE }, { status: 502 });
  }
  return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
}
