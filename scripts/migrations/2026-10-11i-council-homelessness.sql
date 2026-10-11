-- Homelessness by council (England): MHCLG "Statutory homelessness:
-- detailed local authority level tables", quarterly, accredited official
-- statistics under the Open Government Licence v3.0. Files are listed on
-- GOV.UK's "Live tables on homelessness" page and read via the GOV.UK
-- Content API.
--
-- Live-verified 2026-10-11 (scripts/discover-homelessness*.js):
--   * Quarterly files from April to June 2019 onwards (Homelessness
--     Reduction Act data). Earlier files use the old P1E system and have
--     none of these tables.
--   * The newest files (Oct-Dec 2025, Jan-Mar 2026) cover all 296 English
--     district/unitary/met/London councils. County councils have no rows
--     of their own; the council page sums their districts.
--   * Barnsley/Sheffield appear under E08000038/E08000039 in some tables
--     and are stored under the councils table's E08000016/E08000019.
--     Districts since abolished (28 codes: Buckinghamshire 2020,
--     Northamptonshire 2021, Cumbria, North Yorkshire and Somerset 2023)
--     have no council page and are not stored; their successor councils'
--     figures start when they were created.
--   * Table A1 (initial assessments in the quarter) and TA1 (households in
--     temporary accommodation at the end of the quarter). Older files use
--     stacked headings but fixed data positions; the newest use one-row
--     headings. Every file is checked on its England row (duty types add up
--     to the duty total; accommodation types add up to the TA total)
--     before anything is written.
--   * MHCLG marks missing figures [x] (not submitted / data quality),
--     suppressed [c] (to protect households) and not applicable [z];
--     older files use '..' and '-'. All are stored as NULL, never zero.

CREATE TABLE IF NOT EXISTS public.council_homelessness (
  council_gss_code              text NOT NULL,
  period_start                  date NOT NULL,      -- first day of the quarter
  period_label                  text NOT NULL,      -- e.g. 'January to March 2026'
  -- A1: initial assessments of households in the quarter
  assessments_total             integer,
  owed_duty_total               integer,            -- prevention + relief
  owed_prevention               integer,            -- threatened with homelessness within 56 days
  owed_prevention_s21           integer,            -- of which: section 21 notice
  owed_relief                   integer,            -- already homeless
  households_thousands          numeric,            -- households in the area (thousands)
  -- TA1: households in temporary accommodation at the end of the quarter
  ta_total                      integer,
  ta_with_children              integer,
  ta_children                   integer,
  ta_bb                         integer,
  ta_bb_children                integer,
  ta_nightly_paid               integer,
  ta_nightly_paid_children      integer,
  ta_hostels                    integer,
  ta_hostels_children           integer,
  ta_private_sector             integer,
  ta_private_sector_children    integer,
  ta_la_ha_stock                integer,
  ta_la_ha_stock_children       integer,
  ta_other                      integer,
  ta_other_children             integer,
  ta_in_another_la              integer,
  ta_no_accommodation_secured   integer,
  -- provenance
  release_status                text NOT NULL,      -- 'provisional' | 'revised' | 'published'
  source_title                  text NOT NULL,
  source_url                    text NOT NULL,
  synced_at                     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, period_start)
);

CREATE INDEX IF NOT EXISTS idx_council_homelessness_period
  ON public.council_homelessness (period_start);

ALTER TABLE public.council_homelessness ENABLE ROW LEVEL SECURITY;

-- Dropped first so this file can be re-run safely.
DROP POLICY IF EXISTS "council_homelessness_anon_read" ON public.council_homelessness;
CREATE POLICY "council_homelessness_anon_read"
  ON public.council_homelessness
  FOR SELECT
  TO anon
  USING (true);
