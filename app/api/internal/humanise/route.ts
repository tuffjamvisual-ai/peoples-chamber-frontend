import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { touchLastSeen } from '@/lib/touch-last-seen';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildSystemPrompt, buildUserMessage, MODES, type HumaniserMode, type RedditStance } from '@/app/internal/humaniser/prompt';

// Server-side call to Anthropic for the internal Humaniser tool (/internal/humaniser).
// Keeps ANTHROPIC_API_KEY off the client.
//
// Locked down 22 Oct 2026 (owner's approval, security batch A). Before this, any signed-in
// account could send any model, system prompt or tools through John's key. Now:
//  - Origin must be exactly https://www.opengovt.uk or https://opengovt.uk (a missing Origin is
//    refused). Off Vercel (a local build) the local origins are accepted too.
//  - The session's user must have users.is_admin = true (403 otherwise).
//  - The model and system prompt are fixed here. The client sends only the mode and its text;
//    any model, system, tools, tool_choice or messages it sends are ignored.
//  - max_tokens is fixed at 4096.
//  - At most DAILY_CAP calls per user per day, counted in public.humanise_usage before the call.

export const runtime = 'nodejs';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const DAILY_CAP = 50;
const MAX_INPUT_CHARS = 60_000;

const ALLOWED_ORIGINS = new Set(['https://www.opengovt.uk', 'https://opengovt.uk']);
const LOCAL_ORIGINS = new Set(['http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://localhost:3000', 'http://localhost:3001']);
const STANCES: RedditStance[] = ['agree', 'disagree', 'nuance', 'question'];

function err(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const onVercel = !!process.env.VERCEL_ENV;
  if (!origin || !(ALLOWED_ORIGINS.has(origin) || (!onVercel && LOCAL_ORIGINS.has(origin)))) {
    return err('Forbidden', 403);
  }

  const userId = getSessionUserId(req);
  if (!userId) return err('Sign in required to use the Humaniser.', 401);

  const { data: me, error: meErr } = await supabaseAdmin.from('users').select('is_admin').eq('id', userId).maybeSingle();
  if (meErr) return err('Could not check access just now.', 500);
  if (!me?.is_admin) return err('The Humaniser is for site administrators only.', 403);
  await touchLastSeen(userId);

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return err('Humaniser is not configured: ANTHROPIC_API_KEY is missing on the server.', 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err('Invalid JSON body.', 400);
  }

  const mode = body.mode as HumaniserMode;
  if (!MODES.some((m) => m.id === mode)) return err('Unknown mode.', 400);
  const input = typeof body.input === 'string' ? body.input : '';
  if (!input.trim()) return err('Nothing to rewrite.', 400);
  if (input.length > MAX_INPUT_CHARS) return err(`Text is too long (limit ${MAX_INPUT_CHARS.toLocaleString('en-GB')} characters).`, 400);
  const comment = typeof body.comment === 'string' ? body.comment.slice(0, 10_000) : undefined;
  const stance = STANCES.includes(body.stance as RedditStance) ? (body.stance as RedditStance) : undefined;

  // Count the call before making it, so a burst of requests cannot overshoot the cap.
  const { data: used, error: capErr } = await supabaseAdmin.rpc('humanise_take_call', { p_user_id: userId, p_cap: DAILY_CAP });
  if (capErr) return err('Could not check the daily limit just now.', 500);
  if (used == null) return err(`Daily limit reached (${DAILY_CAP} rewrites). It resets at midnight UTC.`, 429);

  const payload = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(mode),
    messages: [{ role: 'user', content: buildUserMessage(mode, input, { comment, stance }) }],
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
    return err('Upstream request failed: ' + message, 502);
  }
}
