-- Undo of 2026-11-04a-peers.sql: drops the peers table (it holds only data copied from Parliament's Members API, which
-- scripts/load-peers.ts can load again). Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-04a-peers-UNDO.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.peers;
COMMIT;
