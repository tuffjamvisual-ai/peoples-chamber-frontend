-- Fuel poverty by council (England): DESNZ "Sub-regional fuel poverty
-- data" (official statistics in development, Open Government Licence v3.0),
-- published once a year (the 2026 release, 14 May 2026, covers 2024).
--
-- Live-verified 2026-10-11 (scripts/discover-fuel-poverty.js):
--   * Table 2 (local authority) covers all 317 English councils, including
--     the 21 county councils with their own rows. Barnsley/Sheffield appear
--     under E08000038/E08000039 and are stored under the councils table's
--     E08000016/E08000019.
--   * Table 4 (LSOA, ~33,750 neighbourhoods of roughly 1,500 people) gives
--     the same measures per small area with its district code.
-- Measure: Low Income Low Energy Efficiency (LILEE): a household is fuel
-- poor if its home has a fuel poverty energy efficiency rating of band D or
-- below and its income after housing costs and required energy costs is
-- below the poverty line (60% of the national median).
-- These are modelled estimates; DESNZ says they should be used for general
-- trends and for identifying areas of particularly high or low fuel
-- poverty, not detailed trends over time. Each year is stored; the council
-- page shows the latest. The England row (E92000001) is stored in
-- council_fuel_poverty too, for comparison.

CREATE TABLE IF NOT EXISTS public.council_fuel_poverty (
  council_gss_code    text NOT NULL,
  data_year           integer NOT NULL,
  households          integer NOT NULL,
  fuel_poor           integer NOT NULL,
  percentage          numeric NOT NULL,
  source_url          text NOT NULL,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, data_year)
);

CREATE TABLE IF NOT EXISTS public.council_fuel_poverty_lsoa (
  lsoa_code           text NOT NULL,
  data_year           integer NOT NULL,
  lsoa_name           text NOT NULL,
  council_gss_code    text NOT NULL,     -- district / unitary / met / London borough
  households          integer NOT NULL,
  fuel_poor           integer NOT NULL,
  percentage          numeric NOT NULL,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lsoa_code, data_year)
);

CREATE INDEX IF NOT EXISTS idx_fuel_poverty_lsoa_council ON public.council_fuel_poverty_lsoa (council_gss_code, data_year);

ALTER TABLE public.council_fuel_poverty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_fuel_poverty_lsoa ENABLE ROW LEVEL SECURITY;

-- Dropped first so this file can be re-run safely.
DROP POLICY IF EXISTS "council_fuel_poverty_anon_read" ON public.council_fuel_poverty;
DROP POLICY IF EXISTS "council_fuel_poverty_lsoa_anon_read" ON public.council_fuel_poverty_lsoa;
CREATE POLICY "council_fuel_poverty_anon_read" ON public.council_fuel_poverty FOR SELECT TO anon USING (true);
CREATE POLICY "council_fuel_poverty_lsoa_anon_read" ON public.council_fuel_poverty_lsoa FOR SELECT TO anon USING (true);
