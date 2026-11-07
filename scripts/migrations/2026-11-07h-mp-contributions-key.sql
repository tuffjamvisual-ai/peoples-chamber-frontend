-- Applied on the owner's yes, 7 Nov 2026 (U2). mp_contributions is keyed by (member_id, debate_website_id, sitting_date), so a
-- debate id Parliament reuses for another sitting cannot replace a real contribution: 75C8A826-17E0-47BD-A4C3-A2DCD01144FB is PMQs
-- "Engagements" on both 21 October and 4 November 2026. NULLS NOT DISTINCT, so a row with no sitting date is still held once.
-- 24,512 rows (13 MB), none sharing the new key; the unique index builds in well under a second. Then Daisy Cooper's (4769)
-- 4 November 2026 row, from Parliament's Members API ContributionSummary as the sync would write it, so both sittings are held.
-- Any other count rolls back. Undo: 2026-11-07h-mp-contributions-key-UNDO.sql.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $key$
DECLARE n integer; before integer;
BEGIN
  SELECT count(*) INTO before FROM public.mp_contributions;
  ALTER TABLE public.mp_contributions DROP CONSTRAINT mp_contributions_member_id_debate_website_id_key;
  ALTER TABLE public.mp_contributions ADD CONSTRAINT mp_contributions_member_debate_sitting_key UNIQUE NULLS NOT DISTINCT (member_id, debate_website_id, sitting_date);
  -- Her 21 October row is untouched (id 94454); the 4 November row is new.
  SELECT count(*) INTO n FROM public.mp_contributions WHERE id = 94454 AND member_id = 4769 AND debate_website_id = '75C8A826-17E0-47BD-A4C3-A2DCD01144FB' AND sitting_date = DATE '2026-10-21';
  IF n <> 1 THEN RAISE EXCEPTION 'expected her 21 October row, found %', n; END IF;
  INSERT INTO public.mp_contributions (member_id, debate_website_id, debate_id, debate_title, sitting_date, section, house, speech_count, question_count,
                                       intervention_count, answer_count, statement_count, total_contributions, hansard_url, updated_at)
  VALUES (4769, '75C8A826-17E0-47BD-A4C3-A2DCD01144FB', 5432332, 'Engagements', DATE '2026-11-04', 'Commons Chamber', 'Commons', 0, 0, 0, 0, 0, 2,
          'https://hansard-api.parliament.uk/Debates/Debate/75C8A826-17E0-47BD-A4C3-A2DCD01144FB.json', now());
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 row inserted, inserted %', n; END IF;
  SELECT count(*) INTO n FROM public.mp_contributions;
  IF n <> before + 1 THEN RAISE EXCEPTION 'expected % rows, found %', before + 1, n; END IF;
END
$key$;
COMMIT;
