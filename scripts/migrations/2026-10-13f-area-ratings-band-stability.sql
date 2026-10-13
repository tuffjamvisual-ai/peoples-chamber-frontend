-- Area league table: how steady each area's band is.
--
-- The weight test re-scores every area 16 extra ways (each of the 8 topics left out, and
-- each counted double). band_changes = in how many of those versions the area's band
-- differs from its published band. near_band_boundary = true when that happens in half
-- the versions or more, so the page can say the band is close to the edge.
-- Written by scripts/score-areas.js --write, at the same time as the ratings.
-- Null for areas that are not ranked.

\set ON_ERROR_STOP on
BEGIN;

ALTER TABLE public.area_ratings ADD COLUMN IF NOT EXISTS band_changes smallint;
ALTER TABLE public.area_ratings ADD COLUMN IF NOT EXISTS band_versions smallint;
ALTER TABLE public.area_ratings ADD COLUMN IF NOT EXISTS near_band_boundary boolean;

COMMIT;
