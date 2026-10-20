-- Lobbying, phase 1 (owner's approval, 20 Oct 2026). Schema only; the data changes are the reload
-- (scripts/reload-ministers-meetings.ts) and the index rebuild (scripts/build-lobbying-index.js), run after this.
-- To rebuild the data from the repo: the reload, then
--   node scripts/build-lobbying-index.js --renormalise --add-excluded=scripts/data/lobby-exclusions-20261020.csv --sql=<file>
-- The exclusions (people, job titles, generic entries) are in that CSV; the council name forms are generated from
-- the councils table by councilForms() in scripts/lib/lobby-names.js.
--
--   ministers_meetings     meeting_date_raw (the date as published), date_note (why a date is empty or was read as
--                          month/day), source_publication_url and source_csv_url (with source_publication_slug, already
--                          a column but never filled), govuk_org_slug (the GOV.UK organisation the sync searched)
--   lobby_meeting_mentions date_note and source_publication_url, copied from the meeting
--   lobby_orgs             council_slug: the council (councils.slug) an organisation is; source may be 'council' (an
--                          organisation added by hand that is a council keeps its source and gets council_slug)
--   lobby_org_aliases      source may be 'council'
--   lobby_summary          meetings_counted (meetings naming at least one organisation that is not excluded) and
--                          meetings_matched (of those, naming at least one matched organisation), for the line under
--                          "Who meets ministers most"
\set ON_ERROR_STOP on
BEGIN;

ALTER TABLE public.ministers_meetings
  ADD COLUMN meeting_date_raw text,
  ADD COLUMN date_note text,
  ADD COLUMN source_publication_url text CHECK (source_publication_url ~ '^https://www\.gov\.uk/'),
  ADD COLUMN source_csv_url text CHECK (source_csv_url ~ '^https://(assets\.publishing\.service\.gov\.uk|www\.gov\.uk)/'),
  ADD COLUMN govuk_org_slug text;

ALTER TABLE public.lobby_meeting_mentions
  ADD COLUMN date_note text,
  ADD COLUMN source_publication_url text;

ALTER TABLE public.lobby_orgs ADD COLUMN council_slug text UNIQUE REFERENCES public.councils(slug);
ALTER TABLE public.lobby_orgs DROP CONSTRAINT lobby_orgs_source_check;
ALTER TABLE public.lobby_orgs ADD CONSTRAINT lobby_orgs_source_check CHECK (source IN ('manual', 'govuk', 'council'));
ALTER TABLE public.lobby_org_aliases DROP CONSTRAINT lobby_org_aliases_source_check;
ALTER TABLE public.lobby_org_aliases ADD CONSTRAINT lobby_org_aliases_source_check CHECK (source IN ('manual', 'govuk', 'council'));

-- lobby_summary with the two meeting counts; otherwise as in 2026-10-14e.
DROP MATERIALIZED VIEW public.lobby_summary;
CREATE MATERIALIZED VIEW public.lobby_summary AS
WITH k AS (
  SELECT meeting_key,
         bool_or(match_type <> 'excluded') AS counted,
         bool_or(match_type = 'alias') AS matched
  FROM public.lobby_meeting_mentions
  GROUP BY meeting_key
)
SELECT
  1 AS id,
  (SELECT count(DISTINCT meeting_key) FROM public.lobby_meeting_mentions) AS meeting_entries,
  (SELECT count(*) FROM public.lobby_meeting_mentions) AS mentions,
  (SELECT count(*) FROM public.lobby_meeting_mentions WHERE match_type = 'alias') AS mentions_matched,
  (SELECT count(*) FROM public.lobby_meeting_mentions WHERE match_type = 'unmatched') AS mentions_unmatched,
  (SELECT count(*) FROM public.lobby_meeting_mentions WHERE match_type = 'excluded') AS mentions_excluded,
  (SELECT count(*) FROM k WHERE counted) AS meetings_counted,
  (SELECT count(*) FROM k WHERE counted AND matched) AS meetings_matched,
  (SELECT min(meeting_date) FROM public.lobby_meeting_mentions WHERE date_flag IS NULL) AS first_meeting,
  (SELECT max(meeting_date) FROM public.lobby_meeting_mentions WHERE date_flag IS NULL) AS last_meeting,
  (SELECT max(built_at) FROM public.lobby_meeting_mentions) AS meetings_built_at,
  (SELECT count(*) FROM public.orcl_client_returns) AS orcl_rows,
  (SELECT count(DISTINCT firm_norm) FROM public.orcl_client_returns) AS orcl_firms,
  (SELECT count(DISTINCT client_norm) FROM public.orcl_client_returns) AS orcl_clients,
  (SELECT min(quarter_start) FROM public.orcl_client_returns) AS orcl_first_quarter,
  (SELECT max(quarter_start) FROM public.orcl_client_returns) AS orcl_last_quarter,
  (SELECT max(built_at) FROM public.orcl_client_returns) AS orcl_built_at,
  now() AS refreshed_at;
CREATE UNIQUE INDEX lobby_summary_id_idx ON public.lobby_summary (id);
GRANT SELECT ON public.lobby_summary TO anon, authenticated;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ministers_meetings'
    AND column_name IN ('meeting_date_raw', 'date_note', 'source_publication_url', 'source_csv_url', 'govuk_org_slug');
  IF n <> 5 THEN RAISE EXCEPTION 'expected 5 new ministers_meetings columns, found %', n; END IF;
  IF (SELECT meetings_counted FROM public.lobby_summary) = 0 THEN RAISE EXCEPTION 'lobby_summary counts no meetings'; END IF;
  IF NOT has_table_privilege('anon', 'public.lobby_summary', 'SELECT') THEN RAISE EXCEPTION 'anon must read lobby_summary'; END IF;
END $$;

COMMIT;
