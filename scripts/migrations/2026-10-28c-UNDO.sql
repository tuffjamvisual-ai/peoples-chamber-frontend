-- Undo 2026-10-28c: removes spad_minister_status (the weekly sync fills it again).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE public.spad_minister_status;
COMMIT;
