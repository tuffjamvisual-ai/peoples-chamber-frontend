-- Undo 2026-10-30g-contributions-removed-at.sql: drops removed_at (and which rows it marked). Deploy the code from
-- before the archive safeguard commit first, or the archive sync will fail on the missing column.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.hansard_contributions DROP COLUMN IF EXISTS removed_at;
COMMIT;
