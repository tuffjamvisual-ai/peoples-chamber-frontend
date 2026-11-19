-- UNDO for 2026-11-19a-council-hmos.sql (and its load, 2026-11-19b): drops council_hmos (and any rows loaded into it)
-- and the hand_loaded_datasets row 'hmos'. Back up the table first if it holds data (\copy ... TO).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DELETE FROM public.hand_loaded_datasets WHERE key = 'hmos';
DROP TABLE IF EXISTS public.council_hmos;
COMMIT;
