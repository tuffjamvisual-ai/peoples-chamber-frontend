-- UNDO for 2026-11-07f-tomlinson-member-id.sql: sets member_id back to null on row 22022, matching its id, department, name
-- and the member id set. Any other count rolls back.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $undo$
DECLARE n integer;
BEGIN
  UPDATE public.dept_ministers SET member_id = NULL
   WHERE id = 22022 AND dept_slug = 'cabinet-office' AND name = 'Daniel Tomlinson MP' AND slug = 'daniel-tomlinson' AND member_id = 5282;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 row unlinked, touched %', n; END IF;
END
$undo$;
COMMIT;
