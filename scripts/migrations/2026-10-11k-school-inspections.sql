-- School inspections (England): Ofsted "State-funded schools inspections and
-- outcomes as at <date>" (official statistics, Open Government Licence v3.0),
-- the most recent inspection outcomes for every open state school.
-- Published twice a year: as at 31 March (released June) and as at
-- 31 August (released November).
--
-- Live-verified 2026-10-11 (scripts/discover-school-inspections.js) on the
-- 31 March 2026 snapshot: 21,965 schools, 85 columns, Windows-1252 text.
--   * "Local authority" (name only) is the education authority: county,
--     unitary, metropolitan or London borough. All 153 names match the
--     councils table (City of London, Kingston upon Hull and Newcastle upon
--     Tyne via fixed mappings). District councils have no education role.
--   * Three kinds of outcome, kept separate because Ofsted says they are not
--     comparable:
--       rc_*      renewed framework report cards (from 10 November 2025):
--                 up to 9 evaluation areas on a 5-point scale plus
--                 safeguarding Met / Not met (921 schools).
--       oeif_*    latest graded inspection under the previous framework:
--                 overall effectiveness 1-4 or 'Not judged' (graded
--                 inspections from 1 September 2024 to 9 November 2025 have no
--                 overall grade), plus key judgements 1-4 (13,072 schools).
--                 Early years / sixth form: 9 = not applicable.
--       ungraded_* latest ungraded inspection outcome, e.g. 'School remains
--                 Good' (11,359 schools).
--   * *_relates_to_current = false when the inspection was of a predecessor
--     school (e.g. before academy conversion).
--   * Category of concern codes: SM special measures, SWK serious
--     weaknesses, RSI requires significant improvement.
-- Each import replaces the snapshot: schools missing from the new file
-- (closed) are removed.

CREATE TABLE IF NOT EXISTS public.school_inspections (
  urn                          text PRIMARY KEY,
  la_gss_code                  text NOT NULL,
  la_name                      text NOT NULL,
  school_name                  text NOT NULL,
  phase                        text,
  school_type                  text,
  admissions_policy            text,
  sixth_form                   text,
  religious_character          text,
  mat_name                     text,
  constituency                 text,
  postcode                     text,
  pupils                       integer,
  idaci_quintile               integer,
  lowest_age                   integer,
  highest_age                  integer,
  web_link                     text,
  -- renewed framework (report cards)
  rc_inspection_date           date,
  rc_publication_date          date,
  rc_inspection_type           text,
  rc_relates_to_current        boolean,
  rc_category                  text,
  rc_safeguarding              text,
  rc_inclusion                 text,
  rc_curriculum_teaching       text,
  rc_achievement               text,
  rc_attendance_behaviour      text,
  rc_personal_development      text,
  rc_early_years               text,
  rc_post16                    text,
  rc_leadership                text,
  -- previous framework, latest graded inspection
  oeif_inspection_date         date,
  oeif_publication_date        date,
  oeif_relates_to_current      boolean,
  oeif_category                text,
  oeif_overall                 text,      -- '1'..'4' or 'Not judged'
  oeif_quality                 text,
  oeif_behaviour               text,
  oeif_personal_development    text,
  oeif_leadership              text,
  oeif_safeguarding            text,      -- 'Yes' / 'No'
  oeif_early_years             text,
  oeif_sixth_form              text,
  -- latest ungraded inspection
  ungraded_date                date,
  ungraded_publication_date    date,
  ungraded_relates_to_current  boolean,
  ungraded_outcome             text,
  most_recent_category         text,
  -- provenance
  snapshot_date                date NOT NULL,
  source_url                   text NOT NULL,
  synced_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_inspections_la ON public.school_inspections (la_gss_code);
CREATE INDEX IF NOT EXISTS idx_school_inspections_snapshot ON public.school_inspections (snapshot_date);

ALTER TABLE public.school_inspections ENABLE ROW LEVEL SECURITY;

-- Dropped first so this file can be re-run safely.
DROP POLICY IF EXISTS "school_inspections_anon_read" ON public.school_inspections;
CREATE POLICY "school_inspections_anon_read"
  ON public.school_inspections
  FOR SELECT
  TO anon
  USING (true);
