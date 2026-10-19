-- /expenses/refused: the page's four summaries worked out in the database (owner's approval, 19 Oct 2026), so the build
-- makes one small call instead of reading 4,621 claim rows in five pages. Read through PostgREST, the page's filter
-- (amount_not_paid > $1 OR amount_repaid > $2) could not use the partial index on a generic plan and scanned all 570,485
-- rows (1.6 to 11.4 s against anon's 3 s limit). Here the "> 0" is written into the query, so
-- mp_expenses_detail_refused_repaid_cover_idx always applies.
--
-- Same rules as the page (app/expenses/refused/page.tsx): serving MPs only (mps.current_member); an MP's name is the
-- latest one on their claims; a reason is grouped case-insensitively and shown as first recorded, blank as
-- '(no reason recorded)'; a blank year is 'unknown'; ties keep the order of first appearance (claim id).
-- Read only: SECURITY INVOKER, so it reads with the caller's own rights (anon can already read both tables).
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.expenses_refused_summary()') IS NOT NULL THEN RAISE EXCEPTION 'expenses_refused_summary() already exists'; END IF;
  IF to_regclass('public.mp_expenses_detail_refused_repaid_cover_idx') IS NULL THEN RAISE EXCEPTION 'the partial covering index is missing'; END IF;
END $$;

CREATE FUNCTION public.expenses_refused_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  WITH c AS (
    SELECT d.id, d.year, d.member_id, d.mp_name, d.amount_not_paid, d.amount_repaid, d.reason_if_not_paid
      FROM public.mp_expenses_detail d
     WHERE (d.amount_not_paid > 0 OR d.amount_repaid > 0)
       AND EXISTS (SELECT 1 FROM public.mps m WHERE m.member_id = d.member_id AND m.current_member)
  ),
  per_mp AS (
    SELECT member_id,
           (array_agg(mp_name ORDER BY id DESC) FILTER (WHERE mp_name IS NOT NULL AND mp_name <> ''))[1] AS mp_name,
           sum(amount_not_paid) FILTER (WHERE amount_not_paid > 0) AS refused,
           count(*) FILTER (WHERE amount_not_paid > 0) AS refused_count,
           min(id) FILTER (WHERE amount_not_paid > 0) AS refused_first,
           sum(amount_repaid) FILTER (WHERE amount_repaid > 0) AS repaid,
           count(*) FILTER (WHERE amount_repaid > 0) AS repaid_count,
           min(id) FILTER (WHERE amount_repaid > 0) AS repaid_first
      FROM c GROUP BY member_id
  ),
  per_year AS (
    SELECT coalesce(nullif(year, ''), 'unknown') AS year,
           coalesce(sum(amount_not_paid) FILTER (WHERE amount_not_paid > 0), 0) AS refused,
           count(*) FILTER (WHERE amount_not_paid > 0) AS refused_count,
           coalesce(sum(amount_repaid) FILTER (WHERE amount_repaid > 0), 0) AS repaid,
           count(*) FILTER (WHERE amount_repaid > 0) AS repaid_count
      FROM c GROUP BY 1
  ),
  per_reason AS (
    SELECT lower(btrim(coalesce(nullif(reason_if_not_paid, ''), '(no reason recorded)'))) AS k,
           (array_agg(btrim(coalesce(nullif(reason_if_not_paid, ''), '(no reason recorded)')) ORDER BY id))[1] AS reason,
           count(*) AS n, sum(amount_not_paid) AS total, min(id) AS first_id
      FROM c WHERE amount_not_paid > 0 GROUP BY 1
  )
  SELECT jsonb_build_object(
    'refused_by_mp', coalesce((SELECT jsonb_agg(jsonb_build_object('member_id', member_id, 'mp_name', coalesce(mp_name, 'Unknown'), 'total', refused, 'count', refused_count) ORDER BY refused DESC, refused_first)
                                 FROM per_mp WHERE refused_count > 0), '[]'::jsonb),
    'repaid_by_mp', coalesce((SELECT jsonb_agg(jsonb_build_object('member_id', member_id, 'mp_name', coalesce(mp_name, 'Unknown'), 'total', repaid, 'count', repaid_count) ORDER BY repaid DESC, repaid_first)
                                FROM per_mp WHERE repaid_count > 0), '[]'::jsonb),
    'by_year', coalesce((SELECT jsonb_agg(jsonb_build_object('year', year, 'refused', refused, 'refusedCount', refused_count, 'repaid', repaid, 'repaidCount', repaid_count) ORDER BY year DESC)
                           FROM per_year), '[]'::jsonb),
    'by_reason', coalesce((SELECT jsonb_agg(jsonb_build_object('reason', reason, 'count', n, 'total', total) ORDER BY total DESC, first_id)
                             FROM per_reason), '[]'::jsonb),
    'totals', (SELECT jsonb_build_object(
                 'refused', coalesce(sum(amount_not_paid) FILTER (WHERE amount_not_paid > 0), 0),
                 'refused_count', count(*) FILTER (WHERE amount_not_paid > 0),
                 'repaid', coalesce(sum(amount_repaid) FILTER (WHERE amount_repaid > 0), 0),
                 'repaid_count', count(*) FILTER (WHERE amount_repaid > 0),
                 'mps', count(DISTINCT member_id) FILTER (WHERE member_id > 0),
                 'rows', count(*)) FROM c)
  );
$fn$;

COMMENT ON FUNCTION public.expenses_refused_summary() IS
  'Refused and repaid IPSA claims by serving MPs: totals by MP, year and reason, for /expenses/refused (migration 2026-10-19s)';
REVOKE ALL ON FUNCTION public.expenses_refused_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expenses_refused_summary() TO anon, authenticated, service_role;

DO $$
DECLARE j jsonb; n bigint;
BEGIN
  j := public.expenses_refused_summary();
  -- the same rows the page reads today: refused or repaid claims by serving MPs
  SELECT count(*) INTO n FROM public.mp_expenses_detail d
   WHERE (d.amount_not_paid > 0 OR d.amount_repaid > 0) AND EXISTS (SELECT 1 FROM public.mps m WHERE m.member_id = d.member_id AND m.current_member);
  IF (j->'totals'->>'rows')::bigint <> n THEN RAISE EXCEPTION 'summary covers % rows, expected %', j->'totals'->>'rows', n; END IF;
  IF jsonb_array_length(j->'by_year') = 0 OR jsonb_array_length(j->'refused_by_mp') = 0 THEN RAISE EXCEPTION 'summary is empty'; END IF;
  IF NOT has_function_privilege('anon', 'public.expenses_refused_summary()', 'EXECUTE') THEN RAISE EXCEPTION 'anon cannot run it'; END IF;
END $$;

SELECT j->'totals' AS totals, jsonb_array_length(j->'refused_by_mp') AS refused_mps, jsonb_array_length(j->'repaid_by_mp') AS repaid_mps,
       jsonb_array_length(j->'by_year') AS years, jsonb_array_length(j->'by_reason') AS reasons
  FROM (SELECT public.expenses_refused_summary() AS j) s;

COMMIT;
