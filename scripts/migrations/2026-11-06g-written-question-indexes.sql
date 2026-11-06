-- Applied to production on 6 Nov 2026 at 12:47:38 GMT, on the owner's yes. Run after 2026-11-06f, because three of these use its columns.
-- Written questions pages. A small department walks the whole date index to find its rows: 3,024 ms read cold for the department with
-- one question, 670 ms for one with three. So one index by department, and four small partial ones for the rarer filters.
-- The same safe pattern as 2026-11-06a: CONCURRENTLY cannot run in a transaction, so read only checks either side, session timeouts
-- reset straight afterwards, and the session pooler (port 5432), never 6543. Run:
--   psql "$SESSION_URL" -X -f scripts/migrations/2026-11-06g-written-question-indexes.sql
-- A failed build can leave an INVALID index: run the UNDO file, then try again. Undo: 2026-11-06g-written-question-indexes-UNDO.sql

\set ON_ERROR_STOP on

BEGIN READ ONLY;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE n integer;
BEGIN
  IF to_regclass('public.parliament_written_questions_body_date_idx') IS NOT NULL
     OR to_regclass('public.parliament_written_questions_holding_idx') IS NOT NULL
     OR to_regclass('public.parliament_written_questions_corrected_idx') IS NOT NULL
     OR to_regclass('public.parliament_written_questions_unanswered_idx') IS NOT NULL
     OR to_regclass('public.parliament_written_questions_withdrawn_idx') IS NOT NULL THEN
    RAISE EXCEPTION 'an index already exists: check it is valid, or run the UNDO file first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parliament_written_questions' AND column_name = 'date_holding_answer') THEN
    RAISE EXCEPTION 'run 2026-11-06f first';
  END IF;
  SELECT count(*) INTO n FROM pg_stat_activity
   WHERE datname = current_database() AND pid <> pg_backend_pid() AND xact_start < now() - interval '60 seconds';
  IF n > 0 THEN RAISE EXCEPTION '% transactions open for over 60 seconds: try again later', n; END IF;
END $$;
COMMIT;

-- BUILD
-- From here a failure must not stop the file, so that the RESETs always run on this connection.
\set ON_ERROR_STOP off
SET statement_timeout = '60s';
SET lock_timeout = '5s';
CREATE INDEX CONCURRENTLY parliament_written_questions_body_date_idx
  ON public.parliament_written_questions (answering_body_id, date_tabled DESC, id DESC);
CREATE INDEX CONCURRENTLY parliament_written_questions_holding_idx
  ON public.parliament_written_questions (date_tabled DESC, id DESC) WHERE date_holding_answer IS NOT NULL;
CREATE INDEX CONCURRENTLY parliament_written_questions_corrected_idx
  ON public.parliament_written_questions (date_tabled DESC, id DESC) WHERE date_answer_corrected IS NOT NULL;
CREATE INDEX CONCURRENTLY parliament_written_questions_unanswered_idx
  ON public.parliament_written_questions (date_tabled DESC, id DESC) WHERE date_answered IS NULL;
CREATE INDEX CONCURRENTLY parliament_written_questions_withdrawn_idx
  ON public.parliament_written_questions (date_tabled DESC, id DESC) WHERE is_withdrawn;
RESET statement_timeout;
RESET lock_timeout;
\set ON_ERROR_STOP on

BEGIN READ ONLY;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE valid integer;
BEGIN
  SELECT count(*) INTO valid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
   WHERE i.indisvalid AND i.indisready AND c.relname IN ('parliament_written_questions_body_date_idx', 'parliament_written_questions_holding_idx', 'parliament_written_questions_corrected_idx', 'parliament_written_questions_unanswered_idx', 'parliament_written_questions_withdrawn_idx');
  IF valid <> 5 THEN RAISE EXCEPTION 'only % of 5 indexes are valid: run the UNDO file, then try again', valid; END IF;
END $$;
SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) AS size FROM pg_stat_user_indexes
 WHERE indexrelname LIKE 'parliament_written_questions_%' ORDER BY 1;
COMMIT;
