-- Applied to production on 6 Nov 2026 at 12:08:49 GMT, on the owner's yes: 42 rows.
-- 42 current Labour (Co-op) MPs have the colour grey (#808080) where the other Labour (Co-op) MP and every Labour MP have the
-- site's Labour red (#E4003B). MP pages already override this, but /second-jobs and others read the stored colour. Colour only.
-- All or none. Backup: "Claude outputs/backups/mps-party-fields-before-2026-11-06e.csv". Undo: 2026-11-06e-labour-coop-colour-UNDO.sql
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.mps SET party_colour = '#E4003B', updated_at = now()
   WHERE party = 'Labour (Co-op)' AND party_colour = '#808080' AND current_member;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 42 THEN RAISE EXCEPTION 'expected 42 rows, changed %', n; END IF;
END $$;
COMMIT;
