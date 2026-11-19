-- UNDO for 2026-11-19c-search-terms.sql: drops public.search_terms and every search logged in it (its index goes with
-- it). Deploy the code without /api/search-log and /api/cron/search-terms-retention first, or both will log errors.
-- Back up first if it holds rows the owner wants kept:
--   \copy (SELECT * FROM public.search_terms ORDER BY id) TO 'search_terms-backup.csv' WITH (FORMAT csv, HEADER)
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.search_terms;
COMMIT;
