-- EHC plan timeliness by council (owner's approval, 20 Oct 2026): DfE's "Timeliness of new education, health and
-- care plans" (Education, health and care plans, 2026 release; data set 90d7c9d3-d811-46f1-ae61-39ea674d4654),
-- calendar years 2023 to 2025, "All EHC plans" breakdown only, excluding exceptions (the cases where the law allows
-- longer than 20 weeks). One row per education authority per year. Loaded by scripts/import-ehcp.js.
--
--   gss                    our council's GSS code (councils.gss_code). DfE files Buckinghamshire, North Yorkshire and
--                          Somerset under their old county codes; those are matched by name (see notes)
--   year                   calendar year the plans were issued
--   plans_issued_ex        new EHC plans issued, excluding exceptions
--   within_20_weeks_ex     of those, issued within the statutory 20 weeks
--   pc_within_20_weeks_ex  DfE's own percentage, as published (not recalculated)
--   over_1_year_ex         plans that took over a year (52 weeks)
--   avg_weeks_ex           DfE's average weeks to issue a plan
--   NULL where DfE's file shows "x" (not available); notes says so
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.council_ehcp') IS NOT NULL THEN RAISE EXCEPTION 'council_ehcp already exists'; END IF;
END $$;

CREATE TABLE public.council_ehcp (
  gss                   text NOT NULL CHECK (gss ~ '^E\d{8}$'),
  year                  smallint NOT NULL CHECK (year BETWEEN 2019 AND 2100),
  plans_issued_ex       integer CHECK (plans_issued_ex >= 0),
  within_20_weeks_ex    integer CHECK (within_20_weeks_ex >= 0),
  pc_within_20_weeks_ex numeric(4, 1) CHECK (pc_within_20_weeks_ex BETWEEN 0 AND 100),
  over_1_year_ex        integer CHECK (over_1_year_ex >= 0),
  avg_weeks_ex          numeric(5, 1) CHECK (avg_weeks_ex >= 0),
  source_url            text NOT NULL CHECK (source_url ~ '^https://explore-education-statistics\.service\.gov\.uk/'),
  notes                 text,
  imported_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gss, year),
  CHECK (within_20_weeks_ex IS NULL OR plans_issued_ex IS NULL OR within_20_weeks_ex <= plans_issued_ex),
  CHECK (over_1_year_ex IS NULL OR plans_issued_ex IS NULL OR over_1_year_ex <= plans_issued_ex)
);
COMMENT ON TABLE public.council_ehcp IS
  'DfE EHC plan timeliness by education authority and calendar year, excluding exceptions (migration 2026-10-20e)';

-- Row level security: anyone may read; only the service role (which bypasses RLS) may write.
ALTER TABLE public.council_ehcp ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_ehcp FROM anon, authenticated;
GRANT SELECT ON public.council_ehcp TO anon, authenticated;
CREATE POLICY council_ehcp_public_read ON public.council_ehcp FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'council_ehcp';
  IF n <> 10 THEN RAISE EXCEPTION 'expected 10 columns, found %', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'council_ehcp';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 policy, found %', n; END IF;
  IF has_table_privilege('anon', 'public.council_ehcp', 'INSERT') OR has_table_privilege('anon', 'public.council_ehcp', 'UPDATE')
     OR has_table_privilege('anon', 'public.council_ehcp', 'DELETE') THEN RAISE EXCEPTION 'anon must only read'; END IF;
  IF NOT has_table_privilege('anon', 'public.council_ehcp', 'SELECT') THEN RAISE EXCEPTION 'anon must be able to read'; END IF;
END $$;

COMMIT;
