-- House prices by council: HM Land Registry UK House Price Index (UK HPI),
-- monthly "full file" CSV, published under the Open Government Licence v3.0
-- (attribution required: "Contains HM Land Registry data © Crown copyright
-- and database right").
--
-- Live-verified 2026-10-11 by scripts/discover-uk-hpi.js against the
-- July 2026 full file (35 MB, 151,920 rows, 405 area codes):
--   * 381 of the 382 councils have a series: every unitary, district,
--     met borough, London borough, NI council and all 21 county councils
--     (counties have their own E10 codes, so no summing of districts).
--     Barnsley/Sheffield appear under the new codes E08000038/E08000039 and
--     are stored under the councils table's codes E08000016/E08000019.
--     Isles of Scilly (E06000053) is not published (too few sales).
--   * Series start: England & Wales 1995-01, Scotland 2004-01, NI 2005-01.
--   * Latest month: average price, index, 1m and 12m change for all 381.
--     Property type, first-time buyer / former owner occupier and
--     cash / mortgage prices for ~370 (none for NI councils).
--     Sales volume lags: blank for the latest months (April 2026 is the
--     newest with counts in the July 2026 release).
--   * Regions, nations and other aggregates (E11, E12, E13, E92, K02-K04,
--     N92, S92, W92) are not stored.
--
-- Land Registry revises the previous 12 months each release (sales take
-- weeks to months to register), so the daily sync rewrites the latest 13
-- months whenever a new release appears. release_tag is the data month of
-- the full file a row was last written from (e.g. '2026-07').
-- Percentages are stored as published (e.g. 5.5 = 5.5%).

CREATE TABLE IF NOT EXISTS public.council_house_prices (
  council_gss_code        text NOT NULL,
  month                   date NOT NULL,      -- first day of the month
  hpi_area_code           text NOT NULL,      -- code as published (differs for Barnsley/Sheffield)
  average_price           numeric,
  house_price_index       numeric,
  change_1m_pct           numeric,
  change_12m_pct          numeric,
  sales_volume            integer,
  detached_price          numeric,
  detached_12m_pct        numeric,
  semi_detached_price     numeric,
  semi_detached_12m_pct   numeric,
  terraced_price          numeric,
  terraced_12m_pct        numeric,
  flat_price              numeric,
  flat_12m_pct            numeric,
  ftb_price               numeric,            -- first-time buyers
  ftb_12m_pct             numeric,
  foo_price               numeric,            -- former owner occupiers
  foo_12m_pct             numeric,
  cash_price              numeric,
  cash_12m_pct            numeric,
  mortgage_price          numeric,
  mortgage_12m_pct        numeric,
  release_tag             text NOT NULL,
  synced_at               timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, month)
);

CREATE INDEX IF NOT EXISTS idx_council_house_prices_release
  ON public.council_house_prices (release_tag);

ALTER TABLE public.council_house_prices ENABLE ROW LEVEL SECURITY;

-- Dropped first so this file can be re-run safely.
DROP POLICY IF EXISTS "council_house_prices_anon_read" ON public.council_house_prices;
CREATE POLICY "council_house_prices_anon_read"
  ON public.council_house_prices
  FOR SELECT
  TO anon
  USING (true);
