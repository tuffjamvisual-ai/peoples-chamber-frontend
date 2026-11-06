-- NOT APPLIED. Undoes 2026-11-06a-written-questions-date-answered-index.sql, or clears an INVALID index left by a failed build.
-- CONCURRENTLY, so reads and writes carry on; like the build it cannot run in a transaction and needs the session pooler
-- (port 5432): psql "$SESSION_URL" -X -f scripts/migrations/2026-11-06a-written-questions-date-answered-index-UNDO.sql
\set ON_ERROR_STOP off
SET statement_timeout = '60s';
SET lock_timeout = '5s';
DROP INDEX CONCURRENTLY IF EXISTS public.parliament_written_questions_date_answered_idx;
RESET statement_timeout;
RESET lock_timeout;
