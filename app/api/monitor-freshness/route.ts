import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DATA_SOURCES, CADENCE_MAX_AGE_DAYS, DEFAULT_ZERO_RUN_TOLERANCE, newestTimestamp, ageInDays } from '@/lib/data-freshness';
import { sendFreshnessAlert, sendDatabaseSizeAlert, sendBioReviewAlert, sendSewageReleaseAlert, type StaleSource, type BioReviewFlag } from '@/lib/email';
import { getDatabaseSize } from '@/lib/database-size';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { lastFireAtOrBefore } from '@/lib/cron-schedule';
import { cycleHours } from '@/lib/sync-cycles';
import type { CycleState } from '@/lib/sync-heartbeat';
import vercelConfig from '../../../vercel.json';
import { loadCursor } from '@/lib/sync-budget';
import { SPAD_MANUAL_CHECKS_ROUTE } from '@/lib/spad-background-sync';
import { FAILURES_PREFIX, FLAG_AFTER_RUNS, type ItemFailure } from '@/lib/sync-item-failures';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MEMBERS_REVIEW_AT = 300;

// Freshness monitor. Alerts on the real failure mode — "the sync didn't run" —
// using the per-route heartbeat (sync_heartbeat), NOT content age, so a
// quarterly source that legitimately hasn't changed doesn't cry wolf.
//
// Alert  = a source WITH a heartbeat whose last run is older than its cadence
//          allows, OR whose last run returned a non-2xx status.
//          Also any route or workflow step whose last run returned a 5xx, and any
//          vercel.json cron with no run recorded since its last scheduled time
//          (30 minutes' grace): a run that times out records nothing, so a
//          missed window is how a 504 shows up (owner's approval, 21 Oct 2026).
//          A run stopped by its time budget or a rate limit (200, partial: true) is healthy while the sync finishes a
//          full pass within its expected period (lib/sync-cycles.ts); once its partial runs go on longer than that,
//          it is alerted (job 79, 27 Oct 2026).
// Watch  = a source that runs fine but has returned zero rows for many runs
//          (upstream may have moved/changed) — surfaced in the JSON, not emailed.
// Info   = sources with no automated sync yet, or a configured route not yet
//          instrumented — reported, never alerted.
//
// Disk = the database size check (lib/database-size.ts): emails once a day while
//          disk use is over 5 GB (warning) or 7 GB (urgent) of the 8 GB disk.
// Sewage = storm overflow figures are loaded by hand once a year: checks the
//          data.gov.uk page for an Environment Agency annual return newer than
//          the year in sewage_overflows and emails daily until it is imported.
// Items = an item that failed FLAG_AFTER_RUNS runs in a row in a queue sync (lib/sync-item-failures.ts, owner, 28 Oct
//          2026): moved to the back of its queue by the sync; every one is named in the email with its error, daily,
//          until it succeeds.
// Bios  = written MP biographies flagged for review by the nightly syncs
//          (lib/bio-review.ts): all outstanding flags are listed; flags raised
//          in the last 24 hours are emailed.
//
// Guarded by CRON_SECRET. Returns the full dashboard as JSON for manual checks.
async function GET_impl(req: Request) {
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
    // One source's failed read is logged and treated as no data, as before, so the other sources are still checked.
    let content: Date | null = null;
    try { content = await newestTimestamp(src); } catch (e) { console.error('monitor-freshness:', (e as Error).message); }
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

  // Every cron and workflow step, whether or not it feeds a source above: a 5xx last run, or a cron with no run since
  // its last scheduled time.
  const alerted = new Set(alerts.map((a) => a.route));
  const cronRoutes = new Map<string, string>();
  for (const c of vercelConfig.crons) if (!c.path.includes('?')) cronRoutes.set(c.path, c.schedule);
  const HEARTBEATS_ADDED = new Date('2026-10-21T20:00:00Z');
  // The crons were restaggered on 27 Oct 2026 (job 79). A due time before then belongs to the old schedule, when the
  // job ran at a different minute, so it is not checked against the new one.
  const SCHEDULES_CHANGED = new Date('2026-10-27T04:00:00Z');
  // When each recently added cron went live (its deploy was Ready). Until its first scheduled run after that, a cron
  // has not missed anything, so a due time before it is not checked (owner, 27 Oct 2026). Add a cron here when it is
  // added to vercel.json.
  const CRON_ADDED: Record<string, string> = {
    '/api/send-member-digests': '2026-10-27T12:34:22Z',               // job 74; first run 28 Oct 07:24 UTC
    '/api/sweep-electoral-commission-donations': '2026-10-27T12:56:53Z', // first run 27 Oct 21:17 UTC
    '/api/sync-statutory-instruments-treaties': '2026-10-27T13:26:54Z',  // first run 28 Oct 02:45 UTC
    '/api/sync-spad-roster': '2026-10-28T08:20:29Z',                 // special advisers job; first run Tue 3 Nov 11:36 UTC
    '/api/sync-blue-badges': '2026-10-28T13:00:00Z',                 // Blue Badges job (pushed 28 Oct); first run Wed 4 Nov 11:57 UTC
    '/api/sync-children-in-care': '2026-10-28T17:00:00Z',            // children in care job (pushed 28 Oct); first run Thu 29 Oct 11:47 UTC
    '/api/sync-road-condition': '2026-10-28T17:00:00Z',              // road condition job (pushed 28 Oct); first run Fri 30 Oct 11:53 UTC
    '/api/sync-parliament-archive': '2026-10-29T22:00:00Z',          // Parliament archive backfill (pushed 29 Oct); every 10 minutes
    // Cache Stage 2b (committed to the work branch 30 Oct 2026; live at the next "go live"). This date covers a go live
    // on 30 or 31 Oct: the 31 Oct 05:15 run is not checked, the 1 Nov run is. A later go live moves it in that push.
    '/api/refresh-nightly-pages': '2026-10-31T05:45:00Z',            // nightly page refresh; first checked run 1 Nov 05:15 UTC
  };
  // Run expected, zero rows normal: alerted only for a missed run or a failed one, never for a run of zero rows.
  // The reshuffle tick changes nothing unless reshuffle mode is on.
  const ZERO_ROWS_NORMAL = new Set(['/api/sync-reshuffle-tick']);
  const missedRuns: Array<{ route: string; due: string; lastRanAt: string | null }> = [];
  for (const [route, schedule] of cronRoutes) {
    if (route === '/api/monitor-freshness' || alerted.has(route)) continue;
    const due = lastFireAtOrBefore(schedule, new Date(now.getTime() - 30 * 60_000));
    const h = hb.get(route);
    if (!due || (h && new Date(h.last_ran_at) >= due)) continue;
    if (due < SCHEDULES_CHANGED) continue;
    if (CRON_ADDED[route] && due < new Date(CRON_ADDED[route])) continue;
    // Crons given a heartbeat on 21 Oct 2026 have no row until their first run since then.
    if (!h && due < HEARTBEATS_ADDED) continue;
    missedRuns.push({ route, due: due.toISOString(), lastRanAt: h?.last_ran_at ?? null });
    alerts.push({
      label: route, page: route, route, ageDays: h ? ageInDays(new Date(h.last_ran_at), now) : null,
      lastRanAt: h?.last_ran_at ?? null, lastRows: h?.last_rows ?? null, lastStatus: h?.last_status ?? null,
      reason: `no run recorded since its ${due.toISOString().slice(0, 16).replace('T', ' ')} UTC schedule (timed out, or did not start)`,
    });
    alerted.add(route);
  }
  const serverErrors: Array<{ route: string; status: number; lastRanAt: string }> = [];
  for (const h of hb.values()) {
    if (alerted.has(h.route) || h.last_status == null || h.last_status < 500) continue;
    serverErrors.push({ route: h.route, status: h.last_status, lastRanAt: h.last_ran_at });
    alerts.push({
      label: h.route, page: h.route, route: h.route, ageDays: ageInDays(new Date(h.last_ran_at), now),
      lastRanAt: h.last_ran_at, lastRows: h.last_rows, lastStatus: h.last_status, reason: `last run failed with HTTP ${h.last_status}`,
    });
    alerted.add(h.route);
  }

  // Partial runs (job 79): lib/sync-heartbeat.ts keeps "cycle:<route>" in sync_cursor for every run that reports a
  // partial flag. Healthy while the current streak of partial runs is younger than the route's period.
  const cycles: Array<{ route: string; lastCompleteAt: string | null; partialSince: string | null; partialRuns: number; periodHours: number; overdue: boolean }> = [];
  {
    const { data: cycleRows, error: cycleErr } = await supabaseAdmin.from('sync_cursor').select('route, cursor').like('route', 'cycle:%');
    if (cycleErr) console.error('monitor-freshness: cycles:', cycleErr.message);
    for (const r of cycleRows ?? []) {
      const route = (r.route as string).slice('cycle:'.length);
      const c = r.cursor as CycleState;
      const periodHours = cycleHours(route, cronRoutes.get(route));
      const overdue = !!c.partialSince && now.getTime() - new Date(c.partialSince).getTime() > periodHours * 3_600_000;
      cycles.push({ route, lastCompleteAt: c.lastCompleteAt, partialSince: c.partialSince, partialRuns: c.partialRuns, periodHours, overdue });
      if (overdue && !alerted.has(route)) {
        const h = hb.get(route);
        alerts.push({
          label: route, page: route, route, ageDays: h ? ageInDays(new Date(h.last_ran_at), now) : null,
          lastRanAt: h?.last_ran_at ?? null, lastRows: h?.last_rows ?? null, lastStatus: h?.last_status ?? null,
          reason: `stopped part way on every run since ${c.partialSince!.slice(0, 16).replace('T', ' ')} UTC (${c.partialRuns} runs); no full pass within its expected ${Math.round(periodHours / 24)} days${c.lastCompleteAt ? `, last on ${c.lastCompleteAt.slice(0, 10)}` : ''}`,
        });
        alerted.add(route);
      }
    }
  }

  // Self-heal: for routes that are OVERDUE (the cron didn't run in time — the same
  // signature a silent timeout produces, since the heartbeat is only written on a
  // clean return), trigger the sync directly rather than only emailing. This turns
  // the reliably-firing daily monitor (17:03 UTC since 27 Oct 2026) into a fallback scheduler. We do NOT self-heal
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
    // GitHub workflow steps record their runs under /github-actions/...; they cannot be
    // started from here, so they are emailed rather than healed.
    if (!route.startsWith('/api/')) continue;
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
    .filter((s) => s.runStatus === 'ok' && s.zeroRunStreak >= s.zeroRunTolerance && !ZERO_ROWS_NORMAL.has(s.syncRoute ?? ''))
    .map((s) => ({ page: s.page, route: s.syncRoute, zeroRunStreak: s.zeroRunStreak, tolerance: s.zeroRunTolerance }));

  // Email only what self-heal did NOT recover.
  const emailAlerts = alerts.filter((a) => !a.route || !healedRoutes.has(a.route));

  // Members and the email plan (owner's decision, 25 Oct 2026, job 74): from 300 members with a confirmed address, a
  // warning line in every daily email to review the Resend plan (the free plan's 100 a day carries about 400 members
  // on weekly digests, report 72).
  const { count: memberCount, error: memberErr } = await supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('email_verified', true);
  if (memberErr) console.error('monitor-freshness: member count:', memberErr.message);
  if ((memberCount ?? 0) >= MEMBERS_REVIEW_AT) {
    emailAlerts.push({
      label: 'Members', page: '/preferences', route: null, ageDays: null, lastRanAt: null, lastRows: null, lastStatus: null,
      reason: `${(memberCount ?? 0).toLocaleString('en-GB')} members with a confirmed address (warning from ${MEMBERS_REVIEW_AT}): review the Resend plan before the weekly digests reach the free plan's 100 emails a day`,
    });
  }
  // Special adviser interests printed in annual reports are read by hand: /api/sync-spad-roster saves a warning when a
  // department has a newer report than the one read (owner, 28 Oct 2026). A warning line, not a failed source.
  const spadChecks = await loadCursor<{ warnings: string[] }>(supabaseAdmin, SPAD_MANUAL_CHECKS_ROUTE, 30 * 86400_000).catch(() => null);
  for (const w of spadChecks?.warnings ?? []) {
    emailAlerts.push({ label: 'Special adviser interests (read by hand)', page: '/transparency/special-advisers', route: null, ageDays: null, lastRanAt: null, lastRows: null, lastStatus: null, reason: `warning: ${w}` });
  }
  // Items failing in a queue sync (lib/sync-item-failures.ts): one line each.
  const failingItems: Array<{ route: string; key: string } & ItemFailure> = [];
  {
    const { data: failRows, error: failErr } = await supabaseAdmin.from('sync_cursor').select('route, cursor').like('route', `${FAILURES_PREFIX}%`);
    if (failErr) console.error('monitor-freshness: failing items:', failErr.message);
    for (const r of failRows ?? []) {
      const route = (r.route as string).slice(FAILURES_PREFIX.length);
      for (const [key, f] of Object.entries((r.cursor as { items?: Record<string, ItemFailure> } | null)?.items ?? {})) {
        if (f.runs < FLAG_AFTER_RUNS) continue;
        failingItems.push({ route, key, ...f });
        emailAlerts.push({
          label: `${route}: ${f.label}`, page: route, route: null, ageDays: null, lastRanAt: null, lastRows: null, lastStatus: null,
          reason: `failed ${f.runs} runs in a row (${f.firstAt.slice(0, 16).replace('T', ' ')} to ${f.lastAt.slice(0, 16).replace('T', ' ')} UTC), last error: ${f.error}; moved to the back of the queue`,
        });
      }
    }
  }
  // Blue Badges (owner, 28 Oct 2026): DfT publishes once a year, the figures for 31 March of year Y in the winter of Y
  // to Y+1 (2025's on 19 March 2026). From 1 April of Y+2 with only Y held, the next release is late: a warning line
  // daily until /api/sync-blue-badges loads it.
  const blueBadges: { newestYear: number | null; lateFrom: string | null; late: boolean } = { newestYear: null, lateFrom: null, late: false };
  {
    const { data: bb, error: bbErr } = await supabaseAdmin.from('council_blue_badges').select('year').eq('area_level', 'england').order('year', { ascending: false }).limit(1);
    if (bbErr) console.error('monitor-freshness: blue badges:', bbErr.message);
    const y = bb?.[0]?.year ? Number(String(bb[0].year).slice(0, 4)) : null;
    if (y != null) {
      const lateFrom = new Date(Date.UTC(y + 2, 3, 1));
      Object.assign(blueBadges, { newestYear: y, lateFrom: lateFrom.toISOString().slice(0, 10), late: now >= lateFrom });
      if (now >= lateFrom) {
        emailAlerts.push({
          label: 'Blue Badges by council (DfT)', page: '/councils/blue-badges', route: null, ageDays: null, lastRanAt: null, lastRows: null, lastStatus: null,
          reason: `warning: DfT's Blue Badge figures for 31 March ${y + 1} were expected in the winter of ${y + 1} to ${y + 2} and have not been loaded; the newest held is 31 March ${y}`,
        });
      }
    }
  }
  // Children in care (owner, 28 Oct 2026): DfE publishes the figures for 31 March of year Y in November of Y. From 1
  // January of Y+2 with only Y held, the next release is late: a warning line daily until /api/sync-children-in-care
  // loads it.
  const childrenInCare: { newestYear: number | null; lateFrom: string | null; late: boolean } = { newestYear: null, lateFrom: null, late: false };
  {
    const { data: cic, error: cicErr } = await supabaseAdmin.from('council_children_in_care').select('year').eq('area_level', 'england').order('year', { ascending: false }).limit(1);
    if (cicErr) console.error('monitor-freshness: children in care:', cicErr.message);
    const y = cic?.[0]?.year ? Number(String(cic[0].year).slice(0, 4)) : null;
    if (y != null) {
      const lateFrom = new Date(Date.UTC(y + 2, 0, 1));
      Object.assign(childrenInCare, { newestYear: y, lateFrom: lateFrom.toISOString().slice(0, 10), late: now >= lateFrom });
      if (now >= lateFrom) {
        emailAlerts.push({
          label: 'Children in care by council (DfE)', page: '/councils/children-in-care', route: null, ageDays: null, lastRanAt: null, lastRows: null, lastStatus: null,
          reason: `warning: DfE's children looked after figures for 31 March ${y + 1} were expected in November ${y + 1} and have not been loaded; the newest held is 31 March ${y}`,
        });
      }
    }
  }
  // Road condition (owner, 28 Oct 2026): the year to March 2026 was the last red, amber and green year. The weekly check
  // (/api/sync-road-condition) records any PAS 2161 tables it finds on DfT's page; a line is emailed while they are there.
  const roadCondition: { checkedAt: string | null; pas2161Tables: string[] } = { checkedAt: null, pas2161Tables: [] };
  {
    const { data: rc, error: rcErr } = await supabaseAdmin.from('sync_cursor').select('cursor').eq('route', 'release:/api/sync-road-condition').maybeSingle();
    if (rcErr) console.error('monitor-freshness: road condition:', rcErr.message);
    const cur = rc?.cursor as { checkedAt?: string; pas2161Tables?: string[] } | undefined;
    Object.assign(roadCondition, { checkedAt: cur?.checkedAt ?? null, pas2161Tables: cur?.pas2161Tables ?? [] });
    if (roadCondition.pas2161Tables.length) {
      emailAlerts.push({
        label: 'Road condition by council (DfT)', page: '/councils/road-condition', route: null, ageDays: null, lastRanAt: null, lastRows: null, lastStatus: null,
        reason: `notice: DfT's road condition page now has new tables (${roadCondition.pas2161Tables.join('; ')}), probably the PAS 2161 series; they are not loaded automatically, as they cannot be compared with red, amber and green`,
      });
    }
  }
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

  // New Environment Agency storm overflow return (loaded by hand with scripts/import-sewage.js).
  const sewageRelease: { storedYear: number | null; latestListedYear: number | null; fileUrl: string | null; error?: string } = { storedYear: null, latestListedYear: null, fileUrl: null };
  let sewageReleaseEmail: { sent: boolean; reason?: string; id?: string } = { sent: false, reason: 'not_checked' };
  try {
    const { data: yr } = await supabaseAdmin.from('sewage_overflows').select('year').eq('source', 'EA').order('year', { ascending: false }).limit(1);
    sewageRelease.storedYear = (yr?.[0]?.year as number | undefined) ?? null;
    const page = await fetch('https://www.data.gov.uk/dataset/19f6064d-7356-466f-844e-d20ea10ae9fd/event-duration-monitoring-storm-overflows-annual-returns', { headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' }, signal: AbortSignal.timeout(20000) });
    if (!page.ok) throw new Error(`data.gov.uk ${page.status}`);
    const html = await page.text();
    for (const m of html.matchAll(/href="([^"]*EDM_(\d{4})_Storm_Overflow_Annual_Return\.zip[^"]*)"/gi)) {
      const y = Number(m[2]);
      if (sewageRelease.latestListedYear == null || y > sewageRelease.latestListedYear) { sewageRelease.latestListedYear = y; sewageRelease.fileUrl = m[1].replace(/&amp;/g, '&'); }
    }
    if (sewageRelease.latestListedYear == null) sewageReleaseEmail = { sent: false, reason: 'no_return_links_found' };
    else if (sewageRelease.storedYear != null && sewageRelease.latestListedYear > sewageRelease.storedYear && sewageRelease.fileUrl) {
      sewageReleaseEmail = await sendSewageReleaseAlert(sewageRelease.latestListedYear, sewageRelease.storedYear, sewageRelease.fileUrl);
    } else sewageReleaseEmail = { sent: false, reason: 'up_to_date' };
  } catch (e) {
    sewageRelease.error = (e as Error).message;
  }

  // Parliament archive progress (owner's approval, 29 Oct 2026), read only: rows in each archive table and each
  // source's cursor, finished_at and last_error. Reported in this JSON, never emailed; a failed read is noted, not fatal.
  const parliamentArchive = await (async () => {
    try {
      const [q, sp, st] = await Promise.all([
        supabaseAdmin.from('parliament_written_questions').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('hansard_contributions').select('ext_id', { count: 'exact', head: true }),
        supabaseAdmin.from('parliament_archive_sync_state').select('source, cursor, rows_done, finished_at, last_error, last_run_at'),
      ]);
      // Debates from our own database, Stage 1 (owner, 30 Oct 2026): backfill progress from hansard_debates and the
      // debates cursor (with_items and parents_filled are counted by the sync as each record is first stored), the
      // text changes found by re-fetches, and the monthly check of 20 settled debates.
      const hd = () => supabaseAdmin.from('hansard_debates').select('guid', { count: 'exact', head: true });
      const [all, settled, gone, incomplete] = await Promise.all([hd(), hd().not('settled_at', 'is', null), hd().not('gone_at', 'is', null), hd().eq('incomplete', true)]);
      const ds = (st.data ?? []).find((r) => r.source === 'debates');
      const dc = (ds?.cursor ?? {}) as Record<string, unknown>;
      const debates = all.error ? { error: all.error.message } : {
        stored: all.count ?? null, withItems: Number(dc.with_items) || 0, parentsFilled: Number(dc.parents_filled) || 0,
        settled: settled.count ?? null, gone: gone.count ?? null, incomplete: incomplete.count ?? null,
        backfillDate: typeof dc.date === 'string' ? dc.date : null, backfillFinishedAt: ds?.finished_at ?? null,
        textChanges: Number(dc.text_changes_total) || 0, monthlyCheck: dc.monthly ?? null,
      };
      return { writtenQuestions: q.count ?? null, speeches: sp.count ?? null, debates, sources: st.data ?? [], error: q.error?.message ?? sp.error?.message ?? st.error?.message ?? null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  })();

  return NextResponse.json({
    ok: true,
    parliamentArchive,
    bioReview,
    bioReviewEmail,
    sewageRelease,
    sewageReleaseEmail,
    databaseSize,
    databaseSizeError: databaseSizeError ?? null,
    databaseSizeEmail,
    checkedAt: now.toISOString(),
    alertCount: alerts.length,
    missedRuns,
    serverErrors,
    cycles,
    failingItems,
    blueBadges,
    childrenInCare,
    roadCondition,
    members: { confirmed: memberCount ?? null, reviewResendPlanAt: MEMBERS_REVIEW_AT },
    emailedAlertCount: emailAlerts.length,
    selfHealed: [...healedRoutes],
    heals,
    alertEmail,
    zeroRunWatch,
    zeroRowsNormal: [...ZERO_ROWS_NORMAL],
    sources,
  });
}

export const GET = withHeartbeat('/api/monitor-freshness', GET_impl);
