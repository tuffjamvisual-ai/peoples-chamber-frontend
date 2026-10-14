-- Lobbying page: read-only views over the lobbying index, so the page reads one small
-- result instead of tens of thousands of rows.
--
-- lobby_org_rankings  one row per organisation that has met a minister or appears as a
--                     consultant lobbyist's client: meetings (all, last 12 months),
--                     ministers met, last meeting, lobbying firms used.
--                     A "meeting" is one minister's published entry (meeting_key), so an
--                     organisation named twice in the same entry counts once, and a
--                     meeting attended by two ministers counts once per minister, as published.
-- lobby_summary       one row of totals for the page header and the "how this is counted" note.
--
-- Both are security_invoker views, so the public-read RLS on the underlying tables applies.

\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE VIEW public.lobby_org_rankings WITH (security_invoker = true) AS
WITH m AS (
  SELECT org_id,
         count(DISTINCT meeting_key) AS meetings_all,
         count(DISTINCT meeting_key) FILTER (WHERE meeting_date > current_date - 365 AND meeting_date <= current_date) AS meetings_12m,
         count(DISTINCT minister_name) AS ministers_all,
         count(DISTINCT minister_name) FILTER (WHERE meeting_date > current_date - 365 AND meeting_date <= current_date) AS ministers_12m,
         max(meeting_date) FILTER (WHERE date_flag IS NULL) AS last_meeting
  FROM public.lobby_meeting_mentions
  WHERE match_type = 'alias' AND org_id IS NOT NULL
  GROUP BY org_id
), c AS (
  SELECT client_org_id AS org_id,
         count(DISTINCT firm_norm) AS lobbying_firms,
         count(DISTINCT quarter_start) AS lobbying_quarters,
         max(quarter_start) AS last_lobbying_quarter
  FROM public.orcl_client_returns
  WHERE match_type = 'alias' AND client_org_id IS NOT NULL
  GROUP BY client_org_id
)
SELECT o.id AS org_id, o.slug, o.name, o.org_type, o.source, o.reviewed,
       coalesce(m.meetings_all, 0) AS meetings_all,
       coalesce(m.meetings_12m, 0) AS meetings_12m,
       coalesce(m.ministers_all, 0) AS ministers_all,
       coalesce(m.ministers_12m, 0) AS ministers_12m,
       m.last_meeting,
       coalesce(c.lobbying_firms, 0) AS lobbying_firms,
       coalesce(c.lobbying_quarters, 0) AS lobbying_quarters,
       c.last_lobbying_quarter
FROM public.lobby_orgs o
LEFT JOIN m ON m.org_id = o.id
LEFT JOIN c ON c.org_id = o.id
WHERE m.org_id IS NOT NULL OR c.org_id IS NOT NULL;

CREATE OR REPLACE VIEW public.lobby_summary WITH (security_invoker = true) AS
SELECT
  (SELECT count(DISTINCT meeting_key) FROM public.lobby_meeting_mentions) AS meeting_entries,
  (SELECT count(*) FROM public.lobby_meeting_mentions) AS mentions,
  (SELECT count(*) FROM public.lobby_meeting_mentions WHERE match_type = 'alias') AS mentions_matched,
  (SELECT count(*) FROM public.lobby_meeting_mentions WHERE match_type = 'unmatched') AS mentions_unmatched,
  (SELECT count(*) FROM public.lobby_meeting_mentions WHERE match_type = 'excluded') AS mentions_excluded,
  (SELECT min(meeting_date) FROM public.lobby_meeting_mentions WHERE date_flag IS NULL) AS first_meeting,
  (SELECT max(meeting_date) FROM public.lobby_meeting_mentions WHERE date_flag IS NULL) AS last_meeting,
  (SELECT max(built_at) FROM public.lobby_meeting_mentions) AS meetings_built_at,
  (SELECT count(*) FROM public.orcl_client_returns) AS orcl_rows,
  (SELECT count(DISTINCT firm_norm) FROM public.orcl_client_returns) AS orcl_firms,
  (SELECT count(DISTINCT client_norm) FROM public.orcl_client_returns) AS orcl_clients,
  (SELECT min(quarter_start) FROM public.orcl_client_returns) AS orcl_first_quarter,
  (SELECT max(quarter_start) FROM public.orcl_client_returns) AS orcl_last_quarter,
  (SELECT max(built_at) FROM public.orcl_client_returns) AS orcl_built_at;

GRANT SELECT ON public.lobby_org_rankings, public.lobby_summary TO anon, authenticated;

-- Self-check: both views return rows.
DO $$ BEGIN
  IF (SELECT count(*) FROM public.lobby_org_rankings) = 0 THEN RAISE EXCEPTION 'lobby_org_rankings is empty'; END IF;
  IF (SELECT mentions FROM public.lobby_summary) = 0 THEN RAISE EXCEPTION 'lobby_summary shows no mentions'; END IF;
END $$;

COMMIT;
