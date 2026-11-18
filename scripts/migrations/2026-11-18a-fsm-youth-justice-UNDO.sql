-- UNDO for 2026-11-18a-fsm-youth-justice.sql: drops the three tables (and any rows loaded into them) and the two
-- hand_loaded_datasets rows. Back up the tables first if they hold data (\copy ... TO).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DELETE FROM public.hand_loaded_datasets WHERE key IN ('free_school_meals', 'youth_justice');
DROP TABLE IF EXISTS public.youth_justice_services;
DROP TABLE IF EXISTS public.council_youth_first_entrants;
DROP TABLE IF EXISTS public.area_free_school_meals;
COMMIT;
