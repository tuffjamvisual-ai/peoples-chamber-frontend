-- Storm overflows, Stage 2: Scotland (Scottish Water), and area totals rebuilt
-- from every source inside the database.
--
-- 1. sewage_overflows.source may now be 'SW' (Scottish Water).
-- 2. sewage_overflows.volume_m3: total volume discharged in the year (m3). Only
--    Scottish Water's overflows reported to SEPA publish it; null elsewhere.
-- 3. sewage_area_totals_computed: area totals from every overflow in every source.
--    refresh_sewage_area_totals() replaces sewage_area_totals with it in one
--    statement. The import scripts call this after writing instead of writing
--    totals themselves, so two sources in the same area (e.g. an England-return
--    overflow in Scottish Borders) never overwrite each other.
--
-- Sources: Scottish Water, Reported Overflow Event Data to SEPA 2021-2025 & Summary
-- (v2, 05/08/26) and Non-Reported Overflow Event Data 2022-2025 & Summary
-- (31/08/26), both "licensed under the terms of the Open Government Licence"
-- (each workbook's METADATA sheet). Loaded by scripts/import-sewage-scotland.js.

\set ON_ERROR_STOP on
BEGIN;

-- 1. Allow 'SW' as a source (drops the existing check on source, whatever its name).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.sewage_overflows'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%source%'
  LOOP
    EXECUTE format('ALTER TABLE public.sewage_overflows DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.sewage_overflows
  ADD CONSTRAINT sewage_overflows_source_check CHECK (source IN ('EA', 'NIW', 'SW'));

-- 2. Spill volume.
ALTER TABLE public.sewage_overflows ADD COLUMN IF NOT EXISTS volume_m3 numeric;

-- 3. Area totals from every source.
CREATE OR REPLACE VIEW public.sewage_area_totals_computed AS
SELECT 'constituency'::text AS area_type,
       constituency_gss_code AS area_gss_code,
       max(constituency_name) AS area_name,
       year,
       CASE left(constituency_gss_code, 1) WHEN 'E' THEN 'England' WHEN 'W' THEN 'Wales' WHEN 'S' THEN 'Scotland' ELSE 'Northern Ireland' END AS nation,
       count(*)::integer AS overflows,
       count(spill_count)::integer AS overflows_with_data,
       (count(*) FILTER (WHERE spill_count > 0))::integer AS overflows_spilled,
       coalesce(sum(spill_count), 0)::integer AS spill_count,
       round(coalesce(sum(spill_hours), 0), 2) AS spill_hours
FROM public.sewage_overflows
WHERE placement <> 'unplaced' AND constituency_gss_code IS NOT NULL
GROUP BY constituency_gss_code, year
UNION ALL
SELECT 'council'::text,
       council_gss_code,
       max(council_name),
       year,
       CASE left(council_gss_code, 1) WHEN 'E' THEN 'England' WHEN 'W' THEN 'Wales' WHEN 'S' THEN 'Scotland' ELSE 'Northern Ireland' END,
       count(*)::integer,
       count(spill_count)::integer,
       (count(*) FILTER (WHERE spill_count > 0))::integer,
       coalesce(sum(spill_count), 0)::integer,
       round(coalesce(sum(spill_hours), 0), 2)
FROM public.sewage_overflows
WHERE placement <> 'unplaced' AND council_gss_code IS NOT NULL
GROUP BY council_gss_code, year;

REVOKE ALL ON public.sewage_area_totals_computed FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_sewage_area_totals()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.sewage_area_totals WHERE true;
  INSERT INTO public.sewage_area_totals
    (area_type, area_gss_code, area_name, year, nation, overflows, overflows_with_data, overflows_spilled, spill_count, spill_hours, synced_at)
  SELECT area_type, area_gss_code, area_name, year, nation, overflows, overflows_with_data, overflows_spilled, spill_count, spill_hours, now()
  FROM public.sewage_area_totals_computed;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE EXECUTE ON FUNCTION public.refresh_sewage_area_totals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sewage_area_totals() TO service_role;

COMMIT;
