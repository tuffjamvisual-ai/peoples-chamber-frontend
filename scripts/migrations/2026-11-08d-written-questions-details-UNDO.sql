-- 2026-11-08d UNDO: drops public.parliament_written_questions_details (its indexes go with it), returning the database to
-- its shape before 2026-11-08d-written-questions-details.sql. Dropping it deletes the 2014 to July 2024 question details;
-- they can be fetched again from Parliament's Questions API with scripts/backfill-written-questions-details.ts (many hours).
-- The full text archive (parliament_written_questions) is not touched. The MP page tolerates the table being missing (the
-- minister written answers figure then counts the archive alone, labelled "since July 2024" where it applies).
-- Written by Terminal 2 (WQ1, 8 Nov 2026), not applied; Terminal 1 applies under the production rules.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS public.parliament_written_questions_details;

DO $$ BEGIN
  IF to_regclass('public.parliament_written_questions_details') IS NOT NULL THEN
    RAISE EXCEPTION 'parliament_written_questions_details still present';
  END IF;
  IF to_regclass('public.parliament_written_questions') IS NULL THEN
    RAISE EXCEPTION 'parliament_written_questions is missing';
  END IF;
  RAISE NOTICE '2026-11-08d UNDO: parliament_written_questions_details removed';
END $$;

COMMIT;
