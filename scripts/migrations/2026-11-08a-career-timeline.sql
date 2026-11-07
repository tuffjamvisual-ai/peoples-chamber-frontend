-- 2026-11-08a: MP Political career timeline storage (owner approved the design on 7 Nov 2026, PC1; backlog item 21).
-- Written by Terminal 2, not applied; Terminal 1 applies it under the production rules (backup, ROLLBACK rehearsal of this
-- file and its UNDO, no deployment building). Adds three nullable columns to public.mp_biography and changes nothing else:
--   career_parliament  jsonb        NULL or a JSON array: the Parliament part, rebuilt by scripts/sync-career-parliament.ts
--   career_research    jsonb        NULL or a JSON array: the research part, written only through
--                                   scripts/background/make-background-migration.ts --column career, never by the sync
--   career_checked_at  timestamptz  when the sync last checked the Parliament part
-- Entry shape (documented and validated in lib/career-timeline.ts): as a Background timeline entry with "group"
-- (elections, posts, committees, bills, findings or pledges) in place of "phase"; start and end may also be a day
-- (YYYY-MM-DD); a bill also carries "outcome" (became_law, defeated, withdrawn, no_further_stage, in_progress), "stage"
-- and "session".
-- Row level security: mp_biography already has it on, with one policy, "Anyone can read mp biography" (SELECT, public);
-- the new columns are covered by it, so the public can read and not write them. Privileges are untouched: the self-check
-- below fails if anon or authenticated gain or lose any table privilege, or if RLS is off.
-- Code: works with the code on main as it is (nothing reads these columns yet); the PC1 page code (t2-work) reads them and
-- shows no fold while they are empty or missing.
-- Undo: 2026-11-08a-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography'
               AND column_name IN ('career_parliament', 'career_research', 'career_checked_at')) THEN
    RAISE EXCEPTION 'career columns already exist';
  END IF;
END $$;

CREATE TEMP TABLE ct_privs_before ON COMMIT DROP AS
SELECT r.role, p.priv, has_table_privilege(r.role, 'public.mp_biography', p.priv) AS held
  FROM (VALUES ('anon'), ('authenticated')) r(role),
       (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv);
CREATE TEMP TABLE ct_rows_before ON COMMIT DROP AS SELECT count(*) AS n FROM public.mp_biography;

ALTER TABLE public.mp_biography
  ADD COLUMN career_parliament jsonb,
  ADD COLUMN career_research jsonb,
  ADD COLUMN career_checked_at timestamptz;

ALTER TABLE public.mp_biography
  ADD CONSTRAINT mp_biography_career_parliament_is_array CHECK (career_parliament IS NULL OR jsonb_typeof(career_parliament) = 'array'),
  ADD CONSTRAINT mp_biography_career_research_is_array CHECK (career_research IS NULL OR jsonb_typeof(career_research) = 'array');

COMMENT ON COLUMN public.mp_biography.career_parliament IS
  'MP Political career, Parliament part: NULL or an array of entries (lib/career-timeline.ts). Rebuilt by scripts/sync-career-parliament.ts from the Members API and Bills API.';
COMMENT ON COLUMN public.mp_biography.career_research IS
  'MP Political career, research part: NULL or an array of entries (lib/career-timeline.ts). Written only through scripts/background/make-background-migration.ts --column career, never by the sync.';
COMMENT ON COLUMN public.mp_biography.career_checked_at IS
  'When scripts/sync-career-parliament.ts last checked career_parliament against Parliament''s APIs.';

-- Self-check: three columns of the right types, both constraints, RLS on, the row count unchanged, and anon and
-- authenticated holding exactly the privileges they held before (SELECT only).
DO $$
DECLARE
  changed integer;
  writes integer;
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography' AND column_name = 'career_parliament') IS DISTINCT FROM 'jsonb'
     OR (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography' AND column_name = 'career_research') IS DISTINCT FROM 'jsonb'
     OR (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography' AND column_name = 'career_checked_at') IS DISTINCT FROM 'timestamp with time zone' THEN
    RAISE EXCEPTION 'career columns missing or of the wrong type';
  END IF;
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.mp_biography'::regclass
        AND conname IN ('mp_biography_career_parliament_is_array', 'mp_biography_career_research_is_array')) <> 2 THEN
    RAISE EXCEPTION 'array check constraints missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.mp_biography'::regclass) THEN
    RAISE EXCEPTION 'row level security is off on mp_biography';
  END IF;
  IF (SELECT count(*) FROM public.mp_biography) <> (SELECT n FROM ct_rows_before) THEN
    RAISE EXCEPTION 'row count changed';
  END IF;
  SELECT count(*) INTO changed FROM ct_privs_before b
   WHERE has_table_privilege(b.role, 'public.mp_biography', b.priv) IS DISTINCT FROM b.held;
  IF changed <> 0 THEN RAISE EXCEPTION '% anon/authenticated table privileges changed', changed; END IF;
  SELECT count(*) INTO writes FROM ct_privs_before b
   WHERE b.priv <> 'SELECT' AND has_table_privilege(b.role, 'public.mp_biography', b.priv);
  IF writes <> 0 THEN RAISE EXCEPTION 'anon or authenticated hold % write privileges on mp_biography', writes; END IF;
  IF NOT has_table_privilege('anon', 'public.mp_biography', 'SELECT') THEN RAISE EXCEPTION 'anon lost SELECT'; END IF;
  RAISE NOTICE '2026-11-08a: career columns added; % rows unchanged', (SELECT n FROM ct_rows_before);
END $$;

COMMIT;
