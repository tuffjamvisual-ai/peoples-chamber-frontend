-- Undo 2026-10-30i-sync-heartbeat-refresh.sql: drops the five refresh columns of sync_heartbeat (the runs' other
-- columns stay). Deploy the code from before the Stage 2a part 4 commit first; until then its writes of these columns
-- fail quietly (they never fail a sync).
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.sync_heartbeat
  DROP COLUMN IF EXISTS last_changed,
  DROP COLUMN IF EXISTS last_refresh_sent,
  DROP COLUMN IF EXISTS last_refresh_status,
  DROP COLUMN IF EXISTS last_refresh_error,
  DROP COLUMN IF EXISTS last_refresh_at;
COMMIT;
