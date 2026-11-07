-- UNDO for 2026-11-07h-mp-contributions-key.sql: puts back UNIQUE (member_id, debate_website_id). The old key holds one row per
-- debate_website_id, so first, where a member has two sittings under one id, the older sittings are removed, as the old code
-- kept the newest (for Daisy Cooper that removes her 21 October 2026 row and keeps 4 November). Revert the code first: the old
-- sync upserts on (member_id, debate_website_id) and fails against any other key. Rows to keep: the backup
-- "Claude outputs/backups/mp_contributions-before-key-change-2026-11-07.csv".
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $undo$
DECLARE n integer;
BEGIN
  DELETE FROM public.mp_contributions c
   USING public.mp_contributions newer
   WHERE newer.member_id = c.member_id AND newer.debate_website_id IS NOT DISTINCT FROM c.debate_website_id
     AND newer.sitting_date > c.sitting_date;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'older sittings removed: %', n;
  ALTER TABLE public.mp_contributions DROP CONSTRAINT mp_contributions_member_debate_sitting_key;
  ALTER TABLE public.mp_contributions ADD CONSTRAINT mp_contributions_member_id_debate_website_id_key UNIQUE (member_id, debate_website_id);
END
$undo$;
COMMIT;
