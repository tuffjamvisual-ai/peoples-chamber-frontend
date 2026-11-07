-- UNDO for 2026-11-07j-written-questions-stats-index.sql. Drops the covering index. Run outside a transaction
-- block on a session connection (port 5432): DROP INDEX CONCURRENTLY cannot run inside one. No data changes.
SET statement_timeout = '120s';
SET lock_timeout = '5s';
DROP INDEX CONCURRENTLY IF EXISTS public.parliament_written_questions_body_stats_idx;
RESET statement_timeout;
RESET lock_timeout;
