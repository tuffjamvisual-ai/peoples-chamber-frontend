-- 2026-10-29e: recommendations tracker stage 3 (owner's approval, 29 Oct 2026, "go stage 3"). One new table (the
-- reports each Treasury Minutes Progress Report lists under "Reports completed") and one view (one status per
-- recommendation). No existing table is changed. Undo: 2026-10-29e-UNDO.sql (drops this view and table only).
-- Secured like every table since 2026-10-28j: row level security on, no policies, nothing granted to anon or
-- authenticated. The view runs with the caller's rights (security_invoker) and is not granted to anon or
-- authenticated either, so only the server key can read it.

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- a. Reports listed under "Reports completed" in each progress report.
CREATE TABLE public.pac_progress_completed_reports (
  document_id bigint NOT NULL REFERENCES public.pac_source_documents (id),
  report_id   bigint NOT NULL REFERENCES public.pac_reports (id),
  PRIMARY KEY (document_id, report_id)
);
CREATE INDEX pac_progress_completed_reports_report_idx ON public.pac_progress_completed_reports (report_id);
COMMENT ON TABLE public.pac_progress_completed_reports IS
  'Committee of Public Accounts reports each HM Treasury Treasury Minutes Progress Report lists under "Reports completed". Source: GOV.UK, Open Government Licence v3.0.';
ALTER TABLE public.pac_progress_completed_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pac_progress_completed_reports FROM anon, authenticated;

-- b. One row per recommendation: its latest event and one status, first match wins:
--   implemented                any document says "Recommendation implemented"
--   rejected                   the latest response is disagree
--   report_completed           a progress report dated after the latest event lists the report as completed
--   dropped_from_update        it appeared in a progress report's update, and a later progress report (after its
--                              latest event) updates the same report without it
--   target_passed_unconfirmed  the latest target month ended before the current month
--   target_in_future           the latest target month is this month or later
--   no_dated_target            the latest event has no target month (kept as written, or none given)
-- Months are the first day of the month that ends the period written (Summer 2027 is 2027-08-01), so a target has
-- passed once its month is before the current month. times_target_moved counts each later month in the sequence: the
-- first event's original target (if given), then each document's current target (revised, else target, else original).
CREATE OR REPLACE VIEW public.pac_recommendation_status WITH (security_invoker = true) AS
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
flags AS (
  SELECT l.recommendation_id,
    (SELECT min(x.implemented_month) FROM ev x WHERE x.recommendation_id = l.recommendation_id AND x.status = 'implemented') AS implemented_month,
    EXISTS (SELECT 1 FROM ev x WHERE x.recommendation_id = l.recommendation_id AND x.status = 'implemented') AS is_implemented,
    (SELECT d2.cp_number FROM public.pac_progress_completed_reports c JOIN public.pac_source_documents d2 ON d2.id = c.document_id
      WHERE c.report_id = r.report_id AND d2.published_on > l.published_on ORDER BY d2.published_on LIMIT 1) AS completed_in,
    CASE WHEN EXISTS (SELECT 1 FROM ev x WHERE x.recommendation_id = l.recommendation_id AND x.document_kind = 'progress_report') THEN
      (SELECT d2.cp_number FROM public.pac_source_documents d2
        WHERE d2.kind = 'progress_report' AND d2.published_on > l.published_on
          AND EXISTS (SELECT 1 FROM public.pac_recommendation_events y JOIN public.pac_recommendations r2 ON r2.id = y.recommendation_id
                      WHERE y.document_id = d2.id AND r2.report_id = r.report_id)
        ORDER BY d2.published_on LIMIT 1)
    END AS dropped_in
  FROM latest l
  JOIN public.pac_recommendations r ON r.id = l.recommendation_id
)
SELECT
  r.id AS recommendation_id,
  p.session, p.report_number, p.title AS report_title, p.department, r.rec_number,
  CASE
    WHEN f.is_implemented THEN 'implemented'
    WHEN l.response = 'disagree' THEN 'rejected'
    WHEN f.completed_in IS NOT NULL THEN 'report_completed'
    WHEN f.dropped_in IS NOT NULL THEN 'dropped_from_update'
    WHEN l.current_month < date_trunc('month', current_date)::date THEN 'target_passed_unconfirmed'
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
  f.completed_in AS completed_in_cp_number,
  f.dropped_in AS dropped_in_cp_number,
  l.needs_review AS latest_needs_review,
  l.cp_number AS latest_cp_number,
  l.published_on AS latest_published_on,
  l.id AS latest_event_id
FROM public.pac_recommendations r
JOIN public.pac_reports p ON p.id = r.report_id
JOIN latest l ON l.recommendation_id = r.id
JOIN flags f ON f.recommendation_id = r.id
LEFT JOIN moves m ON m.recommendation_id = r.id;
COMMENT ON VIEW public.pac_recommendation_status IS
  'One status per Committee of Public Accounts recommendation, from HM Treasury Treasury Minutes and Progress Reports (GOV.UK, Open Government Licence v3.0). See migration 2026-10-29e for the order of precedence.';
REVOKE ALL ON public.pac_recommendation_status FROM anon, authenticated;

COMMIT;
