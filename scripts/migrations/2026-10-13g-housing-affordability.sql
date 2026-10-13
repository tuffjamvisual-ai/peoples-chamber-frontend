-- Housing affordability (England and Wales): ONS house price to residence-based earnings
-- ratio by local authority district, one row per council, measure and year.
--   measure 'median'  = median house price divided by median gross annual residence-based
--                       earnings (ONS table 5c). A ratio of 8 means the typical home costs
--                       8 times typical yearly pay of people living in the area.
--   year              = the year of the ratio (house prices to September of that year,
--                       earnings from April of that year).
-- Source: ONS, "House price to residence-based earnings ratio" (released 26 March 2026),
-- Open Government Licence. Written by scripts/import-housing-affordability.js (dry run
-- by default; --write to save). Used in the Housing topic of the area league table.

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.council_housing_affordability (
  council_gss_code  text NOT NULL,
  measure           text NOT NULL CHECK (measure IN ('median')),
  year              smallint NOT NULL,
  ratio             numeric NOT NULL,
  source            text NOT NULL,
  source_url        text NOT NULL,
  published_date    date,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, measure, year)
);

ALTER TABLE public.council_housing_affordability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "council_housing_affordability_anon_read" ON public.council_housing_affordability;
CREATE POLICY "council_housing_affordability_anon_read" ON public.council_housing_affordability FOR SELECT TO anon USING (true);

COMMIT;
