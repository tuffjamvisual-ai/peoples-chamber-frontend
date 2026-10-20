-- Major projects: evaluation plans (owner's approval, 20 Oct 2026). Adds major_projects.evaluation_plan, the
-- department's own statement as published: "Does the project have an evaluation plan? (self reported)" in the
-- March 2025 data, "Evaluation Plan and Registry Link" in the March 2026 data (word for word; links kept as given).
-- NULL where the entry is blank, and for March 2024, whose data has no such column. Filled by the reload
-- (scripts/import-major-projects.js --sql), run after this.
\set ON_ERROR_STOP on
BEGIN;
ALTER TABLE public.major_projects ADD COLUMN evaluation_plan text;
COMMENT ON COLUMN public.major_projects.evaluation_plan IS
  'The department''s own statement on an evaluation plan, word for word (March 2025 and March 2026 data); NULL where blank or not asked';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'major_projects' AND column_name = 'evaluation_plan')
    THEN RAISE EXCEPTION 'evaluation_plan was not added'; END IF;
END $$;
COMMIT;
