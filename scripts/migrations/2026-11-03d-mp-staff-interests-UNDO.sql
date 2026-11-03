-- Undo of 2026-11-03d-mp-staff-interests.sql: drops public.mp_staff_interests (every row the sync wrote goes with it;
-- the next sync run after a redo fills it again from Parliament's register) and the sync's saved register id.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03d-mp-staff-interests-UNDO.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS public.mp_staff_interests;
DELETE FROM public.sync_cursor WHERE route = 'sync-staff-interests:register';

COMMIT;
