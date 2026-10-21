-- PIP mobility awards by council, England and Wales (John's decisions, 21 Oct 2026): people receiving Personal
-- Independence Payment, by mobility award (enhanced, standard, nil), from DWP Stat-Xplore (PIP_Monthly_new, the
-- "Local Authority" level of its residence-based geography). The enhanced rate is what makes someone eligible for a
-- Motability vehicle. Scotland has moved to Adult Disability Payment, so it has no rows; nor does Northern Ireland.
-- County councils are not a Stat-Xplore geography: their rows add up their districts (councils.parent_slug),
-- derived_from_districts = true, with the district codes used. Loaded by scripts/import-pip-mobility.js.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
DO $$ BEGIN
  IF to_regclass('public.council_pip_mobility') IS NOT NULL THEN RAISE EXCEPTION 'council_pip_mobility already exists'; END IF;
END $$;

CREATE TABLE public.council_pip_mobility (
  gss                    text NOT NULL CHECK (gss ~ '^[EW]\d{8}$'),
  period                 date NOT NULL CHECK (extract(day FROM period) = 1),   -- the month, as its first day
  nation                 text NOT NULL CHECK (nation IN ('England', 'Wales')),
  enhanced               integer NOT NULL CHECK (enhanced >= 0),
  standard               integer NOT NULL CHECK (standard >= 0),
  nil                    integer NOT NULL CHECK (nil >= 0),
  derived_from_districts boolean NOT NULL DEFAULT false,
  district_gss           text[],
  source_url             text NOT NULL CHECK (source_url ~ '^https://'),
  fetched_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gss, period),
  CHECK (derived_from_districts = (district_gss IS NOT NULL)),
  CHECK (NOT derived_from_districts OR cardinality(district_gss) > 0)
);
COMMENT ON TABLE public.council_pip_mobility IS
  'PIP cases by mobility award per council (DWP Stat-Xplore PIP_Monthly_new); county rows add up their districts (migration 2026-10-21t)';
ALTER TABLE public.council_pip_mobility ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_pip_mobility_read ON public.council_pip_mobility FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.council_pip_mobility TO anon, authenticated;
COMMIT;
