-- Undo 2026-10-30h-bill-refresh-queue.sql: drops bill_refresh_queue (and any queued ids). Deploy the code from before
-- the Stage 2a part 2 commit first, or the nightly refresh and the bill scripts will report the missing table.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.bill_refresh_queue;
COMMIT;
