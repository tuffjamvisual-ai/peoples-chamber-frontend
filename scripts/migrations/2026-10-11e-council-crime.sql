-- Recorded crime by council, from each nation's own source.
--
-- Mirrors council_service_spending's approach: each nation's OWN categories
-- are stored verbatim from its source, not forced into one shared taxonomy,
-- because the three sources classify crime differently (verified live
-- 2026-10-11 by scripts/discover-crime-sources*.js).
--
-- England & Wales — source 'police_uk': data.police.uk street-level crime
--   (monthly, rolling 36 months, 14 crime types incl. anti-social
--   behaviour). Each crime carries an LSOA 2021 code; summed to councils
--   with the ONS "LSOA (2021) to Electoral Ward (2025) to LAD (2025)" lookup
--   (all 33,268 LSOA codes in the Aug 2026 month resolved). Crimes with no
--   location code (~1.3% outside Northern Ireland) can't be placed in any
--   council and are excluded. Rows are stored for district/unitary councils
--   only; county council figures are the sum of their districts, computed
--   at display time. Barnsley and Sheffield are stored under the councils
--   table's codes (E08000016 / E08000019), mapped from LAD25 E08000038 /
--   E08000039.
--
-- Northern Ireland — source 'psni': PSNI "Police Recorded Crime Tables"
--   monthly workbook, "Pivot Table-Crime" sheet: monthly counts by policing
--   district (the 11 districts are NI's 11 councils) and crime type, latest
--   24 months. (data.police.uk's NI rows carry no LSOA code, so can't be
--   used.)
--
-- Scotland — source 'scotland_rcs': Scottish Government "Recorded Crime in
--   Scotland" tables, Table_1 (counts) and Table_4 (rates per 10,000
--   population), by local authority, financial years from 2015-16.
--
-- period_type 'month' rows have period_start = first day of the month;
-- 'financial_year' rows have period_start = 1 April of the starting year.
-- crime_category is the source's own label. is_total marks a source's own
-- total row (Scotland "Total crimes", PSNI total if published) so the page
-- uses the official total rather than re-adding categories.

CREATE TABLE IF NOT EXISTS public.council_crime_stats (
  id                 bigserial PRIMARY KEY,
  council_gss_code   text NOT NULL,
  council_name       text NOT NULL,
  nation             text NOT NULL,          -- 'England' | 'Wales' | 'Scotland' | 'Northern Ireland'
  source             text NOT NULL,          -- 'police_uk' | 'psni' | 'scotland_rcs'
  period_type        text NOT NULL,          -- 'month' | 'financial_year'
  period_start       date NOT NULL,
  period_label       text NOT NULL,          -- e.g. '2026-08' or '2024-25'
  crime_category     text NOT NULL,          -- source's own label, verbatim
  is_total           boolean NOT NULL DEFAULT false,
  count              integer NOT NULL,
  rate_per_10k       numeric,                -- official rate where the source publishes one (Scotland)
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS council_crime_stats_uniq
  ON public.council_crime_stats (council_gss_code, source, period_type, period_start, crime_category);

CREATE INDEX IF NOT EXISTS idx_council_crime_stats_gss_period
  ON public.council_crime_stats (council_gss_code, period_start DESC);

-- Read-only public access via the anon key; writes go through the
-- service-role key (import script / GitHub Actions), which bypasses RLS.
ALTER TABLE public.council_crime_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "council_crime_stats_anon_read"
  ON public.council_crime_stats
  FOR SELECT
  TO anon
  USING (true);
