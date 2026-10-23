-- 2026-10-23e: opening sentence of briefing 920e6b2857 (owner's approval, 23 Oct 2026). "Two accountability issues"
-- becomes "Three accountability issues", matching the three debates the body covers and the headline (2026-10-23d).
-- Nothing else in the body changes; the old body is kept in briefing_body_backup_20261023e.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regclass('public.briefing_body_backup_20261023e') IS NOT NULL THEN RAISE EXCEPTION 'backup table already exists'; END IF;
  IF (SELECT count(*) FROM public.briefings WHERE slug = '920e6b2857'
        AND body LIKE 'Two accountability issues, long delayed, reach the House of Lords this week.%') <> 1 THEN
    RAISE EXCEPTION 'opening sentence is not the expected one';
  END IF;
  IF (SELECT (length(body) - length(replace(body, 'Two accountability issues, long delayed, reach the House of Lords this week.', '')))
      FROM public.briefings WHERE slug = '920e6b2857') <> length('Two accountability issues, long delayed, reach the House of Lords this week.') THEN
    RAISE EXCEPTION 'sentence does not appear exactly once';
  END IF;
END $$;

CREATE TABLE public.briefing_body_backup_20261023e AS
  SELECT slug, body, now() AS backed_up_at FROM public.briefings WHERE slug = '920e6b2857';
ALTER TABLE public.briefing_body_backup_20261023e ENABLE ROW LEVEL SECURITY;

UPDATE public.briefings
SET body = replace(body, 'Two accountability issues, long delayed, reach the House of Lords this week.',
                         'Three accountability issues, long delayed, reach the House of Lords this week.')
WHERE slug = '920e6b2857';

DO $$ BEGIN
  IF (SELECT count(*) FROM public.briefing_body_backup_20261023e) <> 1 THEN RAISE EXCEPTION 'expected 1 row backed up'; END IF;
  -- Only the one word changed: the new body is the old one with Two replaced by Three, five characters long against three.
  IF (SELECT length(b.body) - length(k.body) FROM public.briefings b JOIN public.briefing_body_backup_20261023e k USING (slug)) <> 2 THEN
    RAISE EXCEPTION 'body changed by more than the one word';
  END IF;
  IF (SELECT substr(b.body, 6) = substr(k.body, 4) FROM public.briefings b JOIN public.briefing_body_backup_20261023e k USING (slug)) IS NOT TRUE THEN
    RAISE EXCEPTION 'rest of the body differs';
  END IF;
END $$;

SELECT slug, left(body, 100) AS opening FROM public.briefings WHERE slug = '920e6b2857';

COMMIT;
