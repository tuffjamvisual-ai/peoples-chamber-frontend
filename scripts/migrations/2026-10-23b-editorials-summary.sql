-- 2026-10-23b: editorials.summary (owner's approval, 23 Oct 2026). The one sentence list summary from each piece's
-- `summary` field, written by scripts/sync-editorials-to-db.ts on each production deploy. Search results and
-- department pages show it, falling back to the standfirst when it is empty. Nothing else changes; the column starts
-- empty and the next deploy fills it.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regclass('public.editorials') IS NULL THEN RAISE EXCEPTION 'public.editorials missing'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'editorials' AND column_name = 'summary') THEN
    RAISE EXCEPTION 'editorials.summary already exists';
  END IF;
END $$;

ALTER TABLE public.editorials ADD COLUMN summary text;

DO $$ BEGIN
  IF NOT has_column_privilege('anon', 'public.editorials', 'summary', 'SELECT') THEN RAISE EXCEPTION 'anon cannot read summary'; END IF;
END $$;

SELECT 'editorials rows' AS step, count(*) AS n FROM public.editorials
UNION ALL SELECT 'rows with summary', count(summary) FROM public.editorials;

COMMIT;
