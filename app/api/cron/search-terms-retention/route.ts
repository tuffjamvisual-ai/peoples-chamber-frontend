// Search term log retention (owner approved, Cowork ENTRY 375 item 2): once a day, deletes every public.search_terms row
// older than 13 months, the equivalent of
//   delete from public.search_terms where at_hour < now() - interval '13 months';
// (lib/search-terms.ts retentionCutoff). Scheduled in vercel.json; refused without "Authorization: Bearer <CRON_SECRET>",
// like the other scheduled routes; its runs are recorded in sync_heartbeat, so the freshness monitor sees a missed run.
import { NextResponse } from 'next/server';
import { bearerMatches } from '@/lib/cron-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { retentionCutoff } from '@/lib/search-terms';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function GET_impl(req: Request) {
  if (!bearerMatches(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const cutoff = retentionCutoff();
  const { error, count } = await supabaseAdmin.from('search_terms').delete({ count: 'exact' }).lt('at_hour', cutoff);
  if (error) {
    console.error('search-terms-retention:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ ok: true, cutoff, deleted: count ?? 0, rows: count ?? 0 }, { headers: { 'Cache-Control': 'no-store' } });
}

export const GET = withHeartbeat('/api/cron/search-terms-retention', GET_impl);
