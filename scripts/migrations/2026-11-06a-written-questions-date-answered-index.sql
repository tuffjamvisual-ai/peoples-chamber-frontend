-- NOT APPLIED. Prepared 6 Nov 2026; waiting for the owner's yes.
-- An index on parliament_written_questions(date_answered). Today every read by answered date scans the whole table (37,125
-- pages): the freshness check's 7 days and the weekly pass's 90. CONCURRENTLY, so reads and writes carry on during the build.
--
-- CREATE INDEX CONCURRENTLY refuses to run inside a transaction, so this file cannot be BEGIN READ WRITE ... COMMIT and cannot
-- use SET LOCAL or a ROLLBACK rehearsal of the real statement. Instead:
--   before  BEGIN READ ONLY checks; any failure stops the file before anything has been set or built.
--   build   one statement under session level timeouts of the same values, reset straight afterwards. The checks and the
--           build need the session pooler (port 5432): the transaction pooler (6543) can hand each statement a different
--           connection, so a SET there could miss the build and leak to another client.
--   after   BEGIN READ ONLY check that the index is valid. A failed build can leave an INVALID index, which is not used but
--           is still kept up to date on writes: run the UNDO file, then try again. IF NOT EXISTS is left out on purpose,
--           because it would accept an invalid leftover as done.
--
-- Run, with the URL taken from DATABASE_URL in .env.local and its port changed to 5432 (never printed):
--   psql "$SESSION_URL" -X -f scripts/migrations/2026-11-06a-written-questions-date-answered-index.sql
-- Do not add --single-transaction. Do not run it during another database job or while a deploy is within 15 minutes.
-- Undo: scripts/migrations/2026-11-06a-written-questions-date-answered-index-UNDO.sql

\set ON_ERROR_STOP on

BEGIN READ ONLY;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE n integer;
BEGIN
  IF to_regclass('public.parliament_written_questions_date_answered_idx') IS NOT NULL THEN
    RAISE EXCEPTION 'the index already exists: check it is valid, or run the UNDO file first';
  END IF;
  -- The build waits for every transaction open when it starts, so a long one would run it into the timeout.
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
CREATE INDEX CONCURRENTLY parliament_written_questions_date_answered_idx
  ON public.parliament_written_questions (date_answered);
RESET statement_timeout;
RESET lock_timeout;
\set ON_ERROR_STOP on

BEGIN READ ONLY;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE ok boolean;
BEGIN
  SELECT i.indisvalid AND i.indisready INTO ok FROM pg_index i
   WHERE i.indexrelid = to_regclass('public.parliament_written_questions_date_answered_idx');
  IF ok IS NULL THEN RAISE EXCEPTION 'no index was built: nothing to undo, try again later'; END IF;
  IF NOT ok THEN RAISE EXCEPTION 'the index is INVALID: run the UNDO file, then try again'; END IF;
END $$;
SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
  FROM pg_stat_user_indexes WHERE indexrelname = 'parliament_written_questions_date_answered_idx';
COMMIT;
