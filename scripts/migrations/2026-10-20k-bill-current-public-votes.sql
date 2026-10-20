-- /bills "Most voted" sorts by the figure the bill card shows (owner's approval, 20 Oct 2026). The card shows Aye plus
-- No votes ("1,075 votes"); the list was ordered by Aye votes alone, so Pets (Microchips) Bill (638 + 276 = 914) sat
-- below the SLAPP Bill (653 + 259 = 912). bill_current gains public_votes = Aye + No (abstentions are not shown on the
-- card and are not counted); lib/data.ts getBillsPage orders by it, then by id.
-- Otherwise as in 2026-10-20j; the new column is added last, as CREATE OR REPLACE VIEW requires.
\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE VIEW public.bill_current WITH (security_invoker = true) AS
SELECT b.*, coalesce(b.vote_count_yes, 0) + coalesce(b.vote_count_no, 0) AS public_votes
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
  SELECT count(*) INTO n FROM public.bill_current; IF n <> 183 THEN RAISE EXCEPTION 'expected 183 current bills, found %', n; END IF;
  SELECT count(*) INTO n FROM public.bill_current WHERE public_votes <> coalesce(vote_count_yes, 0) + coalesce(vote_count_no, 0);
  IF n <> 0 THEN RAISE EXCEPTION 'public_votes wrong on % rows', n; END IF;
END $$;

COMMIT;
