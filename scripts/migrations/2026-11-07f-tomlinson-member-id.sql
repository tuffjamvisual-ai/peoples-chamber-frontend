-- Applied on the owner's yes, 7 Nov 2026 (S3). Links dept_ministers row 22022 (Daniel Tomlinson MP, Cabinet Office,
-- Parliamentary Secretary) to member 5282, Dan Tomlinson: the same GOV.UK person (daniel-tomlinson) as row 21932 (Treasury),
-- already linked to 5282. Matched on id, department, name, GOV.UK slug and a null member_id; any other count rolls back.
-- Undo: 2026-11-07f-tomlinson-member-id-UNDO.sql.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $link$
DECLARE n integer;
BEGIN
  UPDATE public.dept_ministers SET member_id = 5282
   WHERE id = 22022 AND dept_slug = 'cabinet-office' AND name = 'Daniel Tomlinson MP' AND slug = 'daniel-tomlinson' AND member_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 row linked, touched %', n; END IF;
END
$link$;
COMMIT;
