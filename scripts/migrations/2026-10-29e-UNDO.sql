-- Undo 2026-10-29e-pac-status.sql: drops the status view and the completed reports table only (and its data).
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP VIEW IF EXISTS public.pac_recommendation_status;
DROP TABLE IF EXISTS public.pac_progress_completed_reports;
COMMIT;
