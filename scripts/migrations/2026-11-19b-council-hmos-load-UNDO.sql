-- UNDO for 2026-11-19b-council-hmos-load.sql: empties council_hmos (the table and its register row stay; drop them with
-- 2026-11-19a-council-hmos-UNDO.sql).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DELETE FROM public.council_hmos;
COMMIT;
