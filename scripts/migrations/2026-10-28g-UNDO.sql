-- Undo 2026-10-28g (and its loads, 2026-10-28h and 2026-10-28i): removes both tables and their hand_loaded_datasets rows.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE public.council_children_in_care;
DROP TABLE public.council_road_condition;
DELETE FROM public.hand_loaded_datasets WHERE key IN ('children_in_care', 'road_condition');
COMMIT;
