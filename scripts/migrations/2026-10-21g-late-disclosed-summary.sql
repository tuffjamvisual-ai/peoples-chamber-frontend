-- /donations/late-disclosed (owner's approval, 21 Oct 2026, build reliability): the page read every donation over
-- £1,500 with both dates, 1,000 rows at a time (53,919 rows; it stopped at 50,000, so the oldest-reported rows were
-- left out), to keep those disclosed more than 90 days after acceptance. Once failed reads throw, that read timed
-- out the Vercel build of 7643b6e. late_disclosed_summary() returns what the page shows, from every row: the counts
-- by delay, the total, the 30 recipients with most late donations and the 50 longest delays. A partial index holds
-- only the late donations (14,545), so the summary reads them from the index.
-- Same rules as the page: amount >= 1500, both dates present, gap = reported_date - accepted_date in days, > 90;
-- recipients named as recorded (trimmed), "(unknown)" when blank. Read only, SECURITY INVOKER.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$
BEGIN
  IF to_regclass('public.political_donations_late_idx') IS NOT NULL THEN RAISE EXCEPTION 'index already exists'; END IF;
  IF to_regprocedure('public.late_disclosed_summary()') IS NOT NULL THEN RAISE EXCEPTION 'function already exists'; END IF;
END $$;

CREATE INDEX political_donations_late_idx ON public.political_donations ((reported_date - accepted_date) DESC)
  INCLUDE (id, donor_name, recipient_name, recipient_type, accepted_date, reported_date, amount)
  WHERE accepted_date IS NOT NULL AND reported_date IS NOT NULL AND amount >= 1500 AND reported_date - accepted_date > 90;

CREATE FUNCTION public.late_disclosed_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $fn$
  WITH late AS (
    SELECT id, donor_name, recipient_name, recipient_type, accepted_date, reported_date, amount,
           (reported_date - accepted_date) AS gap,
           coalesce(nullif(btrim(recipient_name), ''), '(unknown)') AS recipient
      FROM public.political_donations
     WHERE accepted_date IS NOT NULL AND reported_date IS NOT NULL AND amount >= 1500 AND reported_date - accepted_date > 90
  )
  SELECT jsonb_build_object(
    'total_count', (SELECT count(*) FROM late),
    'total_amount', (SELECT coalesce(sum(amount), 0) FROM late),
    'buckets', jsonb_build_object(
      '90 to 180 days', (SELECT count(*) FROM late WHERE gap <= 180),
      '180 to 365 days', (SELECT count(*) FROM late WHERE gap > 180 AND gap <= 365),
      '1 to 2 years', (SELECT count(*) FROM late WHERE gap > 365 AND gap <= 730),
      'over 2 years', (SELECT count(*) FROM late WHERE gap > 730)),
    'by_recipient', coalesce((SELECT jsonb_agg(jsonb_build_object('name', recipient, 'count', n, 'total', total, 'worstGap', worst) ORDER BY n DESC, worst DESC, recipient)
      FROM (SELECT recipient, count(*) AS n, sum(amount) AS total, max(gap) AS worst FROM late GROUP BY recipient ORDER BY count(*) DESC, max(gap) DESC, recipient LIMIT 30) r), '[]'::jsonb),
    'top', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'donor_name', donor_name, 'recipient_name', recipient_name, 'recipient_type', recipient_type,
                                                          'accepted_date', accepted_date, 'reported_date', reported_date, 'amount', amount, 'gap', gap) ORDER BY gap DESC, reported_date DESC, id)
      FROM (SELECT * FROM late ORDER BY gap DESC, reported_date DESC, id LIMIT 50) t), '[]'::jsonb)
  );
$fn$;
COMMENT ON FUNCTION public.late_disclosed_summary() IS 'Donations disclosed more than 90 days after acceptance, for /donations/late-disclosed (migration 2026-10-21g)';
REVOKE ALL ON FUNCTION public.late_disclosed_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.late_disclosed_summary() TO anon, authenticated, service_role;
ANALYZE public.political_donations;

DO $$
DECLARE j jsonb; n bigint;
BEGIN
  j := public.late_disclosed_summary();
  SELECT count(*) INTO n FROM public.political_donations WHERE accepted_date IS NOT NULL AND reported_date IS NOT NULL AND amount >= 1500 AND reported_date - accepted_date > 90;
  IF (j->>'total_count')::bigint <> n OR n = 0 THEN RAISE EXCEPTION 'summary counts % late donations, expected %', j->>'total_count', n; END IF;
  IF (SELECT sum(value::bigint) FROM jsonb_each_text(j->'buckets')) <> n THEN RAISE EXCEPTION 'buckets do not add up to %', n; END IF;
  IF jsonb_array_length(j->'top') <> 50 OR jsonb_array_length(j->'by_recipient') <> 30 THEN RAISE EXCEPTION 'expected 50 top rows and 30 recipients'; END IF;
END $$;
COMMIT;
