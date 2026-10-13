-- Storm overflow (sewage spill) data, Stage 1: England and Northern Ireland.
--
-- Sources (live-verified 2026-10-12, scripts/discover-sewage.js and
-- scripts/discover-sewage-geo.js):
--   * Environment Agency, "Event Duration Monitoring - Storm Overflows - Annual
--     Returns" (Open Government Licence). 2025 return: 14,303 English storm
--     overflows, one row per overflow, keyed by the EA "Unique ID" (permit
--     references are shared by several overflows, so they are not a key).
--     Located from the "Outlet Discharge NGR" grid reference.
--   * NI Water, Event Duration Monitor data workbook (August 2026): 501
--     overflows keyed by CARID, with constituency and council named by NI Water,
--     spill counts and hours for 2023, 2024 and 2025.
--   * Constituency and council placement for England: ONS Open Geography
--     boundaries (Westminster Parliamentary Constituencies July 2024, Local
--     Authority Districts May 2026), Open Government Licence.
--
-- Wales and Scotland are not included yet (Wales awaits Rivers Trust
-- permission; Scotland needs a manual refresh source).
--
-- Written by scripts/import-sewage.js (dry run by default; --write to save).

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.sewage_overflows (
  source                 text NOT NULL CHECK (source IN ('EA', 'NIW')),
  site_id                text NOT NULL,      -- EA Unique ID (e.g. AWS00009) or NI Water CARID
  year                   smallint NOT NULL,  -- calendar year the figures cover
  company                text NOT NULL,
  site_name              text,
  site_name_operator     text,               -- company's own operational name, when given
  permit_ref             text,
  asset_type             text,
  receiving_water        text,
  ngr                    text,               -- grid reference as published
  easting                integer,
  northing               integer,
  latitude               numeric,            -- WGS84, converted from the grid reference
  longitude              numeric,
  constituency_gss_code  text,
  constituency_name      text,
  council_gss_code       text,               -- as stored in public.councils.gss_code
  council_name           text,
  -- how the constituency and council were found:
  --   inside   = point lies inside the ONS boundary (coastline-clipped)
  --   tidal    = point lies below the high-tide line, inside the ONS
  --              extent-of-the-realm boundary
  --   nearest  = nearest ONS boundary within 15 km (long sea outfalls); a few
  --              are placed by the works' own location (listed in the import)
  --   source   = named by the data publisher (NI Water)
  --   unplaced = could not be placed (listed in the import report)
  placement              text NOT NULL CHECK (placement IN ('inside', 'tidal', 'nearest', 'source', 'unplaced')),
  placement_distance_m   integer,            -- only for 'nearest'
  spill_count            integer,            -- EA: counted spills (12-24h count method)
  spill_hours            numeric,            -- total duration of all spills, hours
  monitoring_pct         numeric,            -- % of the year the monitor was working
  source_url             text NOT NULL,
  synced_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, site_id, year)
);

CREATE INDEX IF NOT EXISTS sewage_overflows_constituency_idx ON public.sewage_overflows (constituency_gss_code, year);
CREATE INDEX IF NOT EXISTS sewage_overflows_council_idx ON public.sewage_overflows (council_gss_code, year);

CREATE TABLE IF NOT EXISTS public.sewage_area_totals (
  area_type              text NOT NULL CHECK (area_type IN ('constituency', 'council')),
  area_gss_code          text NOT NULL,
  area_name              text NOT NULL,
  year                   smallint NOT NULL,
  nation                 text NOT NULL CHECK (nation IN ('England', 'Wales', 'Scotland', 'Northern Ireland')),
  overflows              integer NOT NULL,   -- overflows placed in the area
  overflows_with_data    integer NOT NULL,   -- overflows with a reported spill count
  overflows_spilled      integer NOT NULL,   -- overflows with at least one counted spill
  spill_count            integer NOT NULL,
  spill_hours            numeric NOT NULL,
  synced_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (area_type, area_gss_code, year)
);

ALTER TABLE public.sewage_overflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sewage_area_totals ENABLE ROW LEVEL SECURITY;

-- Dropped first so this file can be re-run safely. Public read only; the
-- import writes with the service role key, which bypasses row level security.
DROP POLICY IF EXISTS "sewage_overflows_anon_read" ON public.sewage_overflows;
DROP POLICY IF EXISTS "sewage_area_totals_anon_read" ON public.sewage_area_totals;
CREATE POLICY "sewage_overflows_anon_read" ON public.sewage_overflows FOR SELECT TO anon USING (true);
CREATE POLICY "sewage_area_totals_anon_read" ON public.sewage_area_totals FOR SELECT TO anon USING (true);

COMMIT;
