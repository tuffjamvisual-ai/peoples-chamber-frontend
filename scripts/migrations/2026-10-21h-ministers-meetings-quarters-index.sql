-- ministers_meetings_quarters (migration 2026-10-20n) groups ministers_meetings by organisation and quarter. With no
-- index on the organisation it scanned all 21,346 meetings for one department (2.1 s for the Home Office), which the
-- department pages' Transparency tab hid until failed reads began to throw (21 Oct 2026), when it timed out. A
-- covering index on (govuk_org_slug, quarter) with source_published_on lets the view read one organisation's rows
-- from the index. Owner's approval, 21 Oct 2026 (build reliability).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$ BEGIN
  IF to_regclass('public.ministers_meetings_org_quarter_idx') IS NOT NULL THEN RAISE EXCEPTION 'index already exists'; END IF;
END $$;
CREATE INDEX ministers_meetings_org_quarter_idx ON public.ministers_meetings (govuk_org_slug, quarter) INCLUDE (source_published_on);
ANALYZE public.ministers_meetings;
COMMIT;
VACUUM (ANALYZE) public.ministers_meetings;
