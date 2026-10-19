-- Fly-tipping recorded by councils (John's decisions, 19 Oct 2026), one row per council and financial year:
--   England: Defra, "Fly-tipping incidents and actions reported by local authorities in England" (WasteDataFlow)
--   Wales: Welsh Government, StatsWales "Local authority reported fly-tipping" (WasteDataFlow)
--   County councils (England): the sum of their district councils, summed_from_districts = true
-- Scotland and Northern Ireland publish no official council figures, so they have no rows.
-- Loaded by scripts/import-fly-tipping.js.
--
--   incidents             incidents recorded by the council (NULL where the source gives none, e.g. Fylde 2024/25)
--   incidents_per_1000    incidents per 1,000 people (ONS mid-year estimate for the year's start, as Defra uses)
--   rate_calculated       true where we worked the rate out (Wales, county sums); false where the source gives it
--   actions               enforcement actions of every kind
--   fpns_fly_tipping      fixed penalty notices for fly-tipping (England: issued specifically for fly-tipping;
--                         Wales: the one fixed penalty notice count published, not split by offence)
--   prosecutions          prosecution actions
--   reporting_basis       e.g. 'All incidents', 'Customer/public reported only', 'Reporting basis changed during the year'
--   months_incidents      months of the year the incidents figure covers (12 unless the source says otherwise)
--   months_enforcement    months of the year the enforcement figures cover (e.g. Birmingham 2024/25: 6)
--   summed_from_districts true for a county council's total of its districts
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.council_fly_tipping') IS NOT NULL THEN RAISE EXCEPTION 'council_fly_tipping already exists'; END IF;
END $$;

CREATE TABLE public.council_fly_tipping (
  gss                   text NOT NULL CHECK (gss ~ '^[EW]\d{8}$'),
  year                  text NOT NULL CHECK (year ~ '^\d{4}-\d{2}$'),
  nation                text NOT NULL CHECK (nation IN ('England', 'Wales')),
  incidents             integer CHECK (incidents >= 0),
  incidents_per_1000    numeric CHECK (incidents_per_1000 >= 0),
  rate_calculated       boolean NOT NULL DEFAULT false,
  actions               integer CHECK (actions >= 0),
  fpns_fly_tipping      integer CHECK (fpns_fly_tipping >= 0),
  prosecutions          integer CHECK (prosecutions >= 0),
  reporting_basis       text,
  months_incidents      integer CHECK (months_incidents BETWEEN 1 AND 12),
  months_enforcement    integer CHECK (months_enforcement BETWEEN 1 AND 12),
  summed_from_districts boolean NOT NULL DEFAULT false,
  source_url            text NOT NULL CHECK (source_url ~ '^https://'),
  notes                 text,
  PRIMARY KEY (gss, year),
  CHECK (incidents IS NOT NULL OR incidents_per_1000 IS NULL)
);
COMMENT ON TABLE public.council_fly_tipping IS
  'Fly-tipping incidents and enforcement recorded by councils, England (Defra) and Wales (StatsWales); county rows sum their districts';
COMMENT ON COLUMN public.council_fly_tipping.rate_calculated IS 'True where incidents_per_1000 was worked out from ONS mid-year population, not taken from the source';
COMMENT ON COLUMN public.council_fly_tipping.fpns_fly_tipping IS 'England: FPNs issued specifically for fly-tipping. Wales: the single FPN count published, not split by offence';

-- Row level security: anyone may read; only the service role (which bypasses RLS) may write.
ALTER TABLE public.council_fly_tipping ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_fly_tipping FROM anon, authenticated;
GRANT SELECT ON public.council_fly_tipping TO anon, authenticated;
CREATE POLICY council_fly_tipping_public_read ON public.council_fly_tipping FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'council_fly_tipping';
  IF n <> 15 THEN RAISE EXCEPTION 'expected 15 columns, found %', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'council_fly_tipping';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 policy, found %', n; END IF;
  IF has_table_privilege('anon', 'public.council_fly_tipping', 'INSERT') OR has_table_privilege('anon', 'public.council_fly_tipping', 'UPDATE')
     OR has_table_privilege('anon', 'public.council_fly_tipping', 'DELETE') THEN RAISE EXCEPTION 'anon must only read'; END IF;
  IF NOT has_table_privilege('anon', 'public.council_fly_tipping', 'SELECT') THEN RAISE EXCEPTION 'anon must be able to read'; END IF;
END $$;

COMMIT;
