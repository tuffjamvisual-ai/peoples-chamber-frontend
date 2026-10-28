-- Remove statistical neighbours and small area (LSOA) fuel poverty data (owner's decision, 28 Oct 2026: "remove
-- statistical neighbours from all data, no need to compare to nearby councils"; clarified the same day to cover
-- neighbourhood tables on council pages). The site stopped reading both tables in the commit that adds this file,
-- and /api/sync-fuel-poverty no longer loads LSOA rows. Run only after that deploy is live.
--   council_statistical_neighbours: 4,755 rows (MHCLG model, 1 July 2026), from scripts/import-statistical-neighbours.js
--   council_fuel_poverty_lsoa:      33,755 rows (DESNZ sub-regional fuel poverty, Table 4)
-- Both were backed up to CSV first. Nothing else depends on them (no foreign keys, views, functions or triggers;
-- checked 28 Oct 2026). Undo: 2026-10-28f-UNDO.sql recreates both, then reload from the CSV backups.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE public.council_statistical_neighbours;
DROP TABLE public.council_fuel_poverty_lsoa;
COMMIT;
