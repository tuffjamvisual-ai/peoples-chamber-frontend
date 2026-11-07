-- UNDO for 2026-11-07g-pmqs-changed-at-index.sql: drops the partial index. Run outside a transaction block, on a session
-- connection (port 5432), as DROP INDEX CONCURRENTLY cannot run inside one. No data changes.
SET statement_timeout = '120s';
SET lock_timeout = '5s';
DROP INDEX CONCURRENTLY IF EXISTS public.pmqs_archive_exchanges_changed_at_idx;
RESET statement_timeout;
RESET lock_timeout;
