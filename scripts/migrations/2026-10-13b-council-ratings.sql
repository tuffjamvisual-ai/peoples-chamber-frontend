-- Council performance measures for the council league table (England first).
-- One row per measure, council and period. Only measures of services the
-- council itself runs are stored here; area conditions (poverty, crime, house
-- prices, sewage) stay in their own tables as background.
--
-- Measures (source, licence):
--   ofsted_childrens_services  Ofsted, Local authority inspection outcomes (official
--                              statistics, Open Government Licence). value_grade =
--                              overall effectiveness; grade_rank 1 Outstanding .. 4 Inadequate;
--                              detail = sub-judgements, inspection and publication dates, report link.
--   recycling_rate             Defra, Local authority collected waste annual results, Table 3
--                              (Open Government Licence). value_num = % of household waste sent
--                              for reuse, recycling or composting (ex NI192), as a percentage.
--   planning_major_speed       MHCLG, Table P151a (Open Government Licence). value_num = % of major
--   planning_nonmajor_speed    decisions (P151a) or non-major decisions (P153) made within the
--                              statutory period or an agreed extension, over 24 months; detail =
--                              counts, imputed quarters and the published % with penalty.
--   cqc_adult_social_care      CQC local authority assessments (Open Government Licence) - to follow.
--   ombudsman_upheld_rate      Local Government and Social Care Ombudsman (re-use permitted with
--                              acknowledgement) - to follow.
--
-- Written by scripts/import-council-ratings.js (dry run by default; --write to save).

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.council_ratings (
  measure           text NOT NULL,
  council_gss_code  text NOT NULL,          -- as stored in public.councils.gss_code
  period            text NOT NULL,          -- e.g. '2024-25', 'as at 31 March 2026', '24 months to June 2026'
  value_num         numeric,                -- numeric measures (percentages)
  value_grade       text,                   -- graded measures (e.g. 'Good')
  grade_rank        smallint,               -- 1 best .. 4 worst for graded measures
  detail            jsonb,                  -- sub-scores, counts, dates, links
  source            text NOT NULL,
  source_url        text NOT NULL,
  published_date    date,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (measure, council_gss_code, period)
);

CREATE INDEX IF NOT EXISTS council_ratings_council_idx ON public.council_ratings (council_gss_code);

ALTER TABLE public.council_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "council_ratings_anon_read" ON public.council_ratings;
CREATE POLICY "council_ratings_anon_read" ON public.council_ratings FOR SELECT TO anon USING (true);

COMMIT;
