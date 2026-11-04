-- Undo of 2026-11-04e-mp-staff-interests-history.sql: removes the added columns and index. Rows from earlier editions,
-- if the staff register sync has run, should be deleted first (is_current = false).
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP INDEX public.mp_staff_interests_member_current_idx;
ALTER TABLE public.mp_staff_interests
  DROP COLUMN staff_identifier, DROP COLUMN published_date,
  DROP COLUMN first_seen_date, DROP COLUMN last_seen_date, DROP COLUMN is_current;
COMMIT;
