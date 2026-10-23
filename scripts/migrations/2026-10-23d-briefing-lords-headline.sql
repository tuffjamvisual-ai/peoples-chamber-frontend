-- 2026-10-23d: headline of briefing 920e6b2857 (owner's approval, 23 Oct 2026). It said "two accountability bills",
-- but the body covers three second reading debates on 17 July (cohabitation rights, undercover policing and genocide
-- determination). Only the headline changes; the old one is kept in briefing_headline_backup_20261023d.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regclass('public.briefing_headline_backup_20261023d') IS NOT NULL THEN RAISE EXCEPTION 'backup table already exists'; END IF;
  IF (SELECT headline FROM public.briefings WHERE slug = '920e6b2857')
     IS DISTINCT FROM 'Lords set to debate cohabitation rights and undercover policing this week: two accountability bills the Commons has stalled on for years' THEN
    RAISE EXCEPTION 'headline is not the expected one';
  END IF;
END $$;

CREATE TABLE public.briefing_headline_backup_20261023d AS
  SELECT slug, headline, now() AS backed_up_at FROM public.briefings WHERE slug = '920e6b2857';
ALTER TABLE public.briefing_headline_backup_20261023d ENABLE ROW LEVEL SECURITY;

UPDATE public.briefings
SET headline = 'Lords set to debate cohabitation rights, undercover policing and genocide determination this week, after years of parliamentary inaction'
WHERE slug = '920e6b2857';

DO $$ BEGIN
  IF (SELECT count(*) FROM public.briefing_headline_backup_20261023d) <> 1 THEN RAISE EXCEPTION 'expected 1 row backed up'; END IF;
END $$;

SELECT slug, headline FROM public.briefings WHERE slug = '920e6b2857';

COMMIT;
