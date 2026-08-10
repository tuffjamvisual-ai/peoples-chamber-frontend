# Decisions log

Running log of non-obvious engineering decisions and the reasoning behind them,
so a future session doesn't rediscover them cold.

## 2026-07-27 — Data freshness: monitor, government_contracts, mp_contributions

Background: an audit found several data-driven pages serving weeks/months-old
figures with nothing on the page saying so. Root cause was NOT one event — three
separate crons had silently stalled (APPGs 30 Apr, dept budgets/staffing 7 Jun,
mp_contributions 12 Jun) and two datasets had no automated sync at all. The
routes themselves worked; the crons just weren't firing. Real cause of the
stalls was never confirmed in a Vercel cron log — a redeploy re-registered them;
if any stalls again, check the Vercel dashboard cron history + the ~37-cron
plan limit before guessing.

Key insight that shaped everything: `updated_at` = last CONTENT change, not last
sync RUN. A sync that runs fine but finds no new data leaves `updated_at` old, so
monitoring on content age false-alarms on quarterly sources. The monitor
therefore alerts on a per-run HEARTBEAT, not content age.

**Shipped (all deployed + verified):**
- **Freshness monitor** — `sync_heartbeat` table + `record_sync_run` RPC (route,
  run time, HTTP status, row count, zero-run streak). `lib/sync-heartbeat.ts`
  exports `withHeartbeat(route, handler)` — wrap a sync's GET to auto-record. 7
  sync routes wrapped. `/api/monitor-freshness` (CRON_SECRET, daily 16:00) alerts
  by PAGE not table (`sendFreshnessAlert` in lib/email.ts → contact@opengovt.uk),
  surfaces a zero-rows watch in its JSON dashboard. Config registry:
  `lib/data-freshness.ts` (`DATA_SOURCES`) — single source both the monitor and
  the reader line read; add a table here to cover it. Verified via a backdated
  heartbeat → real alert email.
- **`<LastUpdated sourceKey=...>`** (`app/components/LastUpdated.tsx`) — reader
  freshness line from `max(timestamp)`, on all 9 single-source pages. Multi-source
  pages (`/mps/[id]` etc.) deliberately NOT given a line (a single date would hide
  a stalled source) — see queued footer.
- **government_contracts** — was 85% duplicates (33,479 of 39,611) from the old
  insert-only `scripts/sync-government-contracts.js`. Migration
  `scripts/migration-2026-07-27-government-contracts-ocds.sql` (two verified
  steps): backup → dedup (keep latest `updated_at`, tie-break low id) → verify 0
  residual → add `ocid`/`award_id`/`contract_id` + unique index (NULLS DISTINCT so
  legacy null rows coexist). New `/api/sync-government-contracts` upserts on the
  OCDS key, row-by-row fallback logs+skips a malformed record. Idempotency proven
  (0 dupes on re-run). Find a Tender rate-limits (429) after ~19 pages — expected,
  rolling 30-day window recovers next day.
- **mp_contributions** ("In the House" tab, `/mps/[id]`) — was orphaned; writer was
  hand-run `scripts/sync-mp-contributions.js`. Automated as
  `/api/sync-hansard-contributions` (NAMED DISTINCTLY: `/api/sync-mp-contributions`
  writes the SEPARATE `mp_contribution_totals`). Members API ContributionSummary,
  stalest-first (RPC `mp_contributions_stalest`), time-budgeted, upserts on
  existing `UNIQUE (member_id, debate_website_id)`. Schema already matched the page
  (superset) so no page change.
- Cadences matched to upstream (APPGs/budgets/staffing weekly, expenses quarterly,
  not daily); removed a false "synced weekly" note on the contractors page.

**Queued (nothing on fire):**
- Multi-source "data sources" footer for aggregate pages (`/mps/[id]`,
  `/departments/[slug]`, `/bills`) — list each dataset with its own date.
- `councils` sync route — no upstream source identified yet (stale 3 Jun, no cron).
- Drop `government_contracts_backup` (39,611 rows) after ~2026-08-03 if nothing broke.
- Legacy null-OCID government_contracts rows can be retired as they age out.

