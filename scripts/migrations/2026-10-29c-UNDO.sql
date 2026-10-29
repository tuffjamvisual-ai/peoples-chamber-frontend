-- Undo 2026-10-29c-editorials-order.sql: drops only the two columns it added.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.editorials
  DROP COLUMN IF EXISTS registry_order,
  DROP COLUMN IF EXISTS topic_positions;
COMMIT;
