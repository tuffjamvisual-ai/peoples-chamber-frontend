-- UNDO of 2026-11-26a-council-audit-opinions.sql: the table is new, so dropping it puts everything back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TABLE public.council_audit_opinions;
COMMIT;