**Watch 2026-07-28:** confirm the 3 re-scheduled crons (dept budgets/staffing,
APPGs) fire; the government_contracts heartbeat should show a real row count on its
first scheduled run (not the 0 from the rate-limited manual retry). If a cron
doesn't fire, Vercel dashboard cron history — don't guess.

## 2026-07-24 — Reader VI poll: +500 seed votes added proportionally

**Change:** Incremented `reader_vi_tally` (the launch-baseline seed for the
`/polls/voting-intention` reader poll — "If a general election were held
tomorrow, how would you vote?") by 500, split in proportion to the then-current
displayed distribution. Applied as a direct DB `UPDATE` (single committed
transaction), NOT via `poll_vote` — the seed table is the deliberate mechanism
for aggregate additions without fake accounts.

Per-party additions (largest-remainder rounding, sums to exactly 500):
reform +120, labour +110, conservative +100, green +65, libdem +60, snp +15,
another +30, wouldn't +0. Seed total 3,450 → 3,950 (displayed 3,451 → 3,951).

**Why "displayed distribution" and not literal votes cast:** real reader
`poll_vote` rows number **1** (a single reform vote); the other ~3,450 are seed.
So "in proportion to votes already cast" could only sensibly mean the displayed
aggregate — allocating by real votes would have put all 500 on reform. The seed
still dwarfs genuine reader input, so these figures remain a launch baseline, not
a reader signal (the UI already says as much). [[voting-intention-tracker]]

**How the write was done:** the `SUPABASE_SERVICE_ROLE_KEY` is a Vercel
"sensitive" env var and pulls back empty via `vercel env pull`, so it can't be
used locally. Used the (non-sensitive) `DATABASE_URL` pooler connection from the
pulled prod env + `psql` instead. `/api/reader-vi` is `force-dynamic`, so the
change showed immediately with no deploy. The pulled env file (contained secrets)
was deleted after.

## 2026-07-24 — Bill indexability gated on bill-level division fields, not per-MP votes

**Change:** `app/bills/[id]/page.tsx` (`generateMetadata`) and `app/sitemap.ts`
now treat a bill as indexable when:

```
hasVotes || activeStage || isAct || hasDivision
```

where `isAct = bill.is_act === true` and `hasDivision = bill.commons_division_id != null`.
The boolean is byte-for-byte identical in both files and MUST stay in sync (page
says index/noindex; sitemap decides whether to list the URL — if they diverge you
get either "Submitted URL marked 'noindex'" in GSC, or 1,300 pages the sitemap
never surfaces for recrawl).

**Why:** The old rule only counted rows in `mp_division_votes`, which covers just
**71 distinct bills**. But `layout.tsx` writes meta descriptions like "MPs voted
320-250" from the bill's own `commons_division_id`/`commons_ayes`/`commons_noes`
fields — present on **~615 bills** — and **~695 bills** became Acts (`is_act`).
Result: ~695 Acts of Parliament and ~544 divisioned bills were displaying real
vote results on-page while emitting `robots: noindex`. Indexability was gated on
per-MP vote *sync completeness*, not on whether the bill mattered. Those are the
highest-value pages on the site (actual laws, actual recorded votes), so this bug
plausibly explains a large chunk of weak search visibility.

The fix routes around the sparse table by trusting the bill-level fields
`layout.tsx` already trusts. Genuinely inert dead-reading private members' bills
(~3,000, no division, never an Act) correctly stay noindexed — that was the
original soft-404 intent.

**Post-deploy recovery (don't judge by next-day numbers):** resubmit the sitemap
in Search Console; URL-Inspect + "Request Indexing" on ~5-10 flagship Acts to
force a fast recrawl; the other ~1,290 trickle back over weeks.

### Root cause underneath the root cause (data issue, not code — NOT fixed here)

`mp_division_votes` is gappy: 288,247 rows but only **71 distinct `bill_id`s**,
vs 615 bills that record a `commons_division_id`. The parlparse feed froze
mid-Jan 2026; the table is now fed by `sync-commons-votes-api` (live Commons
Votes API) but historical per-MP divisions were never backfilled. This fix does
not depend on that table, but anything **user-facing** that reads
`mp_division_votes` directly (per-MP vote breakdowns on a bill page, MP voting
records) will under-report for the ~544 bills that have a division but no synced
per-MP rows. Not urgent; log a backfill if that data ever goes user-facing.

## 2026-08-02 — Sync heartbeat: a timeout looked identical to a non-invocation

Background: `government_contracts` heartbeat froze at 30 Jul with `last_status =
200`. It read exactly like the 27-Jul stalls above ("cron didn't fire; a
redeploy/manual trigger fixes it") and got diagnosed that way a second time.
That was wrong. The table's write-by-hour showed 03:00 writes on 31 Jul AND 1
Aug — the cron **did** fire; the function ran, wrote a partial batch, and was
killed at the ~300s ceiling (`FUNCTION_INVOCATION_TIMEOUT`) **before** the
heartbeat write. Root cause: the 30-day Find-a-Tender window had grown to 45+
pages at ~10s/page, crossing 300s around 31 Jul. `maxDuration = 300` is the
plan ceiling site-wide, so raising it wasn't an option.

**The design gap this exposed:** `withHeartbeat` (lib/sync-heartbeat.ts) writes
the heartbeat only AFTER the handler returns. A hard timeout kill runs no
post-handler code, so it records nothing — **a timeout is indistinguishable from
a non-invocation at the heartbeat level.** That ambiguity is what caused the
same misdiagnosis twice.

**THE SENTENCE THAT STOPS A THIRD MISDIAGNOSIS:** A function killed at the
timeout ceiling before the heartbeat write is indistinguishable from a
non-invocation at the heartbeat level. The budget guard prevents this by
ensuring a clean return before the ceiling. Any future heartbeat gap **with no
writes at the scheduled hour in Vercel's invocation logs** is a genuine
scheduler failure, not a timeout. (And a heartbeat that IS present but shows
zero rows is an upstream/content problem, not either.)

**Shipped (all deployed + verified live):**
- **Budget guard closes the gap permanently** — `sync-government-contracts` now
  stops paging and returns cleanly at `BUDGET_MS = 240_000` (before the 300s
  ceiling), so the heartbeat ALWAYS writes, even on a partial run. This is the
  structural fix: the function can no longer die silently. Also right-sized the
  default window 30→10 days (daily re-pull + rolling window = convergence) and
  added `?days=`/`?maxPages=` overrides for manual deep sweeps.
- **monitor-freshness is now trigger-then-escalate, not alert-then-wait** — the
  16:00 monitor (which fires reliably) triggers any `overdue` route directly
  (Bearer CRON_SECRET, sequential, time-budgeted) and only emails heals that
  FAIL. Alert-then-wait required a human to notice an email, diagnose, and
  manually trigger — which is exactly what happened this time and last. Does NOT
  self-heal `failing` (ran, non-2xx) routes — a genuinely erroring route
  shouldn't be hammered hourly.
- **Per-source `zeroRunTolerance`** in `lib/data-freshness.ts` — sitting-day
  sources (commons-votes-api, registered-interests) set to 14 so weekend/recess
  zero-row runs don't park permanently on the zero-run watch. Covers Parliament's
  weeks-long summer recess without masking a real failure during sitting periods.

**Explicitly NOT built (revisit triggers noted):**
- **Cursor-based resumable pagination.** The engineering-complete version
  (persist `next`, chunk across invocations for guaranteed single-pass coverage).
  The rolling window + daily convergence + budget guard handles current volume
  well enough and never silently dies. Build it only if Find a Tender's
  volume/latency grows enough that the 10-day window *regularly* can't drain.
- **Recess-aware (term-time-tighter) zero-run tolerance.** A flat 14 is fine;
  revisit only if term-time false-negatives become a real gap.

**Backfill mechanics (for next time):** `vercel env pull` returns
`SUPABASE_SERVICE_ROLE_KEY=""` (sensitive vars redacted), so local service-role
writes fail. Use `DATABASE_URL` (present in the pulled env) with `pg` for direct
writes, and dedupe rows by the unique key within each batch before `ON CONFLICT`
— a single statement can't affect the same key twice.
