-- UNDO for 2026-10-28f-drop-neighbours-and-lsoa.sql: recreates both tables as they were (columns, keys, indexes,
-- row level security, read policy and grants), empty. Reload the rows from the CSV backups taken before the drop:
--   \copy public.council_statistical_neighbours FROM '<backup>/council_statistical_neighbours-backup.csv' WITH CSV HEADER
--   \copy public.council_fuel_poverty_lsoa FROM '<backup>/council_fuel_poverty_lsoa-backup.csv' WITH CSV HEADER
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.council_statistical_neighbours (
  council_gss_code   text        NOT NULL,
  neighbour_rank     smallint    NOT NULL CHECK (neighbour_rank >= 1 AND neighbour_rank <= 15),
  neighbour_gss_code text        NOT NULL,
  neighbour_name     text,
  model_date         date        NOT NULL,
  source             text        NOT NULL,
  source_url         text        NOT NULL,
  synced_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT council_statistical_neighbours_pkey PRIMARY KEY (council_gss_code, neighbour_rank)
);
CREATE INDEX council_statistical_neighbours_neighbour_idx ON public.council_statistical_neighbours USING btree (neighbour_gss_code);
ALTER TABLE public.council_statistical_neighbours ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_statistical_neighbours_anon_read ON public.council_statistical_neighbours FOR SELECT TO anon USING (true);
REVOKE ALL ON TABLE public.council_statistical_neighbours FROM anon, authenticated;
GRANT SELECT ON TABLE public.council_statistical_neighbours TO anon, authenticated;
GRANT ALL ON TABLE public.council_statistical_neighbours TO service_role;

CREATE TABLE public.council_fuel_poverty_lsoa (
  lsoa_code        text        NOT NULL,
  data_year        integer     NOT NULL,
  lsoa_name        text        NOT NULL,
  council_gss_code text        NOT NULL,
  households       integer     NOT NULL,
  fuel_poor        integer     NOT NULL,
  percentage       numeric     NOT NULL,
  synced_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT council_fuel_poverty_lsoa_pkey PRIMARY KEY (lsoa_code, data_year)
);
CREATE INDEX idx_fuel_poverty_lsoa_council ON public.council_fuel_poverty_lsoa USING btree (council_gss_code, data_year);
ALTER TABLE public.council_fuel_poverty_lsoa ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_fuel_poverty_lsoa_anon_read ON public.council_fuel_poverty_lsoa FOR SELECT TO anon USING (true);
REVOKE ALL ON TABLE public.council_fuel_poverty_lsoa FROM anon, authenticated;
GRANT SELECT ON TABLE public.council_fuel_poverty_lsoa TO anon, authenticated;
GRANT ALL ON TABLE public.council_fuel_poverty_lsoa TO service_role;
COMMIT;
