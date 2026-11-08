-- 2026-11-08d: written questions 2014 to July 2024, details only (owner, 8 Nov 2026, WQ1). Written by Terminal 2, not
-- applied; Terminal 1 applies it under the production rules (backup, ROLLBACK rehearsal of this file and its UNDO, no
-- deployment building). Creates one empty table and changes nothing else:
--   parliament_written_questions_details  one row per answered Commons written question tabled from 1 January 2014 to
--     3 July 2024 (the day before the full text archive, parliament_written_questions, starts), from Parliament's
--     Questions API: id (the API's question id), uin, house, date_tabled, date_answered, asking_member_id,
--     answering_member_id, answering_body_id, answering_body, heading, url (built as the archive builds it) and fetched_at.
--     No question or answer text and no search column, so the archive's pages and search never show these questions.
--     About 435,000 rows.
-- Filled once by scripts/backfill-written-questions-details.ts (by hand, in chunks), which never writes an id already in
-- parliament_written_questions; read by the MP page's minister written answers figure, with the server key.
-- Secured like parliament_written_questions (2026-10-29a) and parliament_written_statements (2026-11-08c): row level
-- security on, no policies, nothing granted to anon or authenticated, so only the server key reads or writes it.
-- Undo: 2026-11-08d-written-questions-details-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.parliament_written_questions_details') IS NOT NULL THEN
    RAISE EXCEPTION 'parliament_written_questions_details already exists';
  END IF;
END $$;

CREATE TABLE public.parliament_written_questions_details (
  id                   bigint PRIMARY KEY,           -- the Questions API question id
  uin                  text NOT NULL,
  house                text NOT NULL,
  date_tabled          date NOT NULL,
  date_answered        date,
  asking_member_id     int,
  answering_member_id  int,
  answering_body_id    int,
  answering_body       text,
  heading              text,
  url                  text,
  fetched_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX parliament_written_questions_details_answering_idx ON public.parliament_written_questions_details (answering_member_id, date_answered);
CREATE INDEX parliament_written_questions_details_asking_idx ON public.parliament_written_questions_details (asking_member_id, date_tabled);
COMMENT ON TABLE public.parliament_written_questions_details IS
  'Answered Commons written questions tabled 2014-01-01 to 2024-07-03, details only (no question or answer text). Source: UK Parliament Questions and Statements API (questions-statements-api.parliament.uk). Contains Parliamentary information licensed under the Open Parliament Licence v3.0. Filled by scripts/backfill-written-questions-details.ts.';

ALTER TABLE public.parliament_written_questions_details ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parliament_written_questions_details FROM anon, authenticated;

-- Self-check: the table with its columns, primary key and both indexes, no text columns, empty, row level security on,
-- no policies, and the full text archive untouched.
DO $$ BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parliament_written_questions_details') <> 12 THEN
    RAISE EXCEPTION 'parliament_written_questions_details does not have exactly its 12 columns';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parliament_written_questions_details'
               AND column_name IN ('question_text', 'answer_text', 'answer_html', 'search')) THEN
    RAISE EXCEPTION 'a text or search column is present';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.parliament_written_questions_details'::regclass AND contype = 'p') THEN
    RAISE EXCEPTION 'primary key missing';
  END IF;
  IF to_regclass('public.parliament_written_questions_details_answering_idx') IS NULL
     OR to_regclass('public.parliament_written_questions_details_asking_idx') IS NULL THEN
    RAISE EXCEPTION 'an index is missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.parliament_written_questions_details'::regclass) THEN
    RAISE EXCEPTION 'row level security is off';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parliament_written_questions_details') <> 0 THEN
    RAISE EXCEPTION 'unexpected policies';
  END IF;
  IF EXISTS (SELECT 1 FROM public.parliament_written_questions_details) THEN
    RAISE EXCEPTION 'table is not empty';
  END IF;
  IF to_regclass('public.parliament_written_questions') IS NULL THEN
    RAISE EXCEPTION 'parliament_written_questions is missing';
  END IF;
  RAISE NOTICE '2026-11-08d: parliament_written_questions_details created (empty, RLS on, no policies)';
END $$;

COMMIT;
