-- 2026-10-29d: tables for the Committee of Public Accounts recommendations tracker (owner's approval, 29 Oct 2026,
-- "go stage 2"). New tables only; no existing table is changed. Undo: 2026-10-29d-UNDO.sql (drops these four tables
-- only). Loaded by scripts/pac/load-treasury-minutes.mjs from the output of scripts/pac/parse-treasury-minutes.mjs.
-- Secured like every table since the Phase 2 lock down (2026-10-28j): row level security on, no policies, nothing
-- granted to anon or authenticated, so only the server key (service role) can read or write them.
-- Months (target_month and the rest) are the first day of the month that ENDS the period written ("Summer 2027" is
-- 2027-08-01); a date kept as written but not read has a NULL month and needs_review = true.

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- a. The published documents: Treasury Minutes and Treasury Minutes Progress Reports.
CREATE TABLE public.pac_source_documents (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('treasury_minute', 'progress_report')),
  cp_number    text NOT NULL UNIQUE,                 -- e.g. 'CP 1668'
  title        text NOT NULL,
  published_on date NOT NULL,
  url          text NOT NULL,                        -- the PDF on assets.publishing.service.gov.uk
  pages        int,
  sha256       text NOT NULL,                        -- of the PDF that was parsed
  fetched_at   timestamptz NOT NULL
);
COMMENT ON TABLE public.pac_source_documents IS
  'HM Treasury Treasury Minutes and Treasury Minutes Progress Reports (government responses to the Committee of Public Accounts). Source: GOV.UK (www.gov.uk/government/collections/treasury-minutes), Open Government Licence v3.0.';

-- b. Committee of Public Accounts reports.
CREATE TABLE public.pac_reports (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session       text NOT NULL,                       -- e.g. '2024-26' ('2024-25' in older documents is stored as 2024-26)
  report_number int NOT NULL,
  title         text NOT NULL,
  department    text,
  committee_url text,
  UNIQUE (session, report_number)
);
COMMENT ON TABLE public.pac_reports IS
  'Committee of Public Accounts reports answered in Treasury Minutes. Source: HM Treasury Treasury Minutes and Progress Reports on GOV.UK, Open Government Licence v3.0.';

-- c. Each recommendation in a report (numbers as printed: 1, 4a, 4b).
CREATE TABLE public.pac_recommendations (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id           bigint NOT NULL REFERENCES public.pac_reports (id),
  rec_number          text NOT NULL,
  conclusion_text     text,
  recommendation_text text,
  UNIQUE (report_id, rec_number)
);
COMMENT ON TABLE public.pac_recommendations IS
  'Committee of Public Accounts conclusions and recommendations, as printed in HM Treasury Treasury Minutes and Progress Reports. Source: GOV.UK, Open Government Licence v3.0.';

-- d. What each document says about each recommendation.
CREATE TABLE public.pac_recommendation_events (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recommendation_id     bigint NOT NULL REFERENCES public.pac_recommendations (id),
  document_id           bigint NOT NULL REFERENCES public.pac_source_documents (id),
  page                  int,                         -- the PDF page of the recommendation heading
  response              text,                        -- agree, partly, disagree, notes, or the government's words
  response_text         text,                        -- the response paragraphs (Treasury Minute) or the first one (Progress Report)
  status                text CHECK (status IN ('target', 'implemented', 'outstanding')),
  target_text           text,
  target_month          date,
  original_target_text  text,
  original_target_month date,
  revised_target_text   text,
  revised_target_month  date,
  implemented_text      text,
  implemented_month     date,
  progress_text         text,                        -- Progress Report paragraphs after the response
  needs_review          boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recommendation_id, document_id)
);
CREATE INDEX pac_recommendation_events_document_idx ON public.pac_recommendation_events (document_id);
CREATE INDEX pac_recommendation_events_target_month_idx ON public.pac_recommendation_events (target_month);
CREATE INDEX pac_recommendation_events_revised_target_month_idx ON public.pac_recommendation_events (revised_target_month);
CREATE INDEX pac_recommendation_events_original_target_month_idx ON public.pac_recommendation_events (original_target_month);
-- pac_recommendations (report_id) and pac_recommendation_events (recommendation_id) are covered by their unique keys.
COMMENT ON TABLE public.pac_recommendation_events IS
  'Each Treasury Minute or Progress Report entry for a Committee of Public Accounts recommendation: response, status and target dates as written. Source: HM Treasury on GOV.UK, Open Government Licence v3.0.';

-- e. Row level security on, no policies, nothing granted to the public roles.
ALTER TABLE public.pac_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_recommendation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pac_source_documents, public.pac_reports, public.pac_recommendations, public.pac_recommendation_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.pac_source_documents_id_seq, public.pac_reports_id_seq, public.pac_recommendations_id_seq, public.pac_recommendation_events_id_seq FROM anon, authenticated;

COMMIT;
