import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { GEOGRAPHY_TYPES, fetchMonths, writeClaimantRows, loadCouncilCodes, type ClaimantRow } from '@/lib/claimant-count';
import { isPoliteStop } from '@/lib/sync-budget';
import { refreshCouncilRoutes } from '@/lib/council-refresh';
import { isDryRun } from '@/lib/mp-refresh';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: rewrite the latest 3 months of the ONS Claimant Count for every
// council from Nomis (NM_162_1). ONS publishes monthly and can revise the
// previous month, so re-fetching 3 months picks up new months and
// revisions. Full history is loaded once by
// scripts/import-council-claimant-count.ts. Nothing is written if any area
// code doesn't match the councils table.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { codes } = await loadCouncilCodes(supabase);
    const rows: ClaimantRow[] = [];
    const unmatched: string[] = [];
    for (const geo of GEOGRAPHY_TYPES) {
      const r = await fetchMonths(geo, [0, 1, 2], codes);
      rows.push(...r.rows);
      unmatched.push(...r.unmatched);
    }
    if (unmatched.length) return NextResponse.json({ error: 'unmatched_area_codes', codes: unmatched }, { status: 500 });
    const councils = new Set(rows.map((r) => r.council_gss_code)).size;
    if (councils < codes.size * 0.95) return NextResponse.json({ error: 'too_few_councils', councils, expected: codes.size }, { status: 502 });
    const months = [...new Set(rows.map((r) => r.month))].sort();
    // Release month check (owner, 30 Oct 2026, cache Stage 2a part 4): it rewrote every council daily. Now it writes only
    // when Nomis has a month newer than the newest stored one (the monthly release, which also revises the two months
    // before it), and then refreshes the council pages.
    const { data: top, error: topErr } = await supabase.from('council_claimant_count').select('month').order('month', { ascending: false }).limit(1);
    if (topErr) return NextResponse.json({ error: `council_claimant_count: ${topErr.message}` }, { status: 500 });
    const storedMonth = top?.[0]?.month ? String(top[0].month).slice(0, 10) : null;
    const newestMonth = months[months.length - 1] ?? null;
    if (storedMonth && newestMonth && newestMonth <= storedMonth) {
      return NextResponse.json({ status: 'up_to_date', stored_month: storedMonth, newest_month: newestMonth, rows_written: 0 });
    }
    // A local dry run (?dry=1, never on production) stops here: a newer release was found, so the council pages would be refreshed.
    if (isDryRun(req)) return NextResponse.json({ dry_run: true, status: 'would_update', would_refresh: ['/councils/[slug]'] });
    const written = await writeClaimantRows(supabase, rows);
    const refreshed = refreshCouncilRoutes(written);
    return NextResponse.json({ status: 'updated', months, previous_month: storedMonth, councils, rows_written: written, refreshed });
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ error: 'sync_failed', message: (e as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-claimant-count', GET_impl);
