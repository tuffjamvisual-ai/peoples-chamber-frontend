-- Freedom of Information statistics and ministers' meetings publication dates (owner's approval, 20 Oct 2026).
--
-- 1. foi_statistics: Cabinet Office "Freedom of Information statistics" published data (accredited official
--    statistics), the whole series in the April to June 2026 release's CSV (foi-statistics-q2-2026-published-data.csv):
--    quarters Q1 2010 to Q2 2026 and calendar years 2010 to 2025, one row per body per period. Loaded by
--    scripts/import-foi-statistics.js. Counts as published; the percentages are the Cabinet Office's own, unrounded,
--    as published. A cell published as "-" (or blank) is NULL. Internal reviews and ICO complaints are published for
--    calendar years only ("-" in every quarter).
--      received            Total requests received
--      received_ex         Total requests received (excluding on-hold and lapsed): the base of the 20-day percentage
--      met_20_days         20-day deadline met;  permitted_extension;  late (20-day deadline missed)
--      resolvable          Total "resolvable" requests: the base of granted / partially withheld / fully withheld
-- 2. ministers_meetings.source_published_on: the date GOV.UK published the return each row came from
--    (public_timestamp of the publication). Filled for the current rows by the load file; the sync writes it from now on.
-- 3. dept_ministers: the Culture Secretary's title had the department's pre-2023 name.
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.foi_statistics') IS NOT NULL THEN RAISE EXCEPTION 'foi_statistics already exists'; END IF;
END $$;

CREATE TABLE public.foi_statistics (
  body                 text NOT NULL CHECK (length(trim(body)) > 0),
  period               text NOT NULL CHECK (period ~ '^(Q[1-4] )?20\d{2}$'),   -- 'Q2 2026' or '2025'
  period_year          smallint NOT NULL CHECK (period_year BETWEEN 2005 AND 2100),
  period_quarter       smallint CHECK (period_quarter BETWEEN 1 AND 4),          -- NULL for a calendar year
  received             integer CHECK (received >= 0),
  processed            integer CHECK (processed >= 0),
  on_hold_lapsed       integer CHECK (on_hold_lapsed >= 0),
  still_processing     integer CHECK (still_processing >= 0),
  handled_under_eirs   integer CHECK (handled_under_eirs >= 0),
  received_ex          integer CHECK (received_ex >= 0),
  met_20_days          integer CHECK (met_20_days >= 0),
  permitted_extension  integer CHECK (permitted_extension >= 0),
  late                 integer CHECK (late >= 0),
  pct_met_20_days      numeric(12, 8) CHECK (pct_met_20_days BETWEEN 0 AND 100),
  pct_in_time          numeric(12, 8) CHECK (pct_in_time BETWEEN 0 AND 100),
  advice_given         integer CHECK (advice_given >= 0),
  info_not_held        integer CHECK (info_not_held >= 0),
  resolvable           integer CHECK (resolvable >= 0),
  granted_full         integer CHECK (granted_full >= 0),
  partially_withheld   integer CHECK (partially_withheld >= 0),
  fully_withheld       integer CHECK (fully_withheld >= 0),
  not_yet_provided     integer CHECK (not_yet_provided >= 0),
  pct_granted_full     numeric(12, 8) CHECK (pct_granted_full BETWEEN 0 AND 100),
  pct_withheld_full    numeric(12, 8) CHECK (pct_withheld_full BETWEEN 0 AND 100),
  internal_reviews     integer CHECK (internal_reviews >= 0),
  ir_outcome_known     integer CHECK (ir_outcome_known >= 0),
  ir_upheld_full       integer CHECK (ir_upheld_full >= 0),
  ir_upheld_part       integer CHECK (ir_upheld_part >= 0),
  ir_overturned        integer CHECK (ir_overturned >= 0),
  pct_ir_upheld_full   numeric(12, 8) CHECK (pct_ir_upheld_full BETWEEN 0 AND 100),
  ico_complaints       integer CHECK (ico_complaints >= 0),
  ico_outcome_known    integer CHECK (ico_outcome_known >= 0),
  ico_upheld_full      integer CHECK (ico_upheld_full >= 0),
  ico_upheld_part      integer CHECK (ico_upheld_part >= 0),
  ico_overturned       integer CHECK (ico_overturned >= 0),
  pct_ico_upheld_full  numeric(12, 8) CHECK (pct_ico_upheld_full BETWEEN 0 AND 100),
  source_url           text NOT NULL CHECK (source_url ~ '^https://(www\.gov\.uk|assets\.publishing\.service\.gov\.uk)/'),
  imported_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (body, period),
  CHECK ((period_quarter IS NULL) = (period !~ '^Q'))
);
CREATE INDEX foi_statistics_period_idx ON public.foi_statistics (period_year DESC, period_quarter DESC NULLS LAST);
COMMENT ON TABLE public.foi_statistics IS
  'Cabinet Office FOI statistics by body and period, Q1 2010 to Q2 2026 and 2010 to 2025 (migration 2026-10-20m)';

-- Row level security: anyone may read; only the service role (which bypasses RLS) may write.
ALTER TABLE public.foi_statistics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.foi_statistics FROM anon, authenticated;
GRANT SELECT ON public.foi_statistics TO anon, authenticated;
CREATE POLICY foi_statistics_public_read ON public.foi_statistics FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.ministers_meetings ADD COLUMN source_published_on date;

-- The Culture Secretary's title: the department has been the Department for Culture, Media and Sport since Feb 2023.
UPDATE public.dept_ministers SET role = 'Secretary of State for Culture, Media and Sport'
WHERE role = 'Secretary of State for Digital, Culture, Media and Sport';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'foi_statistics';
  IF n <> 38 THEN RAISE EXCEPTION 'expected 38 columns, found %', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'foi_statistics';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 policy, found %', n; END IF;
  IF has_table_privilege('anon', 'public.foi_statistics', 'INSERT') OR has_table_privilege('anon', 'public.foi_statistics', 'UPDATE')
     OR has_table_privilege('anon', 'public.foi_statistics', 'DELETE') THEN RAISE EXCEPTION 'anon must only read'; END IF;
  IF NOT has_table_privilege('anon', 'public.foi_statistics', 'SELECT') THEN RAISE EXCEPTION 'anon must be able to read'; END IF;
  SELECT count(*) INTO n FROM public.dept_ministers WHERE role ILIKE '%Digital, Culture, Media and Sport%';
  IF n <> 0 THEN RAISE EXCEPTION '% minister roles still use the old DCMS name', n; END IF;
  SELECT count(*) INTO n FROM public.dept_ministers WHERE role = 'Secretary of State for Culture, Media and Sport';
  IF n <> 1 THEN RAISE EXCEPTION 'expected exactly 1 Culture Secretary row, found %', n; END IF;
END $$;

COMMIT;
