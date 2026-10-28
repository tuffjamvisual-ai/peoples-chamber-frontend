-- Undo 2026-10-28b: removes spad_interests and spad_post_appointments (both are filled again by the loads and
-- /api/sync-spad-roster). The earlier Cabinet Office lists stay in spad_appointments; to remove them, delete the
-- spad_releases rows other than the latest (their appointments go with them).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE public.spad_post_appointments;
DROP TABLE public.spad_interests;
COMMIT;
