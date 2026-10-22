-- 2026-10-22d: Commons seat history for six MPs from the Members API History endpoint (owner's approval, 22 Oct 2026).
-- The Biography endpoint merged real breaks in membership, so the Roles tab showed Farage (5091), Ed Davey (188),
-- David Davis (373) and Sarah Olney (4591) as continuous; Andy Burnham (1427) and Lara Bird (5449) had no seats at all.
-- Each break now shows as separate entries, labelled with how it ended. From now on /api/sync-member-biography keeps
-- representations current (lib/commons-representations.ts builds the same values).
\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.mp_biography_seats_backup_20261022') IS NOT NULL THEN RAISE EXCEPTION 'backup table already exists'; END IF;
END $$;

CREATE TABLE public.mp_biography_seats_backup_20261022 AS
  SELECT member_id, representations, now() AS backed_up_at FROM public.mp_biography WHERE member_id IN (5091, 188, 373, 4591, 1427, 5449);
ALTER TABLE public.mp_biography_seats_backup_20261022 ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.mp_biography_seats_backup_20261022;
  IF n <> 6 THEN RAISE EXCEPTION 'backup has % rows, expected 6', n; END IF;
  SELECT count(*) INTO n FROM public.mp_biography_seats_backup_20261022 WHERE member_id IN (1427, 5449) AND representations IS NULL;
  IF n <> 2 THEN RAISE EXCEPTION 'expected Burnham and Bird to have no seats, found % without', n; END IF;
  SELECT jsonb_array_length(representations::jsonb) INTO n FROM public.mp_biography_seats_backup_20261022 WHERE member_id = 5091;
  IF n <> 1 THEN RAISE EXCEPTION 'expected one stored seat for Farage, found %', n; END IF;
END $$;

WITH v(member_id, reps) AS (VALUES
  (5091, $j$[{"id":3989,"name":"Clacton","house":1,"startDate":"2024-07-04T00:00:00","endDate":"2026-07-08T00:00:00","endReason":"resigned"},{"id":3989,"name":"Clacton","house":1,"startDate":"2026-08-13T00:00:00","endDate":null,"endReason":null}]$j$::jsonb),
  (188, $j$[{"id":1628,"name":"Kingston and Surbiton","house":1,"startDate":"1997-05-01T00:00:00","endDate":"2010-05-06T00:00:00","endReason":null},{"id":3557,"name":"Kingston and Surbiton","house":1,"startDate":"2010-05-06T00:00:00","endDate":"2015-03-30T00:00:00","endReason":"lost seat at general election"},{"id":3557,"name":"Kingston and Surbiton","house":1,"startDate":"2017-06-08T00:00:00","endDate":"2024-05-30T00:00:00","endReason":null},{"id":4127,"name":"Kingston and Surbiton","house":1,"startDate":"2024-07-04T00:00:00","endDate":null,"endReason":null}]$j$::jsonb),
  (373, $j$[{"id":367,"name":"Boothferry","house":1,"startDate":"1987-06-11T00:00:00","endDate":"1997-05-01T00:00:00","endReason":null},{"id":1349,"name":"Haltemprice and Howden","house":1,"startDate":"1997-05-01T00:00:00","endDate":"2008-06-18T00:00:00","endReason":"resigned"},{"id":1349,"name":"Haltemprice and Howden","house":1,"startDate":"2008-07-10T00:00:00","endDate":"2010-05-06T00:00:00","endReason":null},{"id":3510,"name":"Haltemprice and Howden","house":1,"startDate":"2010-05-06T00:00:00","endDate":"2024-05-30T00:00:00","endReason":null},{"id":4065,"name":"Goole and Pocklington","house":1,"startDate":"2024-07-04T00:00:00","endDate":null,"endReason":null}]$j$::jsonb),
  (4591, $j$[{"id":3699,"name":"Richmond Park","house":1,"startDate":"2016-12-01T00:00:00","endDate":"2017-05-03T00:00:00","endReason":"lost seat at general election"},{"id":3699,"name":"Richmond Park","house":1,"startDate":"2019-12-12T00:00:00","endDate":"2024-05-30T00:00:00","endReason":null},{"id":4260,"name":"Richmond Park","house":1,"startDate":"2024-07-04T00:00:00","endDate":null,"endReason":null}]$j$::jsonb),
  (1427, $j$[{"id":1738,"name":"Leigh","house":1,"startDate":"2001-06-07T00:00:00","endDate":"2010-05-06T00:00:00","endReason":null},{"id":3573,"name":"Leigh","house":1,"startDate":"2010-05-06T00:00:00","endDate":"2017-05-03T00:00:00","endReason":"stood down at general election"},{"id":4165,"name":"Makerfield","house":1,"startDate":"2026-06-18T00:00:00","endDate":null,"endReason":null}]$j$::jsonb),
  (5449, $j$[{"id":4455,"name":"Arbroath and Broughty Ferry","house":1,"startDate":"2026-06-18T00:00:00","endDate":null,"endReason":null}]$j$::jsonb)
)
UPDATE public.mp_biography b SET representations = v.reps FROM v WHERE b.member_id = v.member_id;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.mp_biography WHERE member_id IN (5091, 188, 373, 4591, 1427, 5449) AND jsonb_typeof(representations::jsonb) = 'array' AND jsonb_array_length(representations::jsonb) > 0;
  IF n <> 6 THEN RAISE EXCEPTION 'expected 6 updated rows with seats, found %', n; END IF;
END $$;

SELECT member_id, jsonb_array_length(representations::jsonb) AS seats,
  (SELECT string_agg(e->>'endReason', ', ') FROM jsonb_array_elements(representations::jsonb) e WHERE e->>'endReason' IS NOT NULL) AS labels
FROM public.mp_biography WHERE member_id IN (5091, 188, 373, 4591, 1427, 5449) ORDER BY member_id;

COMMIT;
