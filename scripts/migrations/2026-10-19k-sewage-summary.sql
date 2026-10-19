-- sewage summaries for /sewage, so the page reads ~1,400 summary rows instead of every overflow
-- (16,359 rows in 17 requests for 2025). Filled from sewage_overflows by refresh_sewage_summary(), which the sewage
-- importers call after refresh_sewage_area_totals(). Public read only.
--   sewage_company_area_totals: one row per year, source, water company and area (area_type 'nation' with
--     area_gss_code '' for the company's national figures; 'council' and 'constituency' as the overflow is placed).
--     Counties are worked out on the page from their districts' council rows, as now.
--   sewage_source_stats: one row per year and source: national figures and the notes' counts and site names.
\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE public.sewage_company_area_totals (
  year                integer NOT NULL,
  source              text    NOT NULL CHECK (source IN ('EA', 'NIW', 'SW')),
  company             text    NOT NULL,
  area_type           text    NOT NULL CHECK (area_type IN ('nation', 'council', 'constituency')),
  area_gss_code       text    NOT NULL,          -- '' for area_type 'nation'
  overflows           integer NOT NULL,
  overflows_with_data integer NOT NULL,
  overflows_spilled   integer NOT NULL,
  spill_count         integer NOT NULL,
  spill_hours         numeric NOT NULL,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (year, source, company, area_type, area_gss_code)
);

CREATE TABLE public.sewage_source_stats (
  year                integer NOT NULL,
  source              text    NOT NULL CHECK (source IN ('EA', 'NIW', 'SW')),
  overflows           integer NOT NULL,
  overflows_with_data integer NOT NULL,
  spill_count         integer NOT NULL,
  spill_hours         numeric NOT NULL,
  tidal               integer NOT NULL,          -- outlets below the high-tide line
  nearest             integer NOT NULL,          -- offshore outlets counted with the nearest area within 15 km
  unplaced_sites      text[]  NOT NULL,          -- site names (or ids) of overflows with no valid grid reference
  sites_in_scotland   text[]  NOT NULL,          -- England-return overflows over the border in Scotland
  overflows_in_wales  integer NOT NULL,          -- England-return overflows in Wales
  volume_m3           numeric,                   -- Scottish Water (SEPA-reported) only
  volume_overflows    integer NOT NULL,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (year, source)
);

ALTER TABLE public.sewage_company_area_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sewage_source_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sewage_company_area_totals, public.sewage_source_stats FROM anon, authenticated;
GRANT SELECT ON public.sewage_company_area_totals, public.sewage_source_stats TO anon, authenticated;
CREATE POLICY sewage_company_area_totals_public_read ON public.sewage_company_area_totals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sewage_source_stats_public_read ON public.sewage_source_stats FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.refresh_sewage_summary()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE n integer; m integer;
BEGIN
  DELETE FROM public.sewage_company_area_totals WHERE true;
  INSERT INTO public.sewage_company_area_totals
    (year, source, company, area_type, area_gss_code, overflows, overflows_with_data, overflows_spilled, spill_count, spill_hours)
  SELECT year, source, company, area_type, code,
         count(*)::integer, count(spill_count)::integer, (count(*) FILTER (WHERE spill_count > 0))::integer,
         coalesce(sum(spill_count), 0)::integer, round(coalesce(sum(spill_hours), 0), 2)
  FROM (
    SELECT year, source, company, 'nation'::text AS area_type, ''::text AS code, spill_count, spill_hours FROM public.sewage_overflows
    UNION ALL
    SELECT year, source, company, 'council', council_gss_code, spill_count, spill_hours FROM public.sewage_overflows WHERE council_gss_code IS NOT NULL
    UNION ALL
    SELECT year, source, company, 'constituency', constituency_gss_code, spill_count, spill_hours FROM public.sewage_overflows WHERE constituency_gss_code IS NOT NULL
  ) x
  GROUP BY year, source, company, area_type, code;
  GET DIAGNOSTICS n = ROW_COUNT;

  DELETE FROM public.sewage_source_stats WHERE true;
  INSERT INTO public.sewage_source_stats
    (year, source, overflows, overflows_with_data, spill_count, spill_hours, tidal, nearest, unplaced_sites, sites_in_scotland,
     overflows_in_wales, volume_m3, volume_overflows)
  SELECT year, source, count(*)::integer, count(spill_count)::integer, coalesce(sum(spill_count), 0)::integer,
         round(coalesce(sum(spill_hours), 0), 2),
         (count(*) FILTER (WHERE placement = 'tidal'))::integer, (count(*) FILTER (WHERE placement = 'nearest'))::integer,
         coalesce(array_agg(coalesce(site_name, site_id) ORDER BY site_id) FILTER (WHERE placement = 'unplaced'), '{}'),
         coalesce(array_agg(coalesce(site_name, site_id) ORDER BY site_id) FILTER (WHERE source = 'EA' AND council_gss_code LIKE 'S%'), '{}'),
         (count(*) FILTER (WHERE source = 'EA' AND council_gss_code LIKE 'W%'))::integer,
         sum(volume_m3), count(volume_m3)::integer
  FROM public.sewage_overflows
  GROUP BY year, source;
  GET DIAGNOSTICS m = ROW_COUNT;
  RETURN n + m;
END $$;

REVOKE EXECUTE ON FUNCTION public.refresh_sewage_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sewage_summary() TO service_role;

SELECT public.refresh_sewage_summary() AS rows_written;

DO $$
DECLARE a numeric; b numeric;
BEGIN
  -- the summaries must add up to the overflows, source by source and year by year
  SELECT sum(spill_hours) INTO a FROM public.sewage_company_area_totals WHERE area_type = 'nation';
  SELECT round(coalesce(sum(spill_hours), 0), 2) INTO b FROM public.sewage_overflows;
  IF abs(a - b) > 0.5 THEN RAISE EXCEPTION 'company nation totals % differ from overflows %', a, b; END IF;
  SELECT sum(overflows) INTO a FROM public.sewage_source_stats;
  SELECT count(*) INTO b FROM public.sewage_overflows;
  IF a <> b THEN RAISE EXCEPTION 'source stats count % differs from overflows %', a, b; END IF;
END $$;

COMMIT;
