-- NOT APPLIED. Puts back the 42 grey colours changed by 2026-11-06e-labour-coop-colour.sql.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.mps SET party_colour = '#808080', updated_at = now()
   WHERE party = 'Labour (Co-op)' AND party_colour = '#E4003B' AND member_id IN (177, 473, 632, 1524, 4040, 4088, 4119, 4253, 4263, 4264, 4268, 4449, 4471, 4515, 4569, 4595, 4603, 4641, 4657, 4658, 4673, 4682, 4797, 4870, 4943, 5029, 5071, 5099, 5114, 5131, 5133, 5135, 5154, 5176, 5178, 5179, 5192, 5224, 5237, 5243, 5257, 5279);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 42 THEN RAISE EXCEPTION 'expected 42 rows, changed %', n; END IF;
END $$;
COMMIT;
