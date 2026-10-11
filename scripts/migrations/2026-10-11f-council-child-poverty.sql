-- Children in low income families, by council.
--
-- Source: DWP "Children in Low Income Families: local area statistics,
-- United Kingdom, FYE 2022 to 2025" (Official Statistics, published
-- 26 March 2026, next March 2027), ODS local authority tables:
--   2_AHC_Relative_LA  -> measure 'relative_ahc'  (FYE 2024-2025 only:
--                         local after-housing-costs figures are new and
--                         earlier years aren't reliable, per DWP)
--   7_BHC_Relative_LA  -> measure 'relative_bhc'  (FYE 2022-2025)
--   8_BHC_Absolute_LA  -> measure 'absolute_bhc'  (FYE 2022-2025; stored,
--                         not displayed: its reference year moved to FYE
--                         2025 in this release, so FYE 2025 repeats the
--                         relative figure)
-- Children aged 0-15. Relative low income = below 60% of UK median
-- household income in that year; a family counts only if it claimed Child
-- Benefit and at least one other household benefit (UC, tax credits or
-- Housing Benefit) at some point in the year. DWP: data before FYE 2022
-- isn't comparable with this release.
--
-- Covers all 361 district/unitary/Scottish/Welsh/NI council codes, every
-- one present in the councils table (verified 2026-10-11). The 21 English
-- county councils have no rows of their own; their figures are summed
-- from their districts at display time (child population per district is
-- derived as count / percentage, so the county percentage is properly
-- weighted).
--
-- percentage is stored as a percent (e.g. 27.18), converted from the
-- ODS's fraction (0.2718).

CREATE TABLE IF NOT EXISTS public.council_child_poverty (
  id                bigserial PRIMARY KEY,
  council_gss_code  text NOT NULL,
  council_name      text NOT NULL,
  measure           text NOT NULL,     -- 'relative_ahc' | 'relative_bhc' | 'absolute_bhc'
  fye               integer NOT NULL,  -- financial year ending, e.g. 2025 = April 2024 to March 2025
  children_count    integer NOT NULL,
  percentage        numeric(7,3),
  release_label     text NOT NULL,     -- e.g. 'FYE 2022 to 2025, published 26 March 2026'
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS council_child_poverty_uniq
  ON public.council_child_poverty (council_gss_code, measure, fye);

ALTER TABLE public.council_child_poverty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "council_child_poverty_anon_read"
  ON public.council_child_poverty
  FOR SELECT
  TO anon
  USING (true);
