-- Undo 2026-10-30e-council-byelections.sql: drops council_byelections (and its data). Nothing else depends on it.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.council_byelections;
COMMIT;
