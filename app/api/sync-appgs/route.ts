// Weekly cron: refreshes appgs + appg_officers + appg_funders from mySociety's published dataset
// "APPG Groups and Memberships" (CC BY 4.0). Owner's brief, 3 Nov 2026: in place of ~650 GitHub file downloads, one
// datapackage.json (stop when its version was synced already) and, for a new version, register.csv and members.csv.
// The parsing, comparison and writes live in lib/appg-dataset.js, shared with the CLI (scripts/sync-appgs.js).
// Only changes are written; the MPs who are officers of a changed group (before or after) have their pages refreshed.
// ?dry=1 (local tests only) writes nothing.
//
// Schedule: '47 14 * * 1' (Monday 14:47 UTC).

import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';
import { politeFetch, DOWNLOAD_TIMEOUT_MS } from '@/lib/sync-budget';
import { refreshMps, isDryRun } from '@/lib/mp-refresh';
import { noteChanged } from '@/lib/refresh-count';
import { runAppgSync } from '@/lib/appg-dataset';

export const dynamic = 'force-dynamic';
export const maxDuration = 240;

async function fetchText(url: string): Promise<string> {
  const res = await politeFetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const startedAt = Date.now();
  const dry = isDryRun(req);
  let run: Awaited<ReturnType<typeof runAppgSync>>;
  try {
    run = await runAppgSync({ supabase, fetchText, dry, log: (m: string) => console.log(`appgs sync: ${m}`) });
  } catch (e) {
    const err = e as Error & { stage?: string; written?: unknown };
    return NextResponse.json({ error: err.message, stage: err.stage ?? 'download', written: err.written ?? null }, { status: 500 });
  }

  const changedMps = run.changedMps as Set<number>;
  noteChanged(dry ? 0 : changedMps.size);
  const mpRefresh = !dry && changedMps.size ? refreshMps(changedMps) : null;

  return NextResponse.json({
    ok: true,
    ...run.result,
    mp_refresh: mpRefresh,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}

export const GET = withHeartbeat('/api/sync-appgs', GET_impl);
