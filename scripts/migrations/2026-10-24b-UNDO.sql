-- 2026-10-24b UNDO: removes the MP Background timeline columns from public.mp_biography (the CHECK constraint, then
-- background_last_checked and background_timeline), returning the table to its shape before 2026-10-24b-background-
-- timeline.sql. Dropping the columns deletes any timeline data stored in them: export it first if it must be kept.
-- Run only if 2026-10-24b must be reversed.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

ALTER TABLE public.mp_biography DROP CONSTRAINT IF EXISTS mp_biography_background_timeline_is_array;
ALTER TABLE public.mp_biography
  DROP COLUMN IF EXISTS background_last_checked,
  DROP COLUMN IF EXISTS background_timeline;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography'
               AND column_name IN ('background_timeline', 'background_last_checked')) THEN
    RAISE EXCEPTION 'background columns still present';
  END IF;
  IF has_table_privilege('anon', 'public.mp_biography', 'INSERT') OR has_table_privilege('anon', 'public.mp_biography', 'UPDATE')
     OR has_table_privilege('anon', 'public.mp_biography', 'DELETE') THEN
    RAISE EXCEPTION 'anon holds write privileges on mp_biography';
  END IF;
END $$;

COMMIT;
