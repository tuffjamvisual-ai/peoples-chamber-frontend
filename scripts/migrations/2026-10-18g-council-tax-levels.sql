-- Council tax levels for each council and year (2026-27 first), loaded by scripts/import-council-tax-levels.js
-- from the government releases:
--   England:  MHCLG "Council Tax levels set by local authorities in England 2026 to 2027", Table 10
--             (Data_Billing for billing councils, Data_Precepting for the 21 county councils)
--   Wales:    Welsh Government "Council Tax levels: April 2026 to March 2027", Tables 1 and 2
--   Scotland: Scottish Government "Council Tax by Band 2026-27" and "Band D Council Tax 1996-97 to 2026-27"
-- Northern Ireland has domestic rates, not council tax, and is not included.
--
-- All amounts are Band D (two adult equivalent) averages in pounds, rounded to pence.
--   council_band_d      the council's own Band D, excluding parish / community council precepts
--                       (Wales: the county council element; Scotland: the council's Band D)
--   council_band_d_prev the same for the previous year (2025-26)
--   asc_band_d          England only: the adult social care precept element of this year's Band D as the
--                       release gives it (lines 11a / 5, this year's ASC increase, e.g. 2% of last year's Band D),
--                       not the ASC accumulated since 2016-17
--   parish_avg_band_d   England: the council's Band D including parishes minus excluding parishes;
--                       Wales: the community council element
--   county_band_d, police_band_d, fire_band_d, ca_band_d, gla_band_d: the major precepts in the area
--   area_band_d         the whole Band D bill for the area (England: line 17; Wales: overall average band D;
--                       Scotland: the council's Band D). Null for English county councils, which have no
--                       single area bill.
--   county_name, police_name, fire_name, ca_name: the precepting bodies (England: Precepting_Bodies sheet;
--                       Wales: police area)

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE public.council_tax_levels (
  council_gss_code    text NOT NULL,
  year                text NOT NULL CHECK (year ~ '^[0-9]{4}-[0-9]{2}$'),
  nation              text NOT NULL CHECK (nation IN ('England', 'Wales', 'Scotland')),
  council_band_d      numeric(10,2) NOT NULL CHECK (council_band_d >= 0),
  council_band_d_prev numeric(10,2) CHECK (council_band_d_prev >= 0),
  asc_band_d          numeric(10,2) CHECK (asc_band_d >= 0),
  parish_avg_band_d   numeric(10,2) CHECK (parish_avg_band_d >= 0),
  county_band_d       numeric(10,2) CHECK (county_band_d >= 0),
  police_band_d       numeric(10,2) CHECK (police_band_d >= 0),
  fire_band_d         numeric(10,2) CHECK (fire_band_d >= 0),
  ca_band_d           numeric(10,2) CHECK (ca_band_d >= 0),
  gla_band_d          numeric(10,2) CHECK (gla_band_d >= 0),
  area_band_d         numeric(10,2) CHECK (area_band_d >= 0),
  county_name         text,
  police_name         text,
  fire_name           text,
  ca_name             text,
  source_url          text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, year)
);

-- Row level security: anyone may read; only the service role (which bypasses RLS) may write.
ALTER TABLE public.council_tax_levels ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_tax_levels FROM anon, authenticated;
GRANT SELECT ON public.council_tax_levels TO anon, authenticated;
CREATE POLICY council_tax_levels_public_read ON public.council_tax_levels FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'council_tax_levels' AND cmd = 'SELECT';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 read policy, found %', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'council_tax_levels' AND cmd <> 'SELECT';
  IF n <> 0 THEN RAISE EXCEPTION 'unexpected write policies: %', n; END IF;
END $$;

COMMIT;
