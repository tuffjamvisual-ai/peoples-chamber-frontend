-- Hidden bills (owner's approval, 20 Oct 2026). bill.hidden_reason says why a bill row is not shown: a hidden bill is
-- left out of /bills, the archive (/bills/sessions), search and the sitemap, and its pages return 404. Nothing is
-- deleted. Set for three rows:
--   4072  duplicate of 4064 (same title; Parliament's bill 4303, which it points to, returns 404)
--   3912  ". Bill": Parliament's bill 3675 returns 404
--   3913  "Sentencing Bill (Lords Amendments) Bill": Parliament's bill 4068 returns 404
-- Each row's id and earlier hidden_reason are copied to bill_hidden_20261020 first (row level security on, no policies).
-- UNDO: UPDATE bill b SET hidden_reason = NULL FROM bill_hidden_20261020 h WHERE h.id = b.id;
\set ON_ERROR_STOP on
BEGIN;

ALTER TABLE public.bill ADD COLUMN hidden_reason text CHECK (hidden_reason IS NULL OR length(trim(hidden_reason)) > 0);

CREATE TABLE bill_hidden_20261020 AS
SELECT id, parliament_id, title, hidden_reason, now() AS saved_at FROM public.bill WHERE id IN (4072, 3912, 3913);
ALTER TABLE bill_hidden_20261020 ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM bill_hidden_20261020; IF n <> 3 THEN RAISE EXCEPTION 'expected 3 bills, found %', n; END IF;
  -- The rows must still be the ones checked on 20 Oct 2026.
  SELECT count(*) INTO n FROM public.bill WHERE (id, parliament_id) IN ((4072, 4303), (3912, 3675), (3913, 4068));
  IF n <> 3 THEN RAISE EXCEPTION 'bill ids and Parliament ids no longer match (% of 3)', n; END IF;
  SELECT count(*) INTO n FROM public.bill WHERE id = 4064 AND title = (SELECT title FROM public.bill WHERE id = 4072);
  IF n <> 1 THEN RAISE EXCEPTION 'bill 4064 no longer has the same title as 4072'; END IF;
END $$;

UPDATE public.bill SET hidden_reason = 'duplicate of 4064' WHERE id = 4072;
UPDATE public.bill SET hidden_reason = 'bad record: 404 from Parliament' WHERE id IN (3912, 3913);

-- The views from 2026-10-20h, now without hidden bills. bill_current's b.* gains hidden_reason as its last column.
CREATE OR REPLACE VIEW public.bill_in_session WITH (security_invoker = true) AS
WITH s AS (
  SELECT b.id, b.introduced_session_id,
    ARRAY(
      SELECT DISTINCT x FROM unnest(array_append(ARRAY(
        SELECT (i->>'sessionId')::int
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b.stages->'items') = 'array' THEN b.stages->'items' ELSE '[]'::jsonb END) i
        WHERE i->>'sessionId' ~ '^[0-9]+$'), b.introduced_session_id)) x
      WHERE x IS NOT NULL ORDER BY x) AS session_ids
  FROM public.bill b
  WHERE b.hidden_reason IS NULL
)
SELECT b.id AS bill_id, sid AS session_id, (sid = s.introduced_session_id) AS introduced_here,
       s.session_ids[array_upper(s.session_ids, 1)] AS latest_session_id,
       b.title, b.current_stage, b.stage_date, b.is_act, b.bill_withdrawn, b.is_defeated, b.originating_house,
       b.sponsor_name, b.introduced_session_id
FROM s JOIN public.bill b ON b.id = s.id, unnest(s.session_ids) sid;

CREATE OR REPLACE VIEW public.bill_current WITH (security_invoker = true) AS
SELECT b.*
FROM public.bill b, (SELECT max(introduced_session_id) AS sid FROM public.bill WHERE hidden_reason IS NULL) c
WHERE b.hidden_reason IS NULL
  AND NOT coalesce(b.is_act, false)
  AND b.bill_withdrawn IS NULL
  AND NOT coalesce(b.is_defeated, false)
  AND b.current_stage IS DISTINCT FROM 'Royal Assent'
  AND (b.introduced_session_id = c.sid
       OR (jsonb_typeof(b.stages->'items') = 'array' AND b.stages->'items' @> jsonb_build_array(jsonb_build_object('sessionId', c.sid))));

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.bill WHERE hidden_reason IS NOT NULL;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 hidden bills, found %', n; END IF;
  SELECT count(*) INTO n FROM public.bill_current; IF n <> 183 THEN RAISE EXCEPTION 'expected 183 current bills (184 less 4072), found %', n; END IF;
  SELECT count(*) INTO n FROM public.bill_in_session WHERE bill_id IN (4072, 3912, 3913);
  IF n <> 0 THEN RAISE EXCEPTION 'hidden bills still in bill_in_session'; END IF;
  SELECT count(*) INTO n FROM public.bill_in_session WHERE introduced_here;
  IF n <> 4060 THEN RAISE EXCEPTION 'expected 4060 bills in the archive, found %', n; END IF;
END $$;

COMMIT;
