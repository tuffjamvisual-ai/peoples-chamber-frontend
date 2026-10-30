import { NextResponse } from 'next/server';
import { revalidatePath } from '@/lib/refresh-count';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, isPoliteStop } from '@/lib/sync-budget';
import { findCurrentTables, fetchWorkbook, dis0108Year, buildRows, checkRows, newestRelease } from '@/lib/blue-badges-source';
import { refreshCouncilRoutes } from '@/lib/council-refresh';
import { isDryRun } from '@/lib/mp-refresh';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Weekly (owner's approval, 28 Oct 2026): DfT publishes Blue Badge scheme statistics once a year (the 2025 figures on
// 19 March 2026; next "winter 2026 to 2027"). Each run looks for the newest release with GOV.UK search, then reads the
// data tables page: when its DIS0108 is for a year newer than the newest stored, DIS0108 and DIS0105 are loaded into
// council_blue_badges (every earlier year is kept). Nothing is written if a check fails (lib/blue-badges-source.ts:
// England's row present, councils within rounding of England, every council code one of ours or an old county code).
// A late release is warned about by /api/monitor-freshness. Lost and stolen badges for England come from the release
// text and are not read here.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const budget = new SyncBudget(maxDuration);
  try {
    const { data: top, error: topErr } = await supabase.from('council_blue_badges').select('year').eq('area_level', 'england').order('year', { ascending: false }).limit(1);
    if (topErr) return NextResponse.json({ error: `council_blue_badges: ${topErr.message}` }, { status: 500 });
    const stored = top?.[0]?.year ? Number(String(top[0].year).slice(0, 4)) : null;

    // The search is for information only: if GOV.UK search fails, the data tables page is still read.
    let release: Awaited<ReturnType<typeof newestRelease>> = null;
    let releaseError: string | null = null;
    try { release = await newestRelease(budget); } catch (e) { releaseError = (e as Error).message; }
    const tables = await findCurrentTables(budget);
    const dis0108 = await fetchWorkbook(tables.dis0108, budget);
    const year = dis0108Year(dis0108);
    if (year == null) return NextResponse.json({ error: 'the DIS0108 title gives no year (its layout may have changed)', release }, { status: 502 });
    if (stored != null && year <= stored) {
      return NextResponse.json({ status: 'up_to_date', stored_year: stored, tables_year: year, tables_updated: tables.updatedAt, release, release_error: releaseError, rows_written: 0 });
    }

    // A local dry run (?dry=1, never on production) stops here: a newer release was found, so the council pages would be refreshed.
    if (isDryRun(req)) return NextResponse.json({ dry_run: true, status: 'would_update', would_refresh: ['/councils/[slug]'] });
    const population = await fetchWorkbook(tables.dis0105, budget);
    const rows = buildRows({ year, dis0108, population, sourceUrls: { dis0108: tables.dis0108, population: tables.dis0105 }, populationTable: 'DIS0105' });
    const { data: councils, error: cErr } = await supabase.from('councils').select('gss_code').eq('country', 'England');
    if (cErr) return NextResponse.json({ error: `councils: ${cErr.message}` }, { status: 500 });
    const check = checkRows(rows, new Set((councils ?? []).map((c) => c.gss_code as string).filter(Boolean)));
    if (!check.ok) return NextResponse.json({ error: 'checks_failed', problems: check.problems, year, release }, { status: 500 });

    const now = new Date().toISOString();
    const { error: upErr } = await supabase.from('council_blue_badges').upsert(rows.map((r) => ({ ...r, updated_at: now })), { onConflict: 'ons_code,year' });
    if (upErr) return NextResponse.json({ error: `council_blue_badges upsert: ${upErr.message}`, year }, { status: 500 });
    const { error: hlErr } = await supabase.from('hand_loaded_datasets')
      .update({ held_period: `${year} (held at 31 March ${year})`, loaded_on: now.slice(0, 10) }).eq('key', 'blue_badges');
    if (hlErr) console.error(`[sync-blue-badges] hand_loaded_datasets: ${hlErr.message}`);
    revalidatePath('/councils/blue-badges');
    refreshCouncilRoutes(rows.length);
    return NextResponse.json({ status: 'updated', year, previous_year: stored, rows_written: rows.length, england: check.england, council_sums: check.councilSums, release, release_error: releaseError });
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429 or the time budget: a clean stop (lib/sync-budget.ts)
    return NextResponse.json({ error: 'sync_failed', message: (e as Error).message }, { status: 502 });
  }
}

export const GET = withHeartbeat('/api/sync-blue-badges', GET_impl);
