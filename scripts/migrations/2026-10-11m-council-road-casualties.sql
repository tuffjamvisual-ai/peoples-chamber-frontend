-- Road casualties by council (Great Britain): DfT road safety data table
-- RAS0403 "Reported road collisions and casualties by local authority"
-- (accredited official statistics, Open Government Licence v3.0), published
-- once a year (the 30 July 2026 edition covers 2016 to 2025; next July 2027).
--
-- Live-verified 2026-10-11 (scripts/discover-road-casualties.js):
--   * Figures are by highway authority: all 207 county, unitary,
--     metropolitan, London borough, Scottish and Welsh councils and the
--     Isles of Scilly. District councils are not highway authorities.
--     Barnsley/Sheffield appear under E08000038/E08000039 and are stored
--     under the councils table's E08000016/E08000019.
--   * Sheet "Casualties" (all roads): Killed, KSI (unadjusted), KSI
--     (adjusted), All casualties, as counts and as rates per billion motor
--     vehicle miles. KSI = killed or seriously injured. The adjusted series
--     corrects for police forces moving to injury-based severity reporting
--     (CRASH), which records more injuries as serious, so years can be
--     compared. DfT flags data collection issues for 2022 and 2023.
--   * Sheet "Road_user_type" (all roads): Killed and KSI (unadjusted) by
--     road user type.
--   * The workbook page also lists an older 2023 edition (ras0403_new.ods);
--     the import picks the edition with the latest first-published date.
-- Counts are stored as published (adjusted KSI figures are estimates and
-- not whole numbers).

CREATE TABLE IF NOT EXISTS public.council_road_casualties (
  council_gss_code    text NOT NULL,
  year                integer NOT NULL,
  measure             text NOT NULL,     -- 'killed' | 'ksi_unadjusted' | 'ksi_adjusted' | 'all'
  casualties          numeric,
  rate_per_bn_miles   numeric,           -- per billion motor vehicle miles
  release_label       text NOT NULL,     -- e.g. 'RAS0403, first published 30 July 2026'
  source_url          text NOT NULL,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, year, measure)
);

CREATE TABLE IF NOT EXISTS public.council_road_casualties_users (
  council_gss_code    text NOT NULL,
  year                integer NOT NULL,
  road_user           text NOT NULL,     -- e.g. 'Pedestrian', 'Pedal Cyclist'
  measure             text NOT NULL,     -- 'killed' | 'ksi_unadjusted'
  casualties          numeric,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, year, road_user, measure)
);

ALTER TABLE public.council_road_casualties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_road_casualties_users ENABLE ROW LEVEL SECURITY;

-- Dropped first so this file can be re-run safely.
DROP POLICY IF EXISTS "council_road_casualties_anon_read" ON public.council_road_casualties;
DROP POLICY IF EXISTS "council_road_casualties_users_anon_read" ON public.council_road_casualties_users;
CREATE POLICY "council_road_casualties_anon_read" ON public.council_road_casualties FOR SELECT TO anon USING (true);
CREATE POLICY "council_road_casualties_users_anon_read" ON public.council_road_casualties_users FOR SELECT TO anon USING (true);
