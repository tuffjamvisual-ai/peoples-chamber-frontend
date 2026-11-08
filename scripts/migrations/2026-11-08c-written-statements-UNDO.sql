-- 2026-11-08c UNDO: drops public.parliament_written_statements (its index and policies go with it), returning the database to
-- its shape before 2026-11-08c-written-statements.sql. Dropping the table deletes every stored statement; the data can be
-- fetched again from Parliament's Written Statements API with scripts/sync-written-statements.ts.
-- Revert the WS1 code first, or leave it: the MP page and the sync both tolerate the table being missing (the page shows
-- no written statements figure; the sync fails on its first write).
-- Written by Terminal 2 (WS1, 8 Nov 2026), not applied; Terminal 1 applies under the production rules.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS public.parliament_written_statements;

DO $$ BEGIN
  IF to_regclass('public.parliament_written_statements') IS NOT NULL THEN
    RAISE EXCEPTION 'parliament_written_statements still present';
  END IF;
  RAISE NOTICE '2026-11-08c UNDO: parliament_written_statements removed';
END $$;

COMMIT;
