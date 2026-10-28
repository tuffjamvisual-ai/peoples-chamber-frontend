-- Undo 2026-10-28d (and its load, 2026-10-28e): removes council_blue_badges and its hand_loaded_datasets row.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE public.council_blue_badges;
DELETE FROM public.hand_loaded_datasets WHERE key = 'blue_badges';
COMMIT;
