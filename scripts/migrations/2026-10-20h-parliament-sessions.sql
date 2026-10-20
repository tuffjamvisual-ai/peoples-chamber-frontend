-- Bills by parliamentary session (owner's approval, 20 Oct 2026).
--
--   parliament_sessions     one row per session: names and dates from Parliament's calendar API,
--                           https://whatson-api.parliament.uk/calendar/sessions/list.json (the Bills API has no
--                           Sessions endpoint; /api/v1/Sessions returns 404). Its SessionId is the same number as the
--                           Bills API's introducedSessionId / stage sessionId. Filled by scripts/load-parliament-sessions.js.
--   bill_in_session         one row per bill per session it sat in: the session it was introduced in, plus any session
--                           its stages were taken in (a carried-over bill appears in both). latest_session_id is the last.
--   bill_current            bills going through Parliament now: introduced in, or carried into, the current session,
--                           and not an Act, withdrawn, defeated or at Royal Assent. The current session is the highest
--                           introduced_session_id in bill, so it moves on by itself when the first bill of a new session
--                           is synced. Used by /bills.
--   parliament_session_bill_counts   per session: bills introduced, bills carried in, and whether it is current.
\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE public.parliament_sessions (
  id integer PRIMARY KEY,                 -- Parliament's session ID (whatson SessionId = Bills API session ID)
  number text NOT NULL,                   -- e.g. '59/2' (Parliament 59, session 2)
  parliament_number integer NOT NULL,
  session_number integer NOT NULL,
  name text NOT NULL,                     -- display name, e.g. '2026-27'; '2019' for the short 2019 session
  commons_description text,               -- as published, e.g. '2019-19'
  start_date date NOT NULL,
  end_date date,                          -- as published; for the current session this is a planned date
  source_url text NOT NULL CHECK (source_url ~ '^https://whatson-api\.parliament\.uk/'),
  fetched_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parliament_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read parliament sessions" ON public.parliament_sessions FOR SELECT USING (true);
GRANT SELECT ON public.parliament_sessions TO anon, authenticated;

CREATE VIEW public.bill_in_session WITH (security_invoker = true) AS
WITH s AS (
  SELECT b.id, b.introduced_session_id,
    ARRAY(
      SELECT DISTINCT x FROM unnest(array_append(ARRAY(
        SELECT (i->>'sessionId')::int
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b.stages->'items') = 'array' THEN b.stages->'items' ELSE '[]'::jsonb END) i
        WHERE i->>'sessionId' ~ '^[0-9]+$'), b.introduced_session_id)) x
      WHERE x IS NOT NULL ORDER BY x) AS session_ids
  FROM public.bill b
)
SELECT b.id AS bill_id, sid AS session_id, (sid = s.introduced_session_id) AS introduced_here,
       s.session_ids[array_upper(s.session_ids, 1)] AS latest_session_id,
       b.title, b.current_stage, b.stage_date, b.is_act, b.bill_withdrawn, b.is_defeated, b.originating_house,
       b.sponsor_name, b.introduced_session_id
FROM s JOIN public.bill b ON b.id = s.id, unnest(s.session_ids) sid;
GRANT SELECT ON public.bill_in_session TO anon, authenticated;

CREATE VIEW public.bill_current WITH (security_invoker = true) AS
SELECT b.*
FROM public.bill b, (SELECT max(introduced_session_id) AS sid FROM public.bill) c
WHERE NOT coalesce(b.is_act, false)
  AND b.bill_withdrawn IS NULL
  AND NOT coalesce(b.is_defeated, false)
  AND b.current_stage IS DISTINCT FROM 'Royal Assent'
  AND (b.introduced_session_id = c.sid
       OR (jsonb_typeof(b.stages->'items') = 'array' AND b.stages->'items' @> jsonb_build_array(jsonb_build_object('sessionId', c.sid))));
GRANT SELECT ON public.bill_current TO anon, authenticated;

CREATE VIEW public.parliament_session_bill_counts WITH (security_invoker = true) AS
SELECT m.session_id,
       count(*) FILTER (WHERE m.introduced_here) AS bills_introduced,
       count(*) FILTER (WHERE NOT m.introduced_here) AS bills_carried_in,
       count(*) AS bills_listed,
       (m.session_id = (SELECT max(introduced_session_id) FROM public.bill)) AS is_current
FROM public.bill_in_session m
GROUP BY m.session_id;
GRANT SELECT ON public.parliament_session_bill_counts TO anon, authenticated;

DO $$
DECLARE n int; cur int;
BEGIN
  SELECT count(*) INTO n FROM public.bill_in_session WHERE introduced_here;
  IF n <> (SELECT count(*) FROM public.bill WHERE introduced_session_id IS NOT NULL) THEN
    RAISE EXCEPTION 'bill_in_session: expected one introduced row per bill, found %', n;
  END IF;
  SELECT max(introduced_session_id) INTO cur FROM public.bill;
  SELECT count(*) INTO n FROM public.bill_current;
  RAISE NOTICE 'current session %, bills going through Parliament now: %', cur, n;
  IF n = 0 OR n > 1000 THEN RAISE EXCEPTION 'bill_current has % rows, outside the expected range', n; END IF;
  IF NOT has_table_privilege('anon', 'public.bill_current', 'SELECT') THEN RAISE EXCEPTION 'anon must read bill_current'; END IF;
END $$;

COMMIT;
