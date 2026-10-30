-- Undo 2026-10-30b-pac-target-updates.sql: puts back the 2026-10-30a status view, then drops pac_target_updates
-- (and its data).
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DROP VIEW IF EXISTS public.pac_recommendation_status;
CREATE VIEW public.pac_recommendation_status WITH (security_invoker = true) AS
WITH ev AS (
  SELECT e.*, d.published_on, d.kind AS document_kind, d.cp_number,
         -- The current target is the latest one written (revised, else target, else original), even when it is not
         -- a date: a revised target kept as written must not fall back to the original month.
         CASE WHEN e.revised_target_text IS NOT NULL THEN e.revised_target_month WHEN e.target_text IS NOT NULL THEN e.target_month ELSE e.original_target_month END AS current_month,
         coalesce(e.revised_target_text, e.target_text, e.original_target_text) AS current_text,
         row_number() OVER (PARTITION BY e.recommendation_id ORDER BY d.published_on DESC, d.id DESC) AS newest,
         row_number() OVER (PARTITION BY e.recommendation_id ORDER BY d.published_on, d.id) AS oldest
  FROM public.pac_recommendation_events e
  JOIN public.pac_source_documents d ON d.id = e.document_id
),
latest AS (SELECT * FROM ev WHERE newest = 1),
seq AS (
  SELECT recommendation_id, published_on, 0 AS part, original_target_month AS m FROM ev WHERE oldest = 1 AND original_target_month IS NOT NULL
  UNION ALL
  SELECT recommendation_id, published_on, 1, current_month FROM ev WHERE current_month IS NOT NULL
),
steps AS (
  SELECT recommendation_id, m,
         lag(m) OVER (PARTITION BY recommendation_id ORDER BY published_on, part) AS prev,
         row_number() OVER (PARTITION BY recommendation_id ORDER BY published_on, part) AS k
  FROM seq
),
moves AS (
  SELECT recommendation_id, count(*) FILTER (WHERE m > prev) AS times_target_moved, max(m) FILTER (WHERE k = 1) AS original_target_month
  FROM steps GROUP BY recommendation_id
),
evid AS (
  SELECT recommendation_id,
         (array_agg(evidence_title ORDER BY delivered_on, id))[1] AS evidence_title,
         (array_agg(evidence_url ORDER BY delivered_on, id))[1] AS evidence_url,
         min(delivered_on) AS evidence_delivered_on,
         jsonb_agg(jsonb_build_object('title', evidence_title, 'url', evidence_url, 'delivered_on', delivered_on, 'publisher', publisher, 'note', note) ORDER BY delivered_on, id) AS evidence
  FROM public.pac_delivery_evidence GROUP BY recommendation_id
),
flags AS (
  SELECT l.recommendation_id,
    (SELECT min(x.implemented_month) FROM ev x WHERE x.recommendation_id = l.recommendation_id AND x.status = 'implemented') AS implemented_month,
    EXISTS (SELECT 1 FROM ev x WHERE x.recommendation_id = l.recommendation_id AND x.status = 'implemented') AS is_implemented,
    -- Parts answered in a document dated after the bare number's latest event.
    CASE WHEN r.rec_number ~ '^[0-9]+$' THEN
      (SELECT array_agg(DISTINCT r2.rec_number ORDER BY r2.rec_number) FROM public.pac_recommendations r2
        JOIN ev y ON y.recommendation_id = r2.id
        WHERE r2.report_id = r.report_id AND r2.rec_number ~ ('^' || r.rec_number || '[a-z]$') AND y.published_on > l.published_on)
    END AS split_into,
    (SELECT d2.cp_number FROM public.pac_progress_completed_reports c JOIN public.pac_source_documents d2 ON d2.id = c.document_id
      WHERE c.report_id = r.report_id AND d2.published_on > l.published_on ORDER BY d2.published_on LIMIT 1) AS completed_in,
    -- The first progress report after the latest event whose update covers this report.
    (SELECT d2.id FROM public.pac_source_documents d2
      WHERE d2.kind = 'progress_report' AND d2.published_on > l.published_on
        AND EXISTS (SELECT 1 FROM public.pac_recommendation_events y JOIN public.pac_recommendations r2 ON r2.id = y.recommendation_id
                    WHERE y.document_id = d2.id AND r2.report_id = r.report_id)
      ORDER BY d2.published_on LIMIT 1) AS not_listed_in_document_id
  FROM latest l
  JOIN public.pac_recommendations r ON r.id = l.recommendation_id
)
SELECT
  r.id AS recommendation_id,
  p.session, p.report_number, p.title AS report_title, p.department, r.rec_number,
  CASE
    WHEN f.is_implemented THEN 'implemented'
    WHEN ev2.recommendation_id IS NOT NULL THEN 'delivered_elsewhere'
    WHEN f.split_into IS NOT NULL THEN 'split'
    WHEN l.response = 'disagree' THEN 'rejected'
    WHEN f.completed_in IS NOT NULL THEN 'report_completed'
    WHEN f.not_listed_in_document_id IS NOT NULL THEN 'not_listed_in_later_update'
    WHEN l.current_month < date_trunc('month', current_date)::date
         AND rv.outcome = 'no_later_evidence' AND rv.checked_on >= (l.current_month + interval '1 month')::date THEN 'target_passed_checked'
    WHEN l.current_month < date_trunc('month', current_date)::date THEN 'target_passed_unchecked'
    WHEN l.current_month IS NOT NULL THEN 'target_in_future'
    ELSE 'no_dated_target'
  END AS status,
  l.response AS latest_response,
  l.status AS latest_event_status,
  coalesce(m.times_target_moved, 0) AS times_target_moved,
  m.original_target_month,
  l.current_month AS latest_target_month,
  l.current_text AS latest_target_text,
  f.implemented_month,
  f.split_into,
  f.completed_in AS completed_in_cp_number,
  nd.cp_number AS not_listed_in_cp_number,
  nd.published_on AS not_listed_in_published_on,
  l.needs_review AS latest_needs_review,
  l.cp_number AS latest_cp_number,
  l.published_on AS latest_published_on,
  l.id AS latest_event_id,
  ev2.evidence_title,
  ev2.evidence_url,
  ev2.evidence_delivered_on,
  ev2.evidence,
  rv.checked_on AS review_checked_on,
  rv.outcome AS review_outcome,
  rv.note AS review_note,
  rv.url AS review_url
FROM public.pac_recommendations r
JOIN public.pac_reports p ON p.id = r.report_id
JOIN latest l ON l.recommendation_id = r.id
JOIN flags f ON f.recommendation_id = r.id
LEFT JOIN public.pac_source_documents nd ON nd.id = f.not_listed_in_document_id
LEFT JOIN moves m ON m.recommendation_id = r.id
LEFT JOIN evid ev2 ON ev2.recommendation_id = r.id
LEFT JOIN public.pac_recommendation_review rv ON rv.recommendation_id = r.id;
COMMENT ON VIEW public.pac_recommendation_status IS
  'One status per Committee of Public Accounts recommendation, from HM Treasury Treasury Minutes and Progress Reports (GOV.UK, Open Government Licence v3.0). See migration 2026-10-29e for the order of precedence.';
REVOKE ALL ON public.pac_recommendation_status FROM anon, authenticated;
DROP TABLE IF EXISTS public.pac_target_updates;

COMMIT;
