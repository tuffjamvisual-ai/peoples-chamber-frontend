-- Migration: council public health metrics (full UK coverage)
-- Date: 2026-10-09
--
-- Supersedes the earlier same-day draft (2026-10-09-council-public-health-metrics.sql,
-- never relayed/run), which was designed before the full-UK-coverage
-- requirement was raised and only covered England via Fingertips.
--
-- SOURCES — confirmed live this session, not assumed
-- ───────────────────────────────────────────────────────────────────
-- Smoking / physical activity / obesity prevalence:
--   - England: OHID Fingertips API (fingertips.phe.org.uk/api), free,
--     no key, Open Government Licence/Crown Copyright. Indicators
--     92443 (smoking), 93014 (physical activity), 93088 (obesity).
--   - Scotland: "Scottish Health Survey-Local area level data", via the
--     free, keyless CKAN API at api.data.gov.scot (resource_id
--     0bba33f7-491e-4a77-b0ca-5a1d8a72f59f). Filter: GeographyType=
--     "Council Areas", Measurement="Percent", Sex="All". Confirmed
--     clean (32 councils, one row each) for all three indicators via a
--     full 300,711-row scan (the resource's "filters" query parameter
--     does not work reliably on this field — verified empirically after
--     it silently returned the unfiltered total every time — so the
--     import script must filter client-side after downloading the full
--     resource, not rely on server-side filtering).
--   - Wales, Northern Ireland: confirmed no local-authority-level
--     source currently exists for these three indicators (Wales's
--     National Survey only publishes at local-health-board level, not
--     local authority; Northern Ireland's Health Survey isn't broken
--     out by Local Government District in NISRA's data builder at
--     all). Per explicit user decision, these appear as NULL-value
--     rows with source='no_data_available' rather than being silently
--     absent, so the council page can show "no data available" rather
--     than nothing — worded that way deliberately, since this is a
--     current source gap, not a permanent one.
--
-- Life expectancy at birth (separate from the three above — comes from
-- ONS directly, not Fingertips or the Scottish Health Survey):
--   - England + Wales + Scotland: ONS "Life expectancy for local areas
--     of Great Britain" (XLSX bulk download, no API). Confirmed via a
--     real download that Scotland (S12-prefix codes) IS included
--     despite earlier doubt — 27,720 Scotland rows found directly.
--   - Northern Ireland: ONS "Life expectancy for local areas in
--     England, Northern Ireland and Wales" (a different, separately
--     published XLSX). Confirmed NI uses the CURRENT 11 Local
--     Government Districts (N09000001-N09000011), not the old 26
--     pre-2015 districts — no translation map needed for NI.
--
-- GEOGRAPHY VINTAGE CAVEATS
-- ───────────────────────────────────────────────────────────────────
-- Fingertips (England): same Barnsley/Sheffield caveat as every other
-- geography source in this project. Fingertips's area_type_id=501
-- still returns E08000016 (Barnsley) and E08000019 (Sheffield) — the
-- OLD pre-2025 codes — not councils.gss_code's E08000038/E08000039.
-- Any import/join must translate those two codes explicitly.
--
-- Scotland (both the Health Survey CKAN resource and the ONS GB life
-- expectancy file): S12-prefix codes, confirmed to be the standard
-- current Scottish council GSS code scheme — no translation map found
-- to be necessary, but this has only been spot-checked (Clackmannanshire
-- S12000005), not cross-checked against every one of the 32 councils
-- in councils.gss_code. Worth a belt-and-braces check in the import
-- script itself (log any Scotland code that doesn't match a row in
-- councils) rather than assuming every one of the 32 matches.
--
-- Northern Ireland (ONS EN+NI+Wales life expectancy file): N09-prefix
-- current codes, as above — same belt-and-braces caveat applies.
--
-- SCHEMA SHAPE — WHY "ONE ROW PER COUNCIL PER METRIC", NOT A TIME SERIES
-- ───────────────────────────────────────────────────────────────────
-- Unlike welfare_local_authority_metrics (a genuine monthly/quarterly
-- time series from DWP), every source feeding this table publishes an
-- occasional "latest available period" snapshot (Fingertips's yearly
-- indicators, the Scottish Health Survey's multi-year rolling windows,
-- ONS's multi-year life expectancy windows) at different, uncoordinated
-- cadences per nation. Modelling this as a time series would mean
-- joining across periods that don't line up across nations. Instead
-- this table holds ONE current row per (council, metric) — the latest
-- period available from that council's own source — with period_label
-- and period_end kept purely as display/provenance metadata, not part
-- of the uniqueness constraint. A later refresh run REPLACES the
-- existing row for that council+metric rather than adding a new period
-- row, via upsert on (council_gss_code, metric_key).
--
-- NULL-VALUE ROWS FOR WALES/NORTHERN IRELAND
-- ───────────────────────────────────────────────────────────────────
-- Per explicit user decision, Wales and Northern Ireland get real rows
-- with value=NULL and source='no_data_available' for smoking/physical
-- activity/obesity (not simply absent rows), so the council page's
-- query can distinguish "we checked, no source exists yet" from "we
-- never imported this council at all". value is nullable specifically
-- to support this.
--
-- Deliberately worded as "no data available" rather than "not
-- available" or "unsupported": this reflects that no local-authority-
-- level source exists FOR NOW, not a permanent architectural limit.
-- Wales or Northern Ireland publishing this data at local-authority
-- level in future is a re-import away from filling these rows in, not
-- a schema change — re-running the import script with a newly-found
-- source for that nation would simply overwrite these NULL rows with
-- real values via the same upsert on (council_gss_code, metric_key).
--
-- WHY A NEW TABLE, NOT REUSING welfare_local_authority_metrics
-- ───────────────────────────────────────────────────────────────────
-- Same reasoning as why welfare_local_authority_metrics is separate
-- from welfare_constituency_metrics: different source, different
-- metric_key namespace, different units — keeping this as its own
-- table avoids metric_key collisions and keeps each source's own
-- geography-vintage caveat scoped to just this table's comments.

BEGIN;

CREATE TABLE IF NOT EXISTS public.council_public_health_metrics (
  id                 bigserial PRIMARY KEY,
  council_gss_code   text NOT NULL,         -- current GSS code, translated to councils.gss_code vintage at import time — see notes above
  council_name       text NOT NULL,          -- stored directly from the source label at import time
  metric_key         text NOT NULL,          -- e.g. 'smoking_prevalence', 'physical_activity_prevalence', 'obesity_prevalence', 'life_expectancy_male', 'life_expectancy_female'
  nation             text NOT NULL,          -- 'England' | 'Scotland' | 'Wales' | 'Northern Ireland'
  source             text NOT NULL,          -- 'fingertips' | 'scottish_health_survey' | 'ons_life_expectancy_gb' | 'ons_life_expectancy_ni' | 'no_data_available'
  indicator_id       integer,                -- Fingertips's own indicator ID where applicable, for traceability; NULL for non-Fingertips sources
  value              numeric,                -- NULL for Wales/NI rows where source='no_data_available'
  unit               text,                   -- NULL alongside a NULL value
  period_label       text,                   -- raw source period label, e.g. "2025", "2024/25", "2019-2023"; NULL for no_data_available rows
  period_end         date,                   -- derived from period_label for display/sorting; NULL for no_data_available rows
  metadata_json      jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS council_public_health_metrics_uniq
  ON public.council_public_health_metrics (council_gss_code, metric_key);

CREATE INDEX IF NOT EXISTS idx_council_public_health_metrics_gss
  ON public.council_public_health_metrics (council_gss_code);

CREATE INDEX IF NOT EXISTS idx_council_public_health_metrics_key
  ON public.council_public_health_metrics (metric_key);

CREATE INDEX IF NOT EXISTS idx_council_public_health_metrics_nation
  ON public.council_public_health_metrics (nation);

ALTER TABLE public.council_public_health_metrics DISABLE ROW LEVEL SECURITY;

COMMIT;
