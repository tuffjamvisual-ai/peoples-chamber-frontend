-- Council service spending (full budget breakdown by service area).
--
-- Mirrors the council_public_health_metrics table's "latest only" shape
-- (2026-10-09-council-public-health-metrics-v2.sql): one row per council
-- per service category, overwritten on re-import rather than a time
-- series.
--
-- service_category is each nation's OWN real category label, verbatim
-- from its source (England's 13 RSX services, Scotland's 8 LFR workbook
-- services, Wales's 11 StatsWales services) -- deliberately NOT forced
-- into one shared cross-nation taxonomy, since the real categories don't
-- line up 1:1 across nations (confirmed live against all three sources
-- on 2026-10-09).
--
-- Northern Ireland gets no rows in this table at all -- confirmed via the
-- NI Audit Office's own 2026 Local Government Auditor's Report that no
-- comparable per-council, per-service breakdown is published for NI
-- councils (councils aren't required to report within a consistent
-- framework). Handled in the UI as an explicit "not available" state,
-- not as placeholder rows against a category list that doesn't exist for NI.
--
-- value_pounds is converted from each source's native £ thousand unit to
-- actual pounds, so every row in this table is directly comparable
-- regardless of source.

CREATE TABLE IF NOT EXISTS public.council_service_spending (
  id                 bigserial PRIMARY KEY,
  council_gss_code   text NOT NULL,
  council_name       text NOT NULL,
  nation             text NOT NULL,
  source             text NOT NULL,        -- 'mhclg_rsx' | 'scotland_lfr' | 'statswales'
  service_category   text NOT NULL,        -- nation's own label, verbatim
  value_pounds       numeric,
  period_label       text,
  period_end         date,
  metadata_json       jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS council_service_spending_uniq
  ON public.council_service_spending (council_gss_code, service_category);

CREATE INDEX IF NOT EXISTS idx_council_service_spending_gss
  ON public.council_service_spending (council_gss_code);

CREATE INDEX IF NOT EXISTS idx_council_service_spending_nation
  ON public.council_service_spending (nation);

ALTER TABLE public.council_service_spending DISABLE ROW LEVEL SECURITY;
