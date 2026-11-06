-- NOT APPLIED. Undoes 2026-11-06g-written-question-indexes.sql, or clears an INVALID index left by a failed build.
-- CONCURRENTLY, so reads and writes carry on; needs the session pooler (port 5432), like the build.
\set ON_ERROR_STOP off
SET statement_timeout = '60s';
SET lock_timeout = '5s';
DROP INDEX CONCURRENTLY IF EXISTS public.parliament_written_questions_body_date_idx;
DROP INDEX CONCURRENTLY IF EXISTS public.parliament_written_questions_holding_idx;
DROP INDEX CONCURRENTLY IF EXISTS public.parliament_written_questions_corrected_idx;
DROP INDEX CONCURRENTLY IF EXISTS public.parliament_written_questions_unanswered_idx;
DROP INDEX CONCURRENTLY IF EXISTS public.parliament_written_questions_withdrawn_idx;
RESET statement_timeout;
RESET lock_timeout;
