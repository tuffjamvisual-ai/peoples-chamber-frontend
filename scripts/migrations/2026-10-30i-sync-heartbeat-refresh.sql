-- 2026-10-30i: refresh results on sync_heartbeat (owner's approval, 30 Oct 2026, cache Stage 2a part 4). Additive only
-- (rule 10): five nullable columns on an existing table; nothing else changes, so the code on main keeps working (it
-- never reads or writes them).
-- Pages now keep for a week and are refreshed by the syncs that change their data. After each run withHeartbeat
-- (lib/sync-heartbeat.ts, counts from lib/refresh-count.ts) records how many rows the sync changed, how many paths, tags
-- or patterns it sent, and the result; hand and GitHub scripts record theirs through scripts/lib/refresh-site.js
-- under "/scripts/<name>". The freshness monitor alerts when a sync changed rows but its refresh failed or sent nothing.
-- Needs: the Stage 2a part 4 commit.
-- Undo: 2026-10-30i-UNDO.sql.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.sync_heartbeat
  ADD COLUMN last_changed        int,          -- rows the last run changed
  ADD COLUMN last_refresh_sent   int,          -- paths, tags or patterns it sent to be refreshed
  ADD COLUMN last_refresh_status int,          -- 200, 202 (queued for the 05:15 refresh) or the failure (500, or the HTTP status)
  ADD COLUMN last_refresh_error  text,
  ADD COLUMN last_refresh_at     timestamptz;
COMMIT;
