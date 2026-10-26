import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { runCommonsPressReleasesSync } from '@/lib/commons-press-releases-sync';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// House of Commons committee "press releases". GOV.UK's press-release feed
// (sync-press-releases) only carries ministerial-department releases; it does
// not carry anything from Parliament. The parliament.uk website and its RSS
// feeds sit behind a Cloudflare challenge, so a serverless function cannot
// fetch them. The Committees API subdomain, however, returns clean JSON with
// no challenge, so we source committee reports from there.
//
// We keep only genuine report-style publications (Report / Special Report),
// Commons house only, and drop the noise (correspondence letters, formal
// minutes, written/scrutiny evidence). Each report is stored in the shared
// press_releases table so it renders on /transparency/press-releases and its
// own on-site /news/[slug] page alongside the GOV.UK releases, labelled by
// committee. Rows are distinguished from GOV.UK rows by the parliament.uk
// domain in gov_url, which also drives per-source retention. Added 2026-07-10.
//
// The work is in lib/commons-press-releases-sync.ts (26 Oct 2026, report 79): pages of 20, a 20 s limit per request,
// a 50 s budget, and a saved position so a run stopped by the budget is carried on by the next one.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }

  try {
    const { status, body } = await runCommonsPressReleasesSync({ supabase: createClient(url, key) });
    return NextResponse.json(body, { status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-commons-press-releases', GET_impl);
