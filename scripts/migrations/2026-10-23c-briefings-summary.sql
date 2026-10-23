-- 2026-10-23c: briefings.summary (owner's approval, 23 Oct 2026). The one sentence list summary for briefings stored
-- only in the database, shown on /briefings in place of the opening of the body. Fills the 4 published briefings
-- with the summaries John approved. Rows without a summary keep showing the opening of the body.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regclass('public.briefings') IS NULL THEN RAISE EXCEPTION 'public.briefings missing'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'briefings' AND column_name = 'summary') THEN
    RAISE EXCEPTION 'briefings.summary already exists';
  END IF;
END $$;

ALTER TABLE public.briefings ADD COLUMN summary text;

UPDATE public.briefings b SET summary = v.s FROM (VALUES
  ('9daa8d566a', 'South East Water''s leaders have resigned, but the company that left Tunbridge Wells without water still has no credible plan.'),
  ('920e6b2857', 'The Lords debates cohabitation rights, undercover policing and genocide determination this week, after years of parliamentary inaction on all three.'),
  ('7bb78d3366', 'Andy Burnham is on course to be Prime Minister this week, but some Labour MPs say a coronation denies members their voice.'),
  ('dc5ff3e650', 'Labour nominations have opened with no serious challenger left, as Andy Burnham''s rivals endorse him instead of fighting him.')
) v(slug, s) WHERE b.slug = v.slug;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.briefings WHERE summary IS NOT NULL) <> 4 THEN RAISE EXCEPTION 'expected 4 summaries'; END IF;
  IF NOT has_column_privilege('anon', 'public.briefings', 'summary', 'SELECT') THEN RAISE EXCEPTION 'anon cannot read summary'; END IF;
END $$;

SELECT slug, summary FROM public.briefings WHERE summary IS NOT NULL ORDER BY published_at DESC;

COMMIT;
