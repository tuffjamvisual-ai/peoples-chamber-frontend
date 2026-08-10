import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';

// Server-side proxy for the internal Humaniser tool (/internal/humaniser).
// Keeps ANTHROPIC_API_KEY off the client and lets the browser reach Anthropic
// (which blocks direct browser calls). It transparently forwards the request
// body to the Messages API and returns the response unchanged, so the client
// component's existing response parsing (data.content / data.error) is untouched.
//
// Gated by a valid signed session cookie (the same site-wide auth) AND origin,
// so a paid endpoint can't be triggered by anyone who finds the unlisted URL.
// Identity comes only from the httpOnly cookie; the browser sends it on this
// same-origin fetch automatically. Also token-capped. No working Next 16
// middleware in this project, so the gate lives in the route.

export const runtime = 'nodejs';

const ALLOWED_HOST_FRAGMENTS = [
  'opengovt.uk',
  'thepeopleschamber.uk',
  'vercel.app',
  'localhost',
  '127.0.0.1',
];

export async function POST(req: NextRequest) {
  // Only allow calls that appear to originate from our own site.
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  const allowed = !origin || ALLOWED_HOST_FRAGMENTS.some((h) => origin.includes(h));
  if (!allowed) {
    return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  // Require a logged-in session (signed httpOnly cookie). Stops the paid endpoint
  // being triggered by anyone who reaches the unlisted URL without signing in.
  const userId = getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: { message: 'Sign in required to use the Humaniser.' } }, { status: 401 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: { message: 'Humaniser is not configured: ANTHROPIC_API_KEY is missing on the server.' } },
      { status: 500 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body.' } }, { status: 400 });
  }

  // Clamp max_tokens so the endpoint can't be pushed to huge/expensive outputs.
  const payload = {
    ...body,
    max_tokens: Math.min(Number(body?.max_tokens) || 4096, 8192),
  };

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: { message: 'Upstream request failed: ' + message } }, { status: 502 });
  }
}
