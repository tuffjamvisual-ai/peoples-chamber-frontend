-- Major projects (owner's approval, 20 Oct 2026): one row per project per annual report in the Government Major Projects
-- Portfolio data that the IPA (March 2024) and NISTA (March 2025, March 2026) publish on GOV.UK.
-- Loaded by scripts/import-major-projects.js.
--
--   project_key        the file's project ID (e.g. DFT_0141_2223-Q1), stable across years; where a row has no ID
--                      (2 rows in March 2026), 'no-id:<department code>:<name in lower case, hyphenated>'
--   project_id         the ID as published; NULL where the file leaves it blank
--   report_year        2024 | 2025 | 2026: the year of the "data as at March" snapshot
--   data_as_at         'March 2024' etc., as the reports say ("using data as at March 2024")
--   department_code    as published (case kept: 'DfT', 'MoD' in 2025)
--   dept_slug          our department page (/departments/<slug>) whose Major projects tab shows the row; HMRC and
--                      VOA rows go on the Treasury tab (owner's decision); NULL for HMLR, ONS, NCA and the former
--                      DSIT projects, which are on /transparency/major-projects only
--   rating             'RED' | 'AMBER' | 'GREEN', from whichever assessment column holds one
--   rating_column      'IPA' | 'SRO': the column it came from (the files fill one; the other is blank or
--                      "Not Applicable")
--   rating_withheld    the file's wording where no rating is given (an exemption, "still at the planning stage")
--   whole_life_cost_m  £ million, a single figure only; NULL for ranges and withheld values
--   cost_text          the file's text where the cost is not a single figure (a Low/Mid/High range, an exemption)
--   price_basis        'real 2024/25' (March 2026, as the column headers say) | 'not stated' (March 2024, 2025)
--   start_date/end_date  a single date only; start_text/end_text keep the file's text otherwise (ranges, exemptions)
--   cost_narrative, schedule_narrative, rating_narrative   the department's commentary, as published
--   source_url         the CSV the row was read from
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.major_projects') IS NOT NULL THEN RAISE EXCEPTION 'major_projects already exists'; END IF;
END $$;

CREATE TABLE public.major_projects (
  project_key        text NOT NULL CHECK (project_key ~ '^([A-Za-z]+_\d{4}_\d{4}-Q[1-4]|no-id:[A-Z]+:[a-z0-9-]+)$'),
  project_id         text CHECK (project_id ~ '^[A-Za-z]+_\d{4}_\d{4}-Q[1-4]$'),
  report_year        smallint NOT NULL CHECK (report_year BETWEEN 2024 AND 2100),
  data_as_at         text NOT NULL CHECK (data_as_at ~ '^March \d{4}$'),
  name               text NOT NULL,
  department_code    text NOT NULL,
  dept_slug          text CHECK (dept_slug ~ '^[a-z0-9-]+$'),
  rating             text CHECK (rating IN ('RED', 'AMBER', 'GREEN')),
  rating_column      text CHECK (rating_column IN ('IPA', 'SRO')),
  rating_withheld    text,
  whole_life_cost_m  numeric(12, 2),
  cost_text          text,
  price_basis        text NOT NULL CHECK (price_basis IN ('real 2024/25', 'not stated')),
  start_date         date,
  start_text         text,
  end_date           date,
  end_text           text,
  cost_narrative     text,
  schedule_narrative text,
  rating_narrative   text,
  source_url         text NOT NULL CHECK (source_url ~ '^https://assets\.publishing\.service\.gov\.uk/'),
  imported_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_key, report_year),
  CHECK ((project_id IS NULL) = (project_key LIKE 'no-id:%')),
  CHECK ((rating IS NULL) = (rating_column IS NULL)),
  CHECK (rating IS NULL OR rating_withheld IS NULL),
  CHECK (whole_life_cost_m IS NULL OR cost_text IS NULL),
  CHECK (start_date IS NULL OR start_text IS NULL),
  CHECK (end_date IS NULL OR end_text IS NULL)
);
CREATE INDEX major_projects_dept_slug_idx ON public.major_projects (dept_slug);
COMMENT ON TABLE public.major_projects IS
  'Government Major Projects Portfolio, one row per project per annual report (IPA March 2024; NISTA March 2025, March 2026), as published (migration 2026-10-20d)';

-- Row level security: anyone may read; only the service role (which bypasses RLS) may write.
ALTER TABLE public.major_projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.major_projects FROM anon, authenticated;
GRANT SELECT ON public.major_projects TO anon, authenticated;
CREATE POLICY major_projects_public_read ON public.major_projects FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'major_projects';
  IF n <> 22 THEN RAISE EXCEPTION 'expected 22 columns, found %', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'major_projects';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 policy, found %', n; END IF;
  IF has_table_privilege('anon', 'public.major_projects', 'INSERT') OR has_table_privilege('anon', 'public.major_projects', 'UPDATE')
     OR has_table_privilege('anon', 'public.major_projects', 'DELETE') THEN RAISE EXCEPTION 'anon must only read'; END IF;
  IF NOT has_table_privilege('anon', 'public.major_projects', 'SELECT') THEN RAISE EXCEPTION 'anon must be able to read'; END IF;
END $$;

COMMIT;
