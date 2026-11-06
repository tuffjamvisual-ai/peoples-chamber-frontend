-- NOT APPLIED. Puts back the values changed by 2026-11-06d-mps-party-labels.sql.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE n integer; total integer := 0;
BEGIN
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 172 AND party = 'Labour' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Ms Diane Abbott
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 178 AND party = 'Labour' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- John McDonnell
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Your Party', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 185 AND party = 'Your Party' AND party_abbreviation = 'YP' AND party_colour = '#808080'; -- Jeremy Corbyn
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 4030 AND party = 'Labour' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Karl Turner
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 4394 AND party = 'Labour' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Imran Hussain
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 4493 AND party = 'Labour' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Richard Burgon
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Independent', party_abbreviation = 'DUP', party_colour = '#D46A4C', updated_at = now()
   WHERE member_id = 4857 AND party = 'Independent' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Carla Lockhart
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 5079 AND party = 'Labour' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Joani Reid
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Independent', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 5097 AND party = 'Independent' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Mr Bayo Alaba
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour (Co-op)', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 5144 AND party = 'Labour' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Richard Quigley
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Restore Britain', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 5158 AND party = 'Restore Britain' AND party_abbreviation = 'RB' AND party_colour = '#808080'; -- Rupert Lowe
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Independent', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 5208 AND party = 'Independent' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Perran Moon
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour (Co-op)', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 5210 AND party = 'Labour' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Tom Hayes
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Conservative', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 5303 AND party = 'Conservative' AND party_abbreviation = 'Con' AND party_colour = '#0087DC'; -- Patrick Spencer
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Independent', party_abbreviation = 'LD', party_colour = '#FAA61A', updated_at = now()
   WHERE member_id = 5354 AND party = 'Independent' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Cameron Thomas
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  IF total <> 15 THEN RAISE EXCEPTION 'expected 15 rows, changed %', total; END IF;
END $$;
COMMIT;
