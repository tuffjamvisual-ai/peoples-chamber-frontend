// Weekly cron: refreshes mp_staff_interests from the newest House of Commons register of interests of MPs' staff
// (Parliament's interests API, Open Parliament Licence v3.0). Owner's brief, 3 Nov 2026. One request when the register
// is unchanged; for a new register, its zip of three CSVs. The parsing, comparison and writes live in
// lib/staff-interests.js, shared with the CLI (scripts/sync-staff-interests.js). Only changes are written; the MPs
// whose rows changed have their pages refreshed. ?dry=1 (local tests only) writes nothing.
//
// Schedule: '19 14 * * 2' (Tuesday 14:19 UTC).

import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';
import { politeFetch, DOWNLOAD_TIMEOUT_MS } from '@/lib/sync-budget';
import { refreshMps, isDryRun } from '@/lib/mp-refresh';
import { noteChanged } from '@/lib/refresh-count';
import { runStaffInterestsSync } from '@/lib/staff-interests';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const UA = 'opengovt-StaffRegisterSync/1.0 (+https://opengovt.uk)';

async function get(url: string): Promise<Response> {
  const res = await politeFetch(url, { headers: { 'User-Agent': UA } }, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}
const fetchText = async (url: string) => (await get(url)).text();
const fetchBytes = async (url: string) => new Uint8Array(await (await get(url)).arrayBuffer());

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
  let run: Awaited<ReturnType<typeof runStaffInterestsSync>>;
  try {
    run = await runStaffInterestsSync({ supabase, fetchText, fetchBytes, dry, log: (m: string) => console.log(`staff interests sync: ${m}`) });
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

export const GET = withHeartbeat('/api/sync-staff-interests', GET_impl);
