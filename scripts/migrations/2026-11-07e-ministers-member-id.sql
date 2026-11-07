-- Applied on the owner's yes, 7 Nov 2026 (S2). Links 50 Commons dept_ministers rows (47 people) to their MP record: each
-- GOV.UK name, with honorifics and post-nominals removed, matched exactly one current Commons member in Parliament's
-- Members API and exactly one current MP in our mps table, with the same member id (Claude outputs/ministers-link/matches.csv).
-- Each row is matched on id, department, name and a null member_id; any other count rolls back. One row is left unlinked
-- (Daniel Tomlinson MP: Parliament has "Dan Tomlinson"; unmatched.csv). Undo: 2026-11-07e-ministers-member-id-UNDO.sql.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE _link (id integer PRIMARY KEY, dept_slug text NOT NULL, name text NOT NULL, member_id integer NOT NULL) ON COMMIT DROP;
INSERT INTO _link VALUES
  (21928, $v$treasury$v$, $v$The Rt Hon John Healey MP$v$, 400),
  (21929, $v$treasury$v$, $v$The Rt Hon Emma Reynolds MP$v$, 4077),
  (21930, $v$treasury$v$, $v$The Rt Hon James Murray MP$v$, 4797),
  (21931, $v$treasury$v$, $v$The Rt Hon Lucy Rigby KC MP$v$, 5333),
  (21936, $v$home-office$v$, $v$The Rt Hon Dan Jarvis MBE MP$v$, 4243),
  (21939, $v$home-office$v$, $v$The Rt Hon Anna Turley MP$v$, 4449),
  (21943, $v$health$v$, $v$The Rt Hon Yvette Cooper MP$v$, 420),
  (21944, $v$health$v$, $v$The Rt Hon Dame Diana Johnson DBE MP$v$, 1533),
  (21945, $v$health$v$, $v$Alison McGovern MP$v$, 4083),
  (21947, $v$health$v$, $v$Chris McDonald MP$v$, 5116),
  (21948, $v$health$v$, $v$James Frith MP$v$, 4637),
  (21950, $v$energy$v$, $v$The Rt Hon Miatta Fahnbulleh MP$v$, 5099),
  (21954, $v$energy$v$, $v$Polly Billington MP$v$, 5123),
  (21955, $v$energy$v$, $v$Blair McDougall MP$v$, 5076),
  (21957, $v$education$v$, $v$The Rt Hon Lucy Powell MP$v$, 4263),
  (21961, $v$education$v$, $v$Paul Waugh MP$v$, 5071),
  (21968, $v$work-pensions$v$, $v$Lilian Greenwood MP$v$, 4029),
  (21971, $v$transport$v$, $v$Justin Madders MP$v$, 4418),
  (21974, $v$environment$v$, $v$The Rt Hon Dame Angela Eagle DBE MP$v$, 491),
  (21976, $v$environment$v$, $v$Jenny Riddell-Carpenter MP$v$, 5160),
  (21977, $v$environment$v$, $v$Stephen Morgan MP$v$, 4653),
  (21987, $v$housing$v$, $v$The Rt Hon Angela Rayner MP$v$, 4356),
  (21988, $v$housing$v$, $v$The Rt Hon Bridget Phillipson MP$v$, 4046),
  (21989, $v$housing$v$, $v$The Rt Hon Matthew Pennycook MP$v$, 4520),
  (21990, $v$housing$v$, $v$Florence Eshalomi MP$v$, 4870),
  (21991, $v$housing$v$, $v$The Rt Hon Sir Stephen Timms MP$v$, 163),
  (21992, $v$housing$v$, $v$Sally Jameson MP$v$, 5178),
  (21993, $v$housing$v$, $v$Jim McMahon OBE MP$v$, 4569),
  (21996, $v$housing$v$, $v$Satvir Kaur MP$v$, 5271),
  (21997, $v$housing$v$, $v$Simon Lightwood MP$v$, 4943),
  (21999, $v$justice$v$, $v$The Rt Hon Alex Norris MP$v$, 4641),
  (22000, $v$justice$v$, $v$Catherine McKinnell MP$v$, 4125),
  (22003, $v$justice$v$, $v$Alex Davies-Jones MP$v$, 4849),
  (22005, $v$defence$v$, $v$The Rt Hon Wes Streeting MP$v$, 4504),
  (22009, $v$defence$v$, $v$Calvin Bailey MBE MP$v$, 5054),
  (22017, $v$cabinet-office$v$, $v$The Rt Hon Louise Haigh MP$v$, 4473),
  (22018, $v$cabinet-office$v$, $v$The Rt Hon Hamish Falconer MP$v$, 5148),
  (22019, $v$cabinet-office$v$, $v$The Rt Hon Kanishka Narayan MP$v$, 5039),
  (22020, $v$cabinet-office$v$, $v$The Rt Hon Dan Jarvis MBE MP$v$, 4243),
  (22021, $v$cabinet-office$v$, $v$Sally Jameson MP$v$, 5178),
  (22023, $v$cabinet-office$v$, $v$Mark Ferguson MP$v$, 5031),
  (22025, $v$foreign-office$v$, $v$The Rt Hon Ed Miliband MP$v$, 1510),
  (22026, $v$foreign-office$v$, $v$The Rt Hon Hamish Falconer MP$v$, 5148),
  (22027, $v$foreign-office$v$, $v$Kirsty McNeill MP$v$, 5114),
  (22029, $v$foreign-office$v$, $v$Uma Kumaran MP$v$, 5278),
  (22034, $v$attorney-general$v$, $v$Andy Slaughter KC MP$v$, 1516),
  (22036, $v$scotland-office$v$, $v$Melanie Ward MP$v$, 5240),
  (22037, $v$wales-office$v$, $v$The Rt Hon Stephen Kinnock MP$v$, 4359),
  (22040, $v$northern-ireland-office$v$, $v$The Rt Hon Sir Chris Bryant MP$v$, 1446),
  (22041, $v$northern-ireland-office$v$, $v$Sarah Owen MP$v$, 4777);
DO $link$
DECLARE n integer;
BEGIN
  UPDATE public.dept_ministers d SET member_id = l.member_id FROM _link l
   WHERE d.id = l.id AND d.dept_slug = l.dept_slug AND d.name = l.name AND d.member_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 50 THEN RAISE EXCEPTION 'expected 50 rows linked, touched %', n; END IF;
END
$link$;
COMMIT;
