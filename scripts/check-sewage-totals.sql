-- READ-ONLY: compares the stored area totals (sewage_area_totals) with the totals
-- the database would rebuild from every overflow (sewage_area_totals_computed,
-- migration 2026-10-13a). Run after the migration and before any refresh, to
-- confirm the rebuild gives the same figures the import wrote.
-- Hours may differ by a hundredth or two from rounding order; anything larger is listed.

\set ON_ERROR_STOP on

SELECT 'stored rows' AS what, count(*) FROM public.sewage_area_totals
UNION ALL SELECT 'computed rows', count(*) FROM public.sewage_area_totals_computed;

SELECT 'only in stored' AS side, s.area_type, s.area_gss_code, s.area_name, s.year
FROM public.sewage_area_totals s
LEFT JOIN public.sewage_area_totals_computed c USING (area_type, area_gss_code, year)
WHERE c.area_gss_code IS NULL
UNION ALL
SELECT 'only in computed', c.area_type, c.area_gss_code, c.area_name, c.year
FROM public.sewage_area_totals_computed c
LEFT JOIN public.sewage_area_totals s USING (area_type, area_gss_code, year)
WHERE s.area_gss_code IS NULL;

SELECT s.area_type, s.area_gss_code, s.area_name, s.year,
       s.overflows, c.overflows AS c_overflows,
       s.overflows_with_data, c.overflows_with_data AS c_with_data,
       s.overflows_spilled, c.overflows_spilled AS c_spilled,
       s.spill_count, c.spill_count AS c_spill_count,
       s.spill_hours, c.spill_hours AS c_spill_hours
FROM public.sewage_area_totals s
JOIN public.sewage_area_totals_computed c USING (area_type, area_gss_code, year)
WHERE s.overflows <> c.overflows OR s.overflows_with_data <> c.overflows_with_data
   OR s.overflows_spilled <> c.overflows_spilled OR s.spill_count <> c.spill_count
   OR abs(s.spill_hours - c.spill_hours) > 0.05 OR s.area_name <> c.area_name OR s.nation <> c.nation;
