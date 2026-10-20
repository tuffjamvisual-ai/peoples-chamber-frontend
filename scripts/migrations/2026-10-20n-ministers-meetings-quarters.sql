-- ministers_meetings_quarters: one row per GOV.UK organisation per quarter with a ministers' meetings return, and the
-- latest date GOV.UK published a return for it (owner's approval, 20 Oct 2026). Read by
-- lib/ministers-meetings-status.ts for the "Latest ministers' meetings return" line on department pages.
\set ON_ERROR_STOP on
BEGIN;

CREATE VIEW public.ministers_meetings_quarters WITH (security_invoker = true) AS
SELECT govuk_org_slug, quarter, max(source_published_on) AS published_on, count(*) AS meetings
FROM public.ministers_meetings
WHERE govuk_org_slug IS NOT NULL AND quarter IS NOT NULL
GROUP BY govuk_org_slug, quarter;
GRANT SELECT ON public.ministers_meetings_quarters TO anon, authenticated;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.ministers_meetings_quarters;
  IF n = 0 THEN RAISE EXCEPTION 'ministers_meetings_quarters is empty'; END IF;
  SELECT count(*) INTO n FROM public.ministers_meetings_quarters WHERE published_on IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION '% quarters have no publication date', n; END IF;
  IF NOT has_table_privilege('anon', 'public.ministers_meetings_quarters', 'SELECT') THEN RAISE EXCEPTION 'anon must read the view'; END IF;
END $$;

COMMIT;
