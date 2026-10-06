-- Migration: welfare explorer schema
-- Date: 2026-10-06
--
-- Foundation tables for the welfare spending/caseload tool
-- (/tools/welfare). Three new tables plus one new column on the
-- existing mps table. No RLS — these are public DWP/ONS figures,
-- consistent with other public reference tables (e.g.
-- mp_conduct_findings, councils) which also ship without RLS.
--
-- Design decisions:
--   - constituency_gss_code lives on mps, not on a new constituencies
--     table. mps.constituency is already a 1:1 text identifier for a
--     current MP's seat; adding the GSS code as a column keeps the
--     existing find-mp / PostcodeLookup flow as the single place that
--     resolves postcode -> constituency, rather than introducing a
--     second, parallel constituency model the audit was told to avoid.
--   - welfare_constituency_metrics is long-form (one row per
--     constituency/metric/period) so new DWP measures (e.g. a future
--     PIP sub-category) can be added later without a schema change —
--     mirrors the brief's own suggested design.
--   - welfare_constituency_summary is a denormalised table, not a
--     view, because ranks (rank_total_spend, rank_spend_per_resident)
--     require a full-sector sort that is cheap to compute once after
--     an import and expensive to compute per page request. It is
--     truncated and rebuilt wholesale after a validated import — see
--     the "rebuild welfare constituency summaries and ranks" ingestion
--     job — never updated row-by-row.
--   - status on welfare_constituency_metrics distinguishes a genuinely
--     missing/suppressed source value from a true zero. Ingestion must
--     write status = 'suppressed' or 'unavailable' rather than value =
--     0 when DWP/ONS withholds a figure.

BEGIN;

ALTER TABLE public.mps
  ADD COLUMN IF NOT EXISTS constituency_gss_code text;

CREATE INDEX IF NOT EXISTS idx_mps_constituency_gss_code
  ON public.mps (constituency_gss_code);

-- One record per source import (a DWP Stat-Xplore pull, an ONS/Nomis
-- pull, etc). Makes the provenance chain inspectable from the
-- methodology page and from support queries ("which release is this
-- figure from, and when was it retrieved").
CREATE TABLE IF NOT EXISTS public.welfare_source_releases (
  id                      bigserial PRIMARY KEY,
  source_name             text NOT NULL,       -- e.g. 'dwp_stat_xplore', 'ons_nomis_population', 'ons_nomis_ashe'
  dataset_id              text NOT NULL,        -- Stat-Xplore dataset ID, or an equivalent Nomis dataset code
  source_url              text,
  release_date            date,                 -- date the source itself published this data
  reference_period_start  date,
  reference_period_end    date,
  retrieved_at            timestamptz NOT NULL DEFAULT now(),
  source_hash             text,                 -- hash of the raw response, for the weekly "did anything change" check
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_welfare_source_releases_source_name
  ON public.welfare_source_releases (source_name, reference_period_end);

-- Long-form metric table. One row per (constituency, metric, period).
-- Deliberately not wide/columnar so new DWP measures (e.g. a future
-- PIP sub-category) can be added without a migration.
CREATE TABLE IF NOT EXISTS public.welfare_constituency_metrics (
  id                   bigserial PRIMARY KEY,
  constituency_gss_code text NOT NULL,
  metric_key           text NOT NULL,         -- e.g. 'uc_spend_12m', 'pip_people', 'median_full_time_weekly_pay'
  value                numeric,
  unit                 text NOT NULL,          -- e.g. 'gbp', 'people', 'households', 'gbp_per_week'
  period_start         date,
  period_end           date,
  source_release_id    bigint REFERENCES public.welfare_source_releases (id),
  status                text NOT NULL DEFAULT 'ok',  -- 'ok' | 'suppressed' | 'unavailable' | 'estimate_unreliable'
  metadata_json        jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- One current value per (constituency, metric, period) — re-importing
-- the same period updates in place rather than duplicating rows.
CREATE UNIQUE INDEX IF NOT EXISTS welfare_constituency_metrics_uniq
  ON public.welfare_constituency_metrics (constituency_gss_code, metric_key, period_end);

CREATE INDEX IF NOT EXISTS idx_welfare_constituency_metrics_gss
  ON public.welfare_constituency_metrics (constituency_gss_code);

CREATE INDEX IF NOT EXISTS idx_welfare_constituency_metrics_key
  ON public.welfare_constituency_metrics (metric_key);

-- Denormalised current summary for fast page reads. Rebuilt wholesale
-- (delete + re-insert inside one transaction) after each successful,
-- validated import. Never written to directly by the public site.
CREATE TABLE IF NOT EXISTS public.welfare_constituency_summary (
  constituency_gss_code     text PRIMARY KEY,
  headline_period_end       date NOT NULL,
  total_six_benefit_spend   numeric NOT NULL,
  spend_per_resident        numeric NOT NULL,
  rank_total_spend          integer NOT NULL,
  rank_spend_per_resident   integer NOT NULL,
  baseline_period_end       date,
  baseline_total_spend      numeric,
  cash_change               numeric,
  percentage_change         numeric,
  population                bigint NOT NULL,
  population_reference_year integer NOT NULL,
  latest_source_update      timestamptz NOT NULL,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

COMMIT;
