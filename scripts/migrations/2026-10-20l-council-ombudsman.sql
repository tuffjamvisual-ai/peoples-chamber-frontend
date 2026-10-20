-- Local Government and Social Care Ombudsman (LGSCO) complaint statistics by council (owner's approval, 20 Oct 2026):
-- the annual review datasheets "Complaints and Enquiries Received (by Category)", "Complaints and Enquiries Decided
-- (by Outcome)" and "Remedy and compliance outcomes", 2024-25 and 2025-26 (business years, 1 April to 31 March).
-- English councils only, one row per council per year. Loaded by scripts/import-lgsco.js from the files kept in
-- scripts/data/lgsco/ (re-use allowed by www.lgo.org.uk/copyright with acknowledgement).
--
-- Counts are as published. The percentages are LGSCO's own, as published (not recalculated). Per-100,000-resident
-- rates and similar-authority averages are not stored: the site does not show them.
-- Where a cell is text ("No investigations", "None upheld", "no comp outcomes") or blank, the figure is NULL and
-- notes holds it as  column: "text as published"  (several joined by "; "), so the page can show the text itself.
--
--   received_*            complaints and enquiries received, by LGSCO's category, and the total
--   decided_*             decisions by outcome: invalid or incomplete, advice given, referred back for local
--                         resolution, closed after initial enquiries; then not_upheld and upheld (investigated); total
--   uphold_pc             uphold rate (%): upheld as a share of investigations completed
--   satisfactory_remedy_pc  upheld cases where the council gave a satisfactory remedy before the complaint reached
--                         the Ombudsman (%)
--   compliance_cases      cases with a compliance outcome recorded during the year
--   compliance_pc         cases where LGSCO was satisfied the council carried out its recommendations (%)
--   on_time_cases, on_time_pc   compliance outcomes recorded as delivered on time (2025-26 file only)
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.council_ombudsman') IS NOT NULL THEN RAISE EXCEPTION 'council_ombudsman already exists'; END IF;
END $$;

CREATE TABLE public.council_ombudsman (
  gss                          text NOT NULL CHECK (gss ~ '^E\d{8}$'),
  year                         text NOT NULL CHECK (year ~ '^20\d{2}-\d{2}$'),
  received_total               integer CHECK (received_total >= 0),
  received_adult_social_care   integer CHECK (received_adult_social_care >= 0),
  received_benefits_tax        integer CHECK (received_benefits_tax >= 0),
  received_corporate_other     integer CHECK (received_corporate_other >= 0),
  received_education_children  integer CHECK (received_education_children >= 0),
  received_environment         integer CHECK (received_environment >= 0),
  received_highways_transport  integer CHECK (received_highways_transport >= 0),
  received_housing             integer CHECK (received_housing >= 0),
  received_planning            integer CHECK (received_planning >= 0),
  received_other               integer CHECK (received_other >= 0),
  decided_total                integer CHECK (decided_total >= 0),
  decided_invalid_incomplete   integer CHECK (decided_invalid_incomplete >= 0),
  decided_advice_given         integer CHECK (decided_advice_given >= 0),
  decided_referred_back        integer CHECK (decided_referred_back >= 0),
  decided_closed_after_enquiries integer CHECK (decided_closed_after_enquiries >= 0),
  not_upheld                   integer CHECK (not_upheld >= 0),
  upheld                       integer CHECK (upheld >= 0),
  uphold_pc                    numeric(4, 1) CHECK (uphold_pc BETWEEN 0 AND 100),
  satisfactory_remedy_pc       numeric(4, 1) CHECK (satisfactory_remedy_pc BETWEEN 0 AND 100),
  compliance_cases             integer CHECK (compliance_cases >= 0),
  compliance_pc                numeric(4, 1) CHECK (compliance_pc BETWEEN 0 AND 100),
  on_time_cases                integer CHECK (on_time_cases >= 0),
  on_time_pc                   numeric(4, 1) CHECK (on_time_pc BETWEEN 0 AND 100),
  notes                        text,
  source_url                   text NOT NULL CHECK (source_url ~ '^https://www\.lgo\.org\.uk/'),
  imported_at                  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gss, year),
  CHECK (on_time_cases IS NULL OR compliance_cases IS NULL OR on_time_cases <= compliance_cases)
);
COMMENT ON TABLE public.council_ombudsman IS
  'LGSCO complaints received, decided, upheld and remedy/compliance outcomes by English council and business year (migration 2026-10-20l)';

-- Row level security: anyone may read; only the service role (which bypasses RLS) may write.
ALTER TABLE public.council_ombudsman ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_ombudsman FROM anon, authenticated;
GRANT SELECT ON public.council_ombudsman TO anon, authenticated;
CREATE POLICY council_ombudsman_public_read ON public.council_ombudsman FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'council_ombudsman';
  IF n <> 28 THEN RAISE EXCEPTION 'expected 28 columns, found %', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'council_ombudsman';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 policy, found %', n; END IF;
  IF has_table_privilege('anon', 'public.council_ombudsman', 'INSERT') OR has_table_privilege('anon', 'public.council_ombudsman', 'UPDATE')
     OR has_table_privilege('anon', 'public.council_ombudsman', 'DELETE') THEN RAISE EXCEPTION 'anon must only read'; END IF;
  IF NOT has_table_privilege('anon', 'public.council_ombudsman', 'SELECT') THEN RAISE EXCEPTION 'anon must be able to read'; END IF;
END $$;

COMMIT;
