-- Undo 2026-10-30f-hansard-debates.sql: drops hansard_debates (and its data), the debate order index and the four
-- new columns of hansard_contributions (their data too). The rows and other columns of hansard_contributions stay.
-- Deploy the code from before the Stage 1 commit first, or the archive sync will fail on the missing columns.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.hansard_debates;
DROP INDEX IF EXISTS public.hansard_contributions_debate_order_idx;
ALTER TABLE public.hansard_contributions
  DROP COLUMN IF EXISTS item_order,
  DROP COLUMN IF EXISTS item_type,
  DROP COLUMN IF EXISTS attributed_to,
  DROP COLUMN IF EXISTS value_html;
COMMIT;
