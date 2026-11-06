-- Applied to production on 6 Nov 2026 at 11:21:28 GMT, on the owner's yes.
-- mps party fields to match Parliament's Members API, read 6 Nov 2026. Two labels change (Tom Hayes and Richard Quigley,
-- "Labour (Co-op)" to "Labour"); 13 other MPs have the right label but an out of date abbreviation, and most of them a colour,
-- from before a party change. Colours are the roster sync's. Corbyn's and Lowe's parties have no colour there, so they keep grey.
-- All or none: each WHERE names the id and the old values, and the block stops on any other count.
-- Backup: "Claude outputs/backups/mps-party-fields-before-2026-11-06.csv". Undo: 2026-11-06d-mps-party-labels-UNDO.sql
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE n integer; total integer := 0;
BEGIN
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 172 AND party = 'Labour' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Ms Diane Abbott
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 178 AND party = 'Labour' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- John McDonnell
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Your Party', party_abbreviation = 'YP', party_colour = '#808080', updated_at = now()
   WHERE member_id = 185 AND party = 'Your Party' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Jeremy Corbyn
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 4030 AND party = 'Labour' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Karl Turner
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 4394 AND party = 'Labour' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Imran Hussain
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 4493 AND party = 'Labour' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Richard Burgon
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Independent', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 4857 AND party = 'Independent' AND party_abbreviation = 'DUP' AND party_colour = '#D46A4C'; -- Carla Lockhart
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 5079 AND party = 'Labour' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Joani Reid
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Independent', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 5097 AND party = 'Independent' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Mr Bayo Alaba
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 5144 AND party = 'Labour (Co-op)' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Richard Quigley
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Restore Britain', party_abbreviation = 'RB', party_colour = '#808080', updated_at = now()
   WHERE member_id = 5158 AND party = 'Restore Britain' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Rupert Lowe
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Independent', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 5208 AND party = 'Independent' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Perran Moon
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Labour', party_abbreviation = 'Lab', party_colour = '#E4003B', updated_at = now()
   WHERE member_id = 5210 AND party = 'Labour (Co-op)' AND party_abbreviation = 'Lab' AND party_colour = '#E4003B'; -- Tom Hayes
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Conservative', party_abbreviation = 'Con', party_colour = '#0087DC', updated_at = now()
   WHERE member_id = 5303 AND party = 'Conservative' AND party_abbreviation = 'Ind' AND party_colour = '#808080'; -- Patrick Spencer
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  UPDATE public.mps SET party = 'Independent', party_abbreviation = 'Ind', party_colour = '#808080', updated_at = now()
   WHERE member_id = 5354 AND party = 'Independent' AND party_abbreviation = 'LD' AND party_colour = '#FAA61A'; -- Cameron Thomas
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  IF total <> 15 THEN RAISE EXCEPTION 'expected 15 rows, changed %', total; END IF;
END $$;
COMMIT;
