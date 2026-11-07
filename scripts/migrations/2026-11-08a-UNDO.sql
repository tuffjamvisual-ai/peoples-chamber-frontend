-- 2026-11-08a UNDO: removes the MP Political career columns from public.mp_biography (the two CHECK constraints, then
-- career_checked_at, career_research and career_parliament), returning the table to its shape before
-- 2026-11-08a-career-timeline.sql. Dropping the columns deletes any career data stored in them: export it first if it must
-- be kept (the Parliament part can be rebuilt by scripts/sync-career-parliament.ts; the research part cannot).
-- Revert the PC1 page code first: it reads these columns (it shows no fold if they are missing, but do not rely on that).
-- Written by Terminal 2 (PC1, 7 Nov 2026), not applied; Terminal 1 applies under the production rules.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.mp_biography DROP CONSTRAINT IF EXISTS mp_biography_career_parliament_is_array;
ALTER TABLE public.mp_biography DROP CONSTRAINT IF EXISTS mp_biography_career_research_is_array;
ALTER TABLE public.mp_biography
  DROP COLUMN IF EXISTS career_checked_at,
  DROP COLUMN IF EXISTS career_research,
  DROP COLUMN IF EXISTS career_parliament;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography'
               AND column_name IN ('career_parliament', 'career_research', 'career_checked_at')) THEN
    RAISE EXCEPTION 'career columns still present';
  END IF;
  IF has_table_privilege('anon', 'public.mp_biography', 'INSERT') OR has_table_privilege('anon', 'public.mp_biography', 'UPDATE')
     OR has_table_privilege('anon', 'public.mp_biography', 'DELETE') THEN
    RAISE EXCEPTION 'anon holds write privileges on mp_biography';
  END IF;
  RAISE NOTICE '2026-11-08a UNDO: career columns removed';
END $$;

COMMIT;
