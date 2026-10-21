-- mp_conduct_findings: a plain unique constraint on case_ref (owner's approval, 21 Oct 2026). The only unique index
-- was partial (WHERE case_ref IS NOT NULL), which ON CONFLICT (case_ref) cannot use, so every upsert by
-- /api/sync-standards-committee failed ("no unique or exclusion constraint matching the ON CONFLICT specification")
-- and findings have not been refreshed since 6 June 2026. A unique constraint still allows any number of NULLs.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mp_conduct_findings'::regclass AND conname = 'mp_conduct_findings_case_ref_key')
    THEN RAISE EXCEPTION 'mp_conduct_findings_case_ref_key already exists'; END IF;
  IF EXISTS (SELECT 1 FROM mp_conduct_findings WHERE case_ref IS NOT NULL GROUP BY case_ref HAVING count(*) > 1)
    THEN RAISE EXCEPTION 'duplicate case_ref values'; END IF;
END $$;
ALTER TABLE public.mp_conduct_findings ADD CONSTRAINT mp_conduct_findings_case_ref_key UNIQUE (case_ref);
DROP INDEX public.mp_conduct_findings_case_ref_uniq;
COMMIT;
