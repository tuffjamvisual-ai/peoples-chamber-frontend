-- 2026-10-30h: a small queue of bills to refresh (owner's approval, 30 Oct 2026, cache Stage 2a part 2). Additive only
-- (rule 10): one new table; nothing existing changes, so the code on main is unaffected.
-- The nightly GitHub bill sync (sync-bills-incremental.js) and the bill division matcher (scripts/sync-bill-divisions.js)
-- ask the site to refresh the bills they changed (POST /api/revalidate-bills). GitHub's calls are often refused by
-- Vercel's bot protection, so when the call fails they add the bill ids here instead, and /api/refresh-nightly-pages
-- (05:15 UTC, inside the site) refreshes those bills and empties the queue.
-- Needs: the Stage 2a part 2 commit (the scripts write it, the cron reads and deletes it).
-- Undo: 2026-10-30h-UNDO.sql.
-- Secured like every table since the Phase 2 lock down (2026-10-28j): RLS on, no policies, nothing granted to anon or
-- authenticated.

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.bill_refresh_queue (
  bill_id   int PRIMARY KEY,                 -- bill.id, the /bills/<id> page
  queued_at timestamptz NOT NULL DEFAULT now(),
  source    text                             -- the script that queued it
);
COMMENT ON TABLE public.bill_refresh_queue IS
  'Bills whose pages need a refresh, queued by the nightly GitHub bill scripts when the site refused their call; emptied by /api/refresh-nightly-pages.';

ALTER TABLE public.bill_refresh_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bill_refresh_queue FROM anon, authenticated;

COMMIT;
