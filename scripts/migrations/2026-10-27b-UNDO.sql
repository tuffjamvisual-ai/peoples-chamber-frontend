-- Undo for 2026-10-27b-statutory-instruments-treaties.sql: removes the two tables, the department view and the sync's
-- saved position. The data can be loaded again from the APIs with scripts/load-statutory-instruments-treaties.ts.
-- statutory_instrument (singular, the Commons divisions on instruments) is not touched.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP VIEW IF EXISTS public.statutory_instrument_departments;
DROP TABLE IF EXISTS public.statutory_instruments;
DROP TABLE IF EXISTS public.treaties;
DELETE FROM public.sync_cursor WHERE route = '/api/sync-statutory-instruments-treaties';
COMMIT;
