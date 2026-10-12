import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DATA_SOURCES, CADENCE_MAX_AGE_DAYS, DEFAULT_ZERO_RUN_TOLERANCE, newestTimestamp, ageInDays } from '@/lib/data-freshness';
import { sendFreshnessAlert, sendDatabaseSizeAlert, sendBioReviewAlert, type StaleSource, type BioReviewFlag } from '@/lib/email';
import { getDatabaseSize } from '@/lib/database-size';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Freshness monitor. Alerts on the real failure mode — "the sync didn't run" —
// using the per-route heartbeat (sync_heartbeat), NOT content age, so a
// quarterly source that legitimately hasn't changed doesn't cry wolf.
//
// Alert  = a source WITH a heartbeat whose last run is older than its cadence
//          allows, OR whose last run returned a non-2xx status.
// Watch  = a source that runs fine but has returned zero rows for many runs
//          (upstream may have moved/changed) — surfaced in the JSON, not emailed.
// Info   = sources with no automated sync yet, or a configured route not yet
//          instrumented — reported, never alerted.
//
// Disk = the database size check (lib/database-size.ts): emails once a day while
//          disk use is over 5 GB (warning) or 7 GB (urgent) of the 8 GB disk.
// Bios  = written MP biographies flagged for review by the nightly syncs
//          (lib/bio-review.ts): all outstanding flags are listed; flags raised
//          in the last 24 hours are emailed.
//
// Guarded by CRON_SECRET. Returns the full dashboard as JSON for manual checks.
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const { data: hbRows } = await supabaseAdmin.from('sync_heartbeat').select('*');
  const hb = new Map<string, {
    route: string; last_ran_at: string; last_status: number | null; last_rows: number | null;
    last_nonzero_at: string | null; consecutive_zero_runs: number;
  }>((hbRows || []).map((r) => [r.route as string, r]));

  const alerts: StaleSource[] = [];
  const sources = [];

  for (const src of DATA_SOURCES) {
    const content = await newestTimestamp(src);
    const contentAgeDays = content ? ageInDays(content, now) : null;
    const maxAge = CADENCE_MAX_AGE_DAYS[src.cadence];

    let runStatus: 'ok' | 'overdue' | 'failing' | 'not-instrumented' | 'no-sync' = 'no-sync';
    let sinceRunDays: number | null = null;
    let h: ReturnType<typeof hb.get> = undefined;

    if (src.syncRoute) {
      h = hb.get(src.syncRoute);
      if (!h) {
        runStatus = 'not-instrumented';
      } else {
        sinceRunDays = ageInDays(new Date(h.last_ran_at), now);
        const failed = h.last_status != null && (h.last_status < 200 || h.last_status >= 300);
        const overdue = sinceRunDays > maxAge;
        runStatus = failed ? 'failing' : overdue ? 'overdue' : 'ok';
        if (failed || overdue) {
          alerts.push({
            label: src.label, page: src.page, route: src.syncRoute,
            ageDays: sinceRunDays, lastRanAt: h.last_ran_at, lastRows: h.last_rows, lastStatus: h.last_status,
          });
        }
      }
    }

    sources.push({
      key: src.key, page: src.page, label: src.label, cadence: src.cadence,
      syncRoute: src.syncRoute ?? null, runStatus,
      lastRanAt: h?.last_ran_at ?? null, lastStatus: h?.last_status ?? null, lastRows: h?.last_rows ?? null,
      sinceRunDays, zeroRunStreak: h?.consecutive_zero_runs ?? 0,
      zeroRunTolerance: src.zeroRunTolerance ?? DEFAULT_ZERO_RUN_TOLERANCE,
      contentNewest: content ? content.toISOString() : null, contentAgeDays,
    });
  }

  // Self-heal: for routes that are OVERDUE (the cron didn't run in time — the same
  // signature a silent timeout produces, since the heartbeat is only written on a
  // clean return), trigger the sync directly rather than only emailing. This turns
  // the reliably-firing 16:00 monitor into a fallback scheduler. We do NOT self-heal
  // 'failing' routes (they ran and returned non-2xx — re-running risks a tight error
  // loop; those still email for a human). Sequential, time-budgeted, so one slow sync
  // can't blow the monitor's own deadline; any not reached this run get another shot
  // tomorrow. A heal that returns 2xx clears its alert (the sync's own heartbeat is
  // now fresh); a heal that fails is left in the email so a human still sees it.
  const HEAL_BUDGET_MS = 240_000;
  const HEAL_PER_ROUTE_MS = 180_000;
  const healStart = Date.now();
  const heals: Array<{ route: string; triggered: boolean; status?: number; ok: boolean; reason?: string }> = [];
  const origin = new URL(req.url).origin;
  for (const s of sources) {
    const route = s.syncRoute;
    if (s.runStatus !== 'overdue' || !route) continue;
    if (Date.now() - healStart > HEAL_BUDGET_MS) {
      heals.push({ route, triggered: false, ok: false, reason: 'heal budget exhausted; will retry next run' });
      continue;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HEAL_PER_ROUTE_MS);
    try {
      const hr = await fetch(`${origin}${route}`, { headers: { authorization: `Bearer ${expected}` }, signal: ctrl.signal });
      const ok = hr.status >= 200 && hr.status < 300;
      heals.push({ route, triggered: true, status: hr.status, ok });
    } catch (e) {
      heals.push({ route, triggered: true, ok: false, reason: (e as Error).name === 'AbortError' ? 'sync exceeded heal timeout' : (e as Error).message });
    } finally {
      clearTimeout(timer);
    }
  }
  const healedRoutes = new Set(heals.filter((h) => h.ok).map((h) => h.route));

  // Zero-rows watch: runs successfully but keeps returning nothing for longer than
  // the source's tolerance — a quieter signal the upstream may have moved. Sitting-day
  // sources (Commons votes, register of interests) carry a higher tolerance so normal
  // weekend/recess quiet doesn't park them here. Surfaced, not emailed.
  const zeroRunWatch = sources
    .filter((s) => s.runStatus === 'ok' && s.zeroRunStreak >= s.zeroRunTolerance)
    .map((s) => ({ page: s.page, route: s.syncRoute, zeroRunStreak: s.zeroRunStreak, tolerance: s.zeroRunTolerance }));

  // Email only what self-heal did NOT recover.
  const emailAlerts = alerts.filter((a) => !a.route || !healedRoutes.has(a.route));
  const alertEmail = emailAlerts.length > 0
    ? await sendFreshnessAlert(emailAlerts)
    : { sent: false, reason: healedRoutes.size ? 'self_healed' : 'nothing_stale' };

  // Database disk check: reported every run, emailed only when over a threshold.
  const { size: databaseSize, error: databaseSizeError } = await getDatabaseSize();
  const databaseSizeEmail = databaseSize && databaseSize.level !== 'ok'
    ? await sendDatabaseSizeAlert(databaseSize)
    : { sent: false, reason: databaseSize ? 'below_threshold' : 'size_unavailable' };

  // Biography review flags (outstanding list + email for the last 24 hours).
  const bioReview: { outstanding: number; newLast24h: BioReviewFlag[]; all: BioReviewFlag[] } = { outstanding: 0, newLast24h: [], all: [] };
  {
    const { data: flagged } = await supabaseAdmin
      .from('mp_biography')
      .select('member_id, bio_review_reason, bio_review_flagged_at')
      .not('bio_review_reason', 'is', null)
      .order('bio_review_flagged_at', { ascending: false })
      .limit(500);
    const ids = (flagged || []).map((r) => r.member_id as number);
    const names = new Map<number, string>();
    if (ids.length) {
      const { data: mpRows } = await supabaseAdmin.from('mps').select('member_id, display_name').in('member_id', ids);
      for (const r of mpRows || []) names.set(r.member_id as number, (r.display_name as string) || String(r.member_id));
    }
    const dayAgo = now.getTime() - 24 * 3600 * 1000;
    bioReview.all = (flagged || []).map((r) => ({
      memberId: r.member_id as number,
      name: names.get(r.member_id as number) || String(r.member_id),
      reason: r.bio_review_reason as string,
      flaggedAt: r.bio_review_flagged_at as string,
    }));
    bioReview.outstanding = bioReview.all.length;
    bioReview.newLast24h = bioReview.all.filter((f) => f.flaggedAt && new Date(f.flaggedAt).getTime() >= dayAgo);
  }
  const bioReviewEmail = await sendBioReviewAlert(bioReview.newLast24h, bioReview.outstanding);

  return NextResponse.json({
    ok: true,
    bioReview,
    bioReviewEmail,
    databaseSize,
    databaseSizeError: databaseSizeError ?? null,
    databaseSizeEmail,
    checkedAt: now.toISOString(),
    alertCount: alerts.length,
    emailedAlertCount: emailAlerts.length,
    selfHealed: [...healedRoutes],
    heals,
    alertEmail,
    zeroRunWatch,
    sources,
  });
}
