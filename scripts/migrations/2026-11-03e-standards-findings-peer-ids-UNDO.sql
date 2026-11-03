-- Undo of 2026-11-03e-standards-findings-peer-ids.sql: puts member_id back to NULL on the three rows it set.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03e-standards-findings-peer-ids-UNDO.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

UPDATE mp_conduct_findings SET member_id = NULL WHERE case_ref = 'pcs-cmt-11353' AND member_id = 68;
UPDATE mp_conduct_findings SET member_id = NULL WHERE case_ref = 'pcs-cmt-15334' AND member_id = 140;
UPDATE mp_conduct_findings SET member_id = NULL WHERE case_ref = 'pcs-cmt-21390' AND member_id = 1441;

COMMIT;
