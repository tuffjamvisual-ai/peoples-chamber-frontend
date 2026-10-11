-- Claimant Count by council: ONS, via Nomis dataset NM_162_1 ("Claimant
-- count by sex and age"), monthly, Open Government Licence v3.0
-- (attribution: "Source: Office for National Statistics").
--
-- Live-verified 2026-10-11 (scripts/discover-claimant-count.js):
--   * Nomis geography TYPE424 (local authorities: district / unitary, as of
--     April 2023) covers 361 councils: every district, unitary, met
--     borough, London borough, NI council and Isles of Scilly. TYPE423
--     (county / unitary) adds the 21 county councils with their own
--     figures. Together: all 382 councils, no summing needed.
--   * Nomis publishes every past month on these boundaries, so councils
--     created by mergers have a full back series. History starts January
--     1986 for 371 councils (the other 11 from January 2013); the share of
--     residents aged 16-64 starts in 1992. Before 2013 the count is
--     Unemployment Benefit / Jobseeker's Allowance claimants only; from
--     2013 it also includes Universal Credit claimants required to look
--     for work, so the page marks 2013 on the chart.
--   * The latest month matches ONS table CC01 (August 2026: Hartlepool
--     2,630 people, 4.4%).
--   * Free; guest requests are capped at 25,000 cells, so history is fetched
--     6 months at a time.
--
-- The Claimant Count is people claiming Jobseeker's Allowance plus
-- Universal Credit claimants required to look for work. rate_* is
-- claimants as a percentage of residents aged 16-64 (Nomis measure 2), as
-- published. The latest month can be revised, so the daily sync rewrites
-- the latest 3 months.

CREATE TABLE IF NOT EXISTS public.council_claimant_count (
  council_gss_code   text NOT NULL,
  month              date NOT NULL,     -- first day of the month
  claimants          integer,
  claimants_men      integer,
  claimants_women    integer,
  rate               numeric,           -- % of residents aged 16-64
  rate_men           numeric,
  rate_women         numeric,
  synced_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, month)
);

CREATE INDEX IF NOT EXISTS idx_council_claimant_count_month
  ON public.council_claimant_count (month);

ALTER TABLE public.council_claimant_count ENABLE ROW LEVEL SECURITY;

-- Dropped first so this file can be re-run safely.
DROP POLICY IF EXISTS "council_claimant_count_anon_read" ON public.council_claimant_count;
CREATE POLICY "council_claimant_count_anon_read"
  ON public.council_claimant_count
  FOR SELECT
  TO anon
  USING (true);
