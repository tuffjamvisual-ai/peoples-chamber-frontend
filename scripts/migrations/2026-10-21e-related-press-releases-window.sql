-- related_press_releases() (migration 2026-10-21d) matched the title's words against every release's full-text
-- vector and ranked them on their full bodies: 643 ms for a Foreign Office release when not cached, and it ran past
-- anon's 3 s limit during the Vercel build of b2a4542 (21 Oct 2026). Now it takes the organisation's releases in the
-- 360-day window first (press_releases_org_published_idx) and ranks those on their title and summary only, which is
-- both cheaper and closer to "same subject". Same inputs, outputs and exclusions.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$
BEGIN
  IF to_regprocedure('public.related_press_releases(integer,integer)') IS NULL THEN RAISE EXCEPTION 'related_press_releases(integer,integer) is missing'; END IF;
  IF to_regclass('public.press_releases_org_published_idx') IS NULL THEN RAISE EXCEPTION 'the (organisation, published_at) index is missing'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.related_press_releases(p_id integer, p_limit integer DEFAULT 2)
RETURNS TABLE (news_slug text, title text, organisation text, published_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  WITH r AS (
    SELECT id, title, organisation, published_at FROM public.press_releases WHERE id = p_id
  ),
  q AS (
    SELECT to_tsquery('simple', string_agg(quote_literal(l), ' | ')) AS tq
      FROM r, unnest(tsvector_to_array(to_tsvector('english', r.title))) l
     WHERE length(l) > 2
  ),
  shown AS (
    SELECT p.id FROM public.press_releases p, r
     WHERE p.organisation = r.organisation AND p.gov_url IS NOT NULL AND p.removed_upstream IS NOT TRUE
     ORDER BY p.published_at DESC
     LIMIT 7
  ),
  candidates AS MATERIALIZED (
    SELECT p.id, p.news_slug, p.title, p.organisation, p.published_at,
           to_tsvector('english', p.title || ' ' || coalesce(p.description, '')) AS v
      FROM public.press_releases p, r
     WHERE p.organisation = r.organisation
       AND p.published_at BETWEEN r.published_at - interval '180 days' AND r.published_at + interval '180 days'
       AND p.id <> r.id AND p.news_slug IS NOT NULL AND p.removed_upstream IS NOT TRUE
  )
  SELECT c.news_slug, c.title, c.organisation, c.published_at
    FROM candidates c, q
   WHERE q.tq IS NOT NULL AND c.v @@ q.tq AND c.id NOT IN (SELECT id FROM shown)
   ORDER BY ts_rank(c.v, q.tq) DESC, c.published_at DESC
   LIMIT p_limit;
$fn$;

DO $$
DECLARE pid int; n int;
BEGIN
  SELECT id INTO pid FROM public.press_releases WHERE news_slug = 'great-british-railways-takes-shape-as-hq-and-apprenticeship-scheme-confirmed' LIMIT 1;
  SELECT count(*) INTO n FROM public.related_press_releases(pid, 2);
  IF n = 0 THEN RAISE EXCEPTION 'no related releases for the test release'; END IF;
END $$;
COMMIT;
