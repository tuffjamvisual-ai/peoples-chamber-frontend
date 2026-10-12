-- Part 2: corrects 4 more handwritten MP biographies that still treat Keir Starmer as Prime Minister / Labour leader.
-- Starmer was PM 5 Jul 2024 - 20 Jul 2026; Andy Burnham became Labour leader 17 Jul 2026 and PM 20 Jul 2026;
-- Starmer left the Commons 1 Sep 2026. Each change replaces one exact phrase. If any phrase is not found
-- (text changed since it was checked) the whole update stops and nothing is changed.
DO $do$
DECLARE
  r record;
  bio text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    (4396, $q$Whether that voice has any route back to power under the current leadership is the question she cannot answer alone.$q$, $q$Whether that voice has any route back to power under Andy Burnham's leadership is the question she cannot answer alone.$q$),
    (4491, $q$the resignation closing the door to government under this leadership,$q$, $q$the resignation, which closed the door to government under Starmer's leadership,$q$),
    (4777, $q$the reality that two frontbench resignations mark her as unreliable for a government role under this leadership.$q$, $q$the reality that two frontbench resignations marked her as unreliable for a government role under Starmer's leadership.$q$),
    (5222, $q$calling for the PM's departure closing any door to government under this leadership,$q$, $q$calling for the PM's departure, which closed the door to government under Starmer's leadership,$q$)
  ) AS t(member_id, old_text, new_text) LOOP
    SELECT political_bio INTO bio FROM public.mp_biography WHERE member_id = r.member_id;
    IF bio IS NULL OR position(r.old_text IN bio) = 0 THEN
      RAISE EXCEPTION 'Phrase not found for member %: %', r.member_id, left(r.old_text, 80);
    END IF;
    UPDATE public.mp_biography SET political_bio = replace(political_bio, r.old_text, r.new_text) WHERE member_id = r.member_id;
  END LOOP;
  RAISE NOTICE 'Applied % biography corrections', 4;
END
$do$;
