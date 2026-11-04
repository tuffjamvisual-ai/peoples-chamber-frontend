-- Undo of 2026-11-04b-peer-registered-interests.sql: drops the table (first_seen_date and entries no longer on the
-- register cannot be rebuilt from the API, so take a copy first once it has been in use).
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-04b-peer-registered-interests-UNDO.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.peer_registered_interests;
COMMIT;
