-- Area league table (England) and Statistical Neighbours.
--
-- area_ratings: one row per English local authority district area (the current rating).
--   Written by scripts/score-areas.js --write (dry run by default).
--   Area rating = how the AREA compares (place quality), not a judgement of the council.
--     Each measure is scored 0 (worst) to 100 (best) against all areas, ties share a
--     score; a topic score is the average of its measures; the area score is the average
--     of the eight topic scores. An area needs at least 6 of the 8 topics to be ranked.
--     Band 1 to 5 = which fifth of ranked areas it falls in (1 = top fifth).
--   Services score = the council services for the area (county and district): schools
--     quality, children's services, recycling and planning (major and non-major averaged
--     so planning counts once). Needs at least 3 of the 4 parts. Own rank and band.
--   City of London and the Isles of Scilly are scored but not ranked (too small to compare
--     fairly); excluded_reason says why.
--
-- council_statistical_neighbours: each English council's 15 most similar councils, from
--   MHCLG's Statistical Neighbours model (1 July 2026, Open Government Licence).
--   Written by scripts/import-statistical-neighbours.js --write (dry run by default).

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.area_ratings (
  area_gss_code      text PRIMARY KEY,
  area_name          text NOT NULL,
  area_score         numeric,          -- 0 to 100
  area_rank          integer,          -- 1 = best; null when not ranked
  area_band          smallint CHECK (area_band BETWEEN 1 AND 5),
  areas_ranked       integer,          -- how many areas were ranked (the "out of" figure)
  topics_used        smallint NOT NULL,
  topic_scores       jsonb NOT NULL,   -- { "Safety": 62.1, ... }
  measures           jsonb NOT NULL,   -- { "crime": { "label", "period", "value", "score", "better" }, ... }
  services_score     numeric,
  services_rank      integer,
  services_band      smallint CHECK (services_band BETWEEN 1 AND 5),
  services_ranked    integer,
  services_parts     smallint NOT NULL,
  services_detail    jsonb NOT NULL,   -- { "schools_quality": 71.2, "planning": 55.0, ... }
  excluded_reason    text,             -- why an area is listed separately, if it is
  method_version     text NOT NULL,
  scored_at          timestamptz NOT NULL DEFAULT now(),
  synced_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.council_statistical_neighbours (
  council_gss_code    text NOT NULL,
  neighbour_rank      smallint NOT NULL CHECK (neighbour_rank BETWEEN 1 AND 15),  -- 1 = most similar
  neighbour_gss_code  text NOT NULL,
  neighbour_name      text,
  model_date          date NOT NULL,
  source              text NOT NULL,
  source_url          text NOT NULL,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, neighbour_rank)
);
CREATE INDEX IF NOT EXISTS council_statistical_neighbours_neighbour_idx ON public.council_statistical_neighbours (neighbour_gss_code);

ALTER TABLE public.area_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_statistical_neighbours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "area_ratings_anon_read" ON public.area_ratings;
DROP POLICY IF EXISTS "council_statistical_neighbours_anon_read" ON public.council_statistical_neighbours;
CREATE POLICY "area_ratings_anon_read" ON public.area_ratings FOR SELECT TO anon USING (true);
CREATE POLICY "council_statistical_neighbours_anon_read" ON public.council_statistical_neighbours FOR SELECT TO anon USING (true);

COMMIT;
