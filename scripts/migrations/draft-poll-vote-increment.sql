-- DRAFT, NOT APPLIED (security review L10, COWORK-TO-T1 ENTRY 59, 15 Nov 2026): an atomic +1 for poll totals, so two
-- votes at the same moment cannot overwrite each other's increment. Needs the owner's approval and the migration rules
-- (backup, ROLLBACK rehearsal, UNDO) before it is run; app/api/polls/vote/route.ts would then call
-- supabase.rpc('increment_poll_vote', { p_poll_id: pollId, p_choice: choice }) instead of reading and writing.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.increment_poll_vote(p_poll_id bigint, p_choice text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  UPDATE public.polls
     SET vote_count_yes = vote_count_yes + CASE WHEN p_choice = 'yes' THEN 1 ELSE 0 END,
         vote_count_no  = vote_count_no  + CASE WHEN p_choice = 'no'  THEN 1 ELSE 0 END
   WHERE id = p_poll_id AND p_choice IN ('yes', 'no');
$$;
REVOKE ALL ON FUNCTION public.increment_poll_vote(bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_poll_vote(bigint, text) TO service_role;
COMMIT;
-- UNDO: DROP FUNCTION IF EXISTS public.increment_poll_vote(bigint, text);
