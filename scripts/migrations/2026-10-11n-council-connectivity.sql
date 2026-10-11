-- Broadband and mobile coverage by council (UK): Ofcom Connected Nations
-- data downloads (Open Government Licence, per Ofcom's "About this data"
-- documents). Ofcom refreshes them several times a year; the spring 2026
-- update (13 May 2026) is January 2026 data.
--
-- Live-verified 2026-10-11 (scripts/discover-broadband.js):
--   * Fixed broadband "laua" files (all premises and residential) and the
--     full-fibre take-up file cover 361 councils: every district, unitary,
--     met borough, London borough, Scottish, Welsh and NI council and Isles
--     of Scilly. Barnsley/Sheffield appear under E08000038/E08000039 and are
--     stored under the councils table's E08000016/E08000019. Counties have
--     no rows; the council page sums their districts from the counts.
--   * Ofcom's percentages are of all premises (e.g. Hartlepool superfast
--     48,369 / 49,075 = 98.6%).
--   * Mobile "laua" file: for each technology, the % of premises (indoor or
--     outdoor) or of land area covered by exactly 0, 1, 2, 3 or 4 of the
--     networks Ofcom lists (EE, O2, Three, Vodafone). Blank cells in a
--     group with other values are 0. prem_count = premises; pixel_count =
--     100m x 100m squares (used to weight land coverage when summing).
-- Speeds: superfast 30 Mbit/s+, ultrafast 100 / 300 Mbit/s+, gigabit-capable
-- 1 Gbit/s; "decent" broadband = 10 Mbit/s download and 1 Mbit/s upload.

CREATE TABLE IF NOT EXISTS public.council_broadband (
  council_gss_code        text NOT NULL,
  data_month              date NOT NULL,     -- e.g. 2026-01-01
  all_premises            integer NOT NULL,
  sfbb_n                  integer,           -- superfast (30 Mbit/s+) available
  ufbb100_n               integer,           -- 100 Mbit/s+ available
  ufbb300_n               integer,           -- 300 Mbit/s+ available
  full_fibre_n            integer,
  gigabit_n               integer,
  unable_10_n             integer,           -- cannot receive 10 Mbit/s
  unable_decent_n         integer,           -- cannot receive decent broadband from fixed or fixed wireless
  res_premises            integer,           -- residential premises
  res_gigabit_n           integer,
  res_full_fibre_n        integer,
  ff_takeup_of_coverage_pct numeric,         -- full-fibre take-up as % of full-fibre coverage
  ff_takeup_of_all_pct    numeric,           -- full-fibre take-up as % of all premises
  source_url              text NOT NULL,
  synced_at               timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, data_month)
);

CREATE TABLE IF NOT EXISTS public.council_mobile_coverage (
  council_gss_code        text NOT NULL,
  data_month              date NOT NULL,
  prem_count              integer,
  pixel_count             integer,
  g4_in_none_pct          numeric,           -- % premises with no indoor 4G from any network
  g4_in_all_pct           numeric,           -- % premises with indoor 4G from all four networks
  g4_out_none_pct         numeric,
  g4_out_all_pct          numeric,
  g4_geo_none_pct         numeric,           -- % of land area with no outdoor 4G
  g4_geo_all_pct          numeric,
  g5_out_none_pct         numeric,           -- 5G outdoor at premises (high confidence)
  g5_out_all_pct          numeric,
  voice_in_none_pct       numeric,           -- indoor voice calls at premises
  voice_in_all_pct        numeric,
  source_url              text NOT NULL,
  synced_at               timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, data_month)
);

ALTER TABLE public.council_broadband ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_mobile_coverage ENABLE ROW LEVEL SECURITY;

-- Dropped first so this file can be re-run safely.
DROP POLICY IF EXISTS "council_broadband_anon_read" ON public.council_broadband;
DROP POLICY IF EXISTS "council_mobile_coverage_anon_read" ON public.council_mobile_coverage;
CREATE POLICY "council_broadband_anon_read" ON public.council_broadband FOR SELECT TO anon USING (true);
CREATE POLICY "council_mobile_coverage_anon_read" ON public.council_mobile_coverage FOR SELECT TO anon USING (true);
