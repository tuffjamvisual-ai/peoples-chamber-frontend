-- 2026-10-25a: change_bill_vote(user, bill, choice), so a signed in visitor can change their vote on a bill while it is
-- still going through Parliament (owner's approval, 25 Oct 2026, "allow vote changes"; report 49). NOT APPLIED: this is
-- a production database change and needs the owner's explicit yes first.
--
-- One call, one transaction: it locks the bill row (so two changes to the same bill run one after the other), checks
-- the bill is live, locks the visitor's vote row, changes its choice and moves exactly one count on the bill from the
-- old choice to the new one. Nothing else changes. A bill is closed when it has become an Act (is_act), been withdrawn
-- (bill_withdrawn is set), been defeated (is_defeated) or is hidden (hidden_reason is set). It returns a status:
--   changed    the vote and the counts were changed (with from, to and the new counts)
--   unchanged  the new choice is the same as the old one; nothing was written
--   closed     the bill no longer takes changes (with the visitor's final choice)
--   not_found  no such bill, or it is hidden
--   no_vote    the visitor has not voted on this bill (a first vote still goes through POST /api/vote)
--   invalid    the choice is not yes, no or abstain
-- Only the server (service role) may call it. The vote table has no place for a history of changes, so none is kept
-- (report 49 says what a history table would need).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regprocedure('public.change_bill_vote(integer, integer, text)') IS NOT NULL THEN RAISE EXCEPTION 'change_bill_vote already exists'; END IF;
END $$;

CREATE FUNCTION public.change_bill_vote(p_user_id integer, p_bill_id integer, p_choice text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE b record; v record; c record;
BEGIN
  IF p_choice IS NULL OR p_choice NOT IN ('yes', 'no', 'abstain') THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  SELECT id, is_act, bill_withdrawn, is_defeated, hidden_reason INTO b FROM bill WHERE id = p_bill_id FOR UPDATE;
  IF NOT FOUND OR b.hidden_reason IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT id, choice INTO v FROM vote WHERE user_id = p_user_id AND bill_id = p_bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_vote');
  END IF;

  IF coalesce(b.is_act, false) OR b.bill_withdrawn IS NOT NULL OR coalesce(b.is_defeated, false) THEN
    RETURN jsonb_build_object('status', 'closed', 'choice', v.choice);
  END IF;

  IF v.choice = p_choice THEN
    RETURN jsonb_build_object('status', 'unchanged', 'choice', v.choice);
  END IF;

  UPDATE vote SET choice = p_choice WHERE id = v.id;
  UPDATE bill SET
    vote_count_yes     = greatest(0, coalesce(vote_count_yes, 0)     + (p_choice = 'yes')::int     - (v.choice = 'yes')::int),
    vote_count_no      = greatest(0, coalesce(vote_count_no, 0)      + (p_choice = 'no')::int      - (v.choice = 'no')::int),
    vote_count_abstain = greatest(0, coalesce(vote_count_abstain, 0) + (p_choice = 'abstain')::int - (v.choice = 'abstain')::int)
  WHERE id = p_bill_id
  RETURNING vote_count_yes, vote_count_no, vote_count_abstain INTO c;

  RETURN jsonb_build_object('status', 'changed', 'from', v.choice, 'to', p_choice,
    'votes', jsonb_build_object('yes', c.vote_count_yes, 'no', c.vote_count_no, 'abstain', c.vote_count_abstain));
END $function$;

REVOKE ALL ON FUNCTION public.change_bill_vote(integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_bill_vote(integer, integer, text) TO service_role;

DO $$ BEGIN
  IF to_regprocedure('public.change_bill_vote(integer, integer, text)') IS NULL THEN RAISE EXCEPTION 'function not created'; END IF;
  IF has_function_privilege('anon', 'public.change_bill_vote(integer, integer, text)', 'EXECUTE') THEN RAISE EXCEPTION 'anon can execute'; END IF;
  IF has_function_privilege('authenticated', 'public.change_bill_vote(integer, integer, text)', 'EXECUTE') THEN RAISE EXCEPTION 'authenticated can execute'; END IF;
END $$;

SELECT 'change_bill_vote created' AS step, has_function_privilege('service_role', 'public.change_bill_vote(integer, integer, text)', 'EXECUTE') AS service_role_can_execute;

COMMIT;
