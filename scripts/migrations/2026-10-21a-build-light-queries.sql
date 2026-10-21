-- Lighter build-time reads for /second-jobs and /transparency/major-projects (owner's approval, 21 Oct 2026). Both
-- pages failed Vercel builds of 335c2f4 (20 Oct 2026) on anon's 3 s statement timeout while the other pages
-- prerendered at once.
--
-- 1. /second-jobs read every current "Employment and earnings" entry with its full text (267 rows, 295 kB) only to
--    count MPs per party. Through PostgREST's generic plan the filter could not use the category index, so Postgres
--    walked the whole table by id (8,987 rows, 5,031 buffers; 167 ms on average and up to 2.8 s under build load).
--    second_jobs_summary() returns just the MPs and their totals; the party roll-up stays in the page.
-- 2. The composite index lets the same filter use an index on a generic plan, for the party and MP pages
--    (/second-jobs/[slug], built on first visit), which still read the full entries.
-- 3. /transparency/major-projects read all 629 project-years (410 kB) and then the latest year in a second call.
--    major_projects_list() returns one row per project with only what the list shows (its latest report) and
--    whether its March 2025 entry said "No" to having an evaluation plan.
-- Both functions are read only and SECURITY INVOKER: they read with the caller's own rights (anon can already read
-- all four tables).
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.second_jobs_summary()') IS NOT NULL THEN RAISE EXCEPTION 'second_jobs_summary() already exists'; END IF;
  IF to_regprocedure('public.major_projects_list()') IS NOT NULL THEN RAISE EXCEPTION 'major_projects_list() already exists'; END IF;
  IF to_regclass('public.mp_registered_interests_category_current_idx') IS NOT NULL THEN RAISE EXCEPTION 'the index already exists'; END IF;
END $$;

CREATE INDEX mp_registered_interests_category_current_idx
  ON public.mp_registered_interests (category_name, is_current, id) INCLUDE (member_id);

-- Same rules as app/second-jobs/_lib/data.ts loadAll(): serving MPs (mps.current_member) with at least one current
-- "1. Employment and earnings" entry, each with their nightly earnings summary (0 when they have none), in the order
-- of their first entry by id; summary_updated is the latest update across the whole summary table.
CREATE FUNCTION public.second_jobs_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  WITH m AS (
    SELECT i.member_id, min(i.id) AS first_id
      FROM public.mp_registered_interests i
     WHERE i.category_name = '1. Employment and earnings' AND i.is_current
     GROUP BY i.member_id
  )
  SELECT jsonb_build_object(
    'mps', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'member_id', p.member_id, 'display_name', p.display_name, 'name', p.name, 'party', p.party,
               'total', coalesce(s.total_extracted, 0), 'claim_count', coalesce(s.claim_count, 0)) ORDER BY m.first_id)
        FROM m
        JOIN public.mps p ON p.member_id = m.member_id AND p.current_member
        LEFT JOIN public.mp_outside_earnings_summary s ON s.member_id = m.member_id), '[]'::jsonb),
    'summary_updated', (SELECT max(updated_at) FROM public.mp_outside_earnings_summary)
  );
$fn$;

-- Same rules as lib/major-projects.ts fetchMajorProjects() for the list: a project's latest report gives its name,
-- department and the fields on its line; latest_year is the newest report in the table.
CREATE FUNCTION public.major_projects_list() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  WITH latest AS (
    SELECT DISTINCT ON (project_key) project_key, name, department_code, dept_slug, rating, rating_column, rating_withheld,
           end_date, end_text, report_year, data_as_at
      FROM public.major_projects
     ORDER BY project_key, report_year DESC
  ),
  plan AS (
    SELECT project_key, coalesce(bool_or(report_year = 2025 AND btrim(evaluation_plan, E' \t\r\n') = 'No'), false) AS no_plan_2025
      FROM public.major_projects GROUP BY project_key
  )
  SELECT jsonb_build_object(
    'latest_year', (SELECT coalesce(max(report_year), 0) FROM public.major_projects),
    'projects', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'project_key', l.project_key, 'name', l.name, 'department_code', l.department_code, 'dept_slug', l.dept_slug,
               'rating', l.rating, 'rating_column', l.rating_column, 'rating_withheld', l.rating_withheld,
               'end_date', l.end_date, 'end_text', l.end_text, 'report_year', l.report_year, 'data_as_at', l.data_as_at,
               'no_plan_2025', p.no_plan_2025) ORDER BY l.project_key)
        FROM latest l JOIN plan p USING (project_key)), '[]'::jsonb)
  );
$fn$;

COMMENT ON FUNCTION public.second_jobs_summary() IS
  'Serving MPs with a current Employment and earnings entry and their earnings totals, for /second-jobs (migration 2026-10-21a)';
COMMENT ON FUNCTION public.major_projects_list() IS
  'One line per Government Major Projects Portfolio project from its latest report, for /transparency/major-projects (migration 2026-10-21a)';
REVOKE ALL ON FUNCTION public.second_jobs_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.major_projects_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.second_jobs_summary() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.major_projects_list() TO anon, authenticated, service_role;

DO $$
DECLARE j jsonb; n bigint;
BEGIN
  j := public.second_jobs_summary();
  SELECT count(DISTINCT i.member_id) INTO n FROM public.mp_registered_interests i JOIN public.mps p ON p.member_id = i.member_id AND p.current_member
   WHERE i.category_name = '1. Employment and earnings' AND i.is_current;
  IF jsonb_array_length(j->'mps') <> n OR n = 0 THEN RAISE EXCEPTION 'second_jobs_summary has % MPs, expected %', jsonb_array_length(j->'mps'), n; END IF;

  j := public.major_projects_list();
  SELECT count(DISTINCT project_key) INTO n FROM public.major_projects;
  IF jsonb_array_length(j->'projects') <> n OR n = 0 THEN RAISE EXCEPTION 'major_projects_list has % projects, expected %', jsonb_array_length(j->'projects'), n; END IF;
  SELECT count(DISTINCT project_key) INTO n FROM public.major_projects WHERE report_year = 2025 AND btrim(evaluation_plan, E' \t\r\n') = 'No';
  IF (SELECT count(*) FROM jsonb_array_elements(j->'projects') e WHERE (e->>'no_plan_2025')::boolean) <> n THEN RAISE EXCEPTION 'no-plan count differs from %', n; END IF;

  IF NOT has_function_privilege('anon', 'public.second_jobs_summary()', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.major_projects_list()', 'EXECUTE') THEN RAISE EXCEPTION 'anon cannot run them'; END IF;
END $$;

SELECT jsonb_array_length(public.second_jobs_summary()->'mps') AS second_jobs_mps,
       jsonb_array_length(public.major_projects_list()->'projects') AS major_projects,
       public.major_projects_list()->'latest_year' AS latest_year,
       (SELECT count(*) FROM jsonb_array_elements(public.major_projects_list()->'projects') e WHERE (e->>'no_plan_2025')::boolean) AS no_plan_2025;

COMMIT;
