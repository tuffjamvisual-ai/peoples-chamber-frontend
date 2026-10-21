-- "Read next" on news pages (owner's approval, 21 Oct 2026): related_press_releases() finds the releases closest in
-- wording to one release (its title words against the full-text index), from the same organisation within 180 days
-- either side. It leaves out the releases the page's "More from" list already shows (RelatedLinks: the newest seven
-- from the organisation). Other organisations are not searched: in the rehearsal their matches were weak (a Prime
-- Minister's Office release matched a museum board appointment). The index on (organisation,
-- published_at) serves that list and this function; the list used to scan the 46,603-row table.
-- Read only, SECURITY INVOKER (anon can already read press_releases).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$
BEGIN
  IF to_regclass('public.press_releases_org_published_idx') IS NOT NULL THEN RAISE EXCEPTION 'index already exists'; END IF;
  IF to_regprocedure('public.related_press_releases(integer,integer)') IS NOT NULL THEN RAISE EXCEPTION 'function already exists'; END IF;
END $$;

CREATE INDEX press_releases_org_published_idx ON public.press_releases (organisation, published_at DESC);

CREATE FUNCTION public.related_press_releases(p_id integer, p_limit integer DEFAULT 2)
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
  )
  SELECT p.news_slug, p.title, p.organisation, p.published_at
    FROM public.press_releases p, r, q
   WHERE q.tq IS NOT NULL
     AND p.id <> r.id AND p.news_slug IS NOT NULL AND p.removed_upstream IS NOT TRUE
     AND p.id NOT IN (SELECT id FROM shown)
     AND p.organisation = r.organisation
     AND p.published_at BETWEEN r.published_at - interval '180 days' AND r.published_at + interval '180 days'
     AND p.search_vec @@ q.tq
   ORDER BY ts_rank(p.search_vec, q.tq) DESC, p.published_at DESC
   LIMIT p_limit;
$fn$;

COMMENT ON FUNCTION public.related_press_releases(integer, integer) IS
  'Releases closest in wording to one release, for the Read next block on news pages (migration 2026-10-21d)';
REVOKE ALL ON FUNCTION public.related_press_releases(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.related_press_releases(integer, integer) TO anon, authenticated, service_role;
ANALYZE public.press_releases;

DO $$
DECLARE pid int; n int;
BEGIN
  SELECT id INTO pid FROM public.press_releases WHERE news_slug = 'great-british-railways-takes-shape-as-hq-and-apprenticeship-scheme-confirmed' LIMIT 1;
  IF pid IS NULL THEN RAISE EXCEPTION 'test release not found'; END IF;
  SELECT count(*) INTO n FROM public.related_press_releases(pid, 2);
  IF n = 0 THEN RAISE EXCEPTION 'no related releases for the test release'; END IF;
END $$;

COMMIT;
