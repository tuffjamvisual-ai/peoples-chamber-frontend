-- Migration: welfare local authority schema
-- Date: 2026-10-07
--
-- Adds the Local Authority (council) tier of the welfare explorer,
-- mirroring the existing constituency-level tables (see the 2026-10-06
-- migration) so the search UI can offer TPA's Constituency/Local
-- authority toggle with genuinely separately-sourced council-level
-- totals, not a re-aggregation of constituency data.
--
-- WHY A SEPARATE PAIR OF TABLES, NOT A SHARED ONE WITH A "LEVEL" COLUMN
-- ───────────────────────────────────────────────────────────────────────
-- Constituency and local authority rows use different geography code
-- VINTAGES (see below) and come from structurally different queries
-- (PCON24 field vs. a nested COA_CODE valueset), so keeping them as
-- separate tables avoids a single geography-code column having to carry
-- two different meanings depending on a level flag, and keeps the
-- existing welfare_constituency_* tables completely unchanged.
--
-- GEOGRAPHY VINTAGE — READ BEFORE IMPORTING INTO THESE TABLES
-- ───────────────────────────────────────────────────────────────────────
-- council_gss_code here is NOT the same vintage as
-- welfare_constituency_geography.council_gss_code (which comes from the
-- May 2025 ONS Ward-to-Constituency-to-LAD lookup). It is DWP Stat-Xplore
-- and Nomis's own native local authority geography:
--   - Stat-Xplore: the V_C_MASTERGEOG21_LA_TO_REGION valueset, nested
--     under each benefit database's own COA_CODE field (same valueset
--     name confirmed present across all six benefit databases:
--     UC_Households, hb_new, PIP_Monthly_new, DLA_In_Payment_New,
--     CA_In_Payment_New, ESA_Caseload_new).
--   - Nomis: geography TYPE424 ("local authorities: district / unitary,
--     as of April 2023"), used for both population (NM_2014_1) and
--     median wage (NM_99_1) — confirmed to return the same GSS codes as
--     Stat-Xplore's valueset (350 real councils; Stat-Xplore's raw
--     valueset also includes 2 non-geographic placeholder codes,
--     "Abroad" and "Unknown", which import scripts must exclude).
--
-- Both sources were independently confirmed (via live test queries
-- cross-checked against TPA's own published Westminster figures across
-- all six benefits) to be on the SAME boundary vintage as each other,
-- EXCEPT for two councils that were reorganised in 2025:
--   - Barnsley:  Stat-Xplore/Nomis use E08000016 (pre-2025, "old")
--                our site's main councils table / welfare_constituency_geography
--                use E08000038 (2025 boundary change, "new")
--   - Sheffield: Stat-Xplore/Nomis use E08000019 (old)
--                our site's main councils table uses E08000039 (new)
-- (Confirmed directly against ONS's own area page for E08000038, which
-- states "In 2025, this area replaced the previous Barnsley
-- (E08000016)".) Any code that joins welfare_local_authority_summary back
-- to the site's existing councils table or to welfare_constituency_geography
-- for navigation/display purposes must translate these two codes
-- explicitly — there is no single shared code to standardise on across
-- all of the site's geography tables, only within this welfare LA
-- feature's own two source APIs.
--
-- Everything else below mirrors the constituency tables' design exactly
-- (see the 2026-10-06 migration's own comments for the long-form vs.
-- denormalised-summary rationale, which applies identically here).

BEGIN;

CREATE TABLE IF NOT EXISTS public.welfare_local_authority_metrics (
  id                 bigserial PRIMARY KEY,
  council_gss_code   text NOT NULL,         -- DWP/Nomis native vintage — see note above
  council_name       text NOT NULL,          -- stored directly from the source label at import time (not joined), since the site's main councils table uses a different code vintage for 2 councils
  metric_key         text NOT NULL,
  value              numeric,
  unit               text NOT NULL,
  period_start       date,
  period_end         date,
  source_release_id  bigint REFERENCES public.welfare_source_releases (id),
  status             text NOT NULL DEFAULT 'ok',
  metadata_json      jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS welfare_local_authority_metrics_uniq
  ON public.welfare_local_authority_metrics (council_gss_code, metric_key, period_end);

CREATE INDEX IF NOT EXISTS idx_welfare_local_authority_metrics_gss
  ON public.welfare_local_authority_metrics (council_gss_code);

CREATE INDEX IF NOT EXISTS idx_welfare_local_authority_metrics_key
  ON public.welfare_local_authority_metrics (metric_key);

CREATE TABLE IF NOT EXISTS public.welfare_local_authority_summary (
  council_gss_code          text PRIMARY KEY,
  council_name              text NOT NULL,
  headline_period_end       date NOT NULL,
  total_six_benefit_spend   numeric NOT NULL,
  spend_per_resident        numeric NOT NULL,
  rank_total_spend          integer NOT NULL,
  rank_spend_per_resident   integer NOT NULL,
  baseline_period_end       date,
  baseline_total_spend      numeric,
  cash_change                numeric,
  percentage_change          numeric,
  population                 bigint NOT NULL,
  population_reference_year  integer NOT NULL,
  latest_source_update        timestamptz NOT NULL,
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.welfare_local_authority_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.welfare_local_authority_summary  DISABLE ROW LEVEL SECURITY;

COMMIT;
