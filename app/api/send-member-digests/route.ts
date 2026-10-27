import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget } from '@/lib/sync-budget';
import { runDigests } from '@/lib/member-digest';
import { sendMemberDigest } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily at 07:24 UTC (job 74): the members' weekly digests due today (lib/member-digest.ts), at most 60 a day. Stops
// starting new members at 70 per cent of its time limit (lib/sync-budget.ts); anyone not reached is due again
// tomorrow (partial: true). A read or write failure returns 500, so the heartbeat and the freshness monitor show it.
const ROUTE = '/api/send-member-digests';

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const budget = new SyncBudget(maxDuration);
  try {
    const s = await runDigests({ db: supabaseAdmin, send: sendMemberDigest, shouldStop: () => budget.stopStarting(20_000) });
    return NextResponse.json({ ok: true, rows: s.sent, partial: s.stoppedByBudget, ...s });
  } catch (e) {
    console.error(`[${ROUTE}]`, (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat(ROUTE, GET_impl);
