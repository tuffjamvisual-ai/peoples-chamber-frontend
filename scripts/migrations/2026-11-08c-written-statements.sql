-- 2026-11-08c: written ministerial statements, metadata only (owner, 8 Nov 2026, WS1). Written by Terminal 2, not applied;
-- Terminal 1 applies it under the production rules (backup, ROLLBACK rehearsal of this file and its UNDO, no deployment
-- building). Creates one empty table and changes nothing else:
--   parliament_written_statements  one row per Commons written statement from Parliament's Written Statements API
--     (questions-statements-api.parliament.uk/api/writtenstatements/statements): id (Parliament's statement id), uin,
--     house, member_id (the minister who made it), member_role, date_made, title, answering_body_id,
--     answering_body_name, url (the statement's page on questions-statements.parliament.uk) and synced_at. No statement
--     text is stored.
-- Filled by scripts/sync-written-statements.ts (first backfill by hand, then nightly in
-- .github/workflows/written-statements-sync.yml); read by the MP page's delivery record panel, with the server key.
-- Secured like the other Parliament archive tables (parliament_written_questions, 2026-10-29a): row level security on, no
-- policies, nothing granted to anon or authenticated, so only the server key (service role) reads or writes it.
-- Undo: 2026-11-08c-written-statements-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.parliament_written_statements') IS NOT NULL THEN
    RAISE EXCEPTION 'parliament_written_statements already exists';
  END IF;
END $$;

CREATE TABLE public.parliament_written_statements (
  id                   bigint PRIMARY KEY,           -- Parliament's statement id
  uin                  text,                         -- e.g. HCWS448; repeats across sessions, so not unique
  house                text NOT NULL,
  member_id            int NOT NULL,
  member_role          text,
  date_made            date NOT NULL,
  title                text,
  answering_body_id    int,
  answering_body_name  text,
  url                  text,
  synced_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX parliament_written_statements_member_date_idx ON public.parliament_written_statements (member_id, date_made);
COMMENT ON TABLE public.parliament_written_statements IS
  'Written ministerial statements, metadata only (no text). Source: UK Parliament Questions and Statements API (questions-statements-api.parliament.uk). Contains Parliamentary information licensed under the Open Parliament Licence v3.0. Synced by scripts/sync-written-statements.ts.';

ALTER TABLE public.parliament_written_statements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parliament_written_statements FROM anon, authenticated;

-- Self-check: the table with its columns, primary key and index, empty, row level security on, no policies.
DO $$ BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parliament_written_statements'
        AND column_name IN ('id', 'uin', 'house', 'member_id', 'member_role', 'date_made', 'title', 'answering_body_id', 'answering_body_name', 'url', 'synced_at')) <> 11 THEN
    RAISE EXCEPTION 'parliament_written_statements columns missing';
  END IF;
  IF (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parliament_written_statements' AND column_name = 'date_made') IS DISTINCT FROM 'date' THEN
    RAISE EXCEPTION 'date_made is not a date';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.parliament_written_statements'::regclass AND contype = 'p') THEN
    RAISE EXCEPTION 'primary key missing';
  END IF;
  IF to_regclass('public.parliament_written_statements_member_date_idx') IS NULL THEN
    RAISE EXCEPTION 'index on (member_id, date_made) missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.parliament_written_statements'::regclass) THEN
    RAISE EXCEPTION 'row level security is off';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parliament_written_statements') <> 0 THEN
    RAISE EXCEPTION 'unexpected policies on parliament_written_statements';
  END IF;
  IF EXISTS (SELECT 1 FROM public.parliament_written_statements) THEN
    RAISE EXCEPTION 'table is not empty';
  END IF;
  RAISE NOTICE '2026-11-08c: parliament_written_statements created (empty, RLS on, no policies)';
END $$;

COMMIT;
