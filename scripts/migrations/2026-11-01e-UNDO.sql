-- 2026-11-01e UNDO: puts back is_rebellion = true on the 317 teller rows changed by 2026-11-01e-teller-not-rebel.sql
-- (ids from the backup off the repo, "Claude outputs/backups/2026-11-01e-teller-rebellion-before.csv"), each only WHERE
-- it is still a teller row with is_rebellion = false; restores apply_division_parties() exactly as it was before; and
-- rebuilds the same stored totals (party_member_vote_stats, mp_vote_counts_stored, mp_activity_metrics).
-- Guards (RAISE): exactly 317 rows change; 317 teller rebels afterwards; every other column and row unchanged;
-- rebellion rows rise by exactly 317; the function no longer holds the teller rule.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE tnu_before ON COMMIT DROP AS
  SELECT count(*) AS n, sum(('x' || substr(md5((to_jsonb(v) - 'is_rebellion')::text), 1, 15))::bit(60)::bigint)::numeric AS checksum,
         count(*) FILTER (WHERE is_rebellion) AS rebels
    FROM public.mp_division_votes v;
CREATE TEMP TABLE tnu_changed (n integer) ON COMMIT DROP;

DO $$
DECLARE
  changed integer;
BEGIN
  UPDATE public.mp_division_votes SET is_rebellion = true
   WHERE is_teller AND is_rebellion IS FALSE AND id IN (
  495403, 495404, 590265, 590266, 596503, 596504, 596944, 599097, 599098, 600357, 600853, 601339, 601564, 602048, 602524, 602525, 608935, 608936, 609386, 609387,
  609877, 609878, 613014, 619601, 620407, 620408, 627955, 630142, 630143, 638066, 638067, 657831, 657832, 666939, 666940, 683549, 683550, 686550, 691892, 691893,
  714068, 714069, 721410, 721411, 733543, 733544, 733682, 733683, 738874, 738875, 746710, 746711, 749914, 749915, 751754, 751755, 766643, 766644, 766936, 766937,
  793089, 793090, 793370, 793371, 800185, 800186, 800678, 800679, 828348, 828349, 828811, 828812, 838310, 838311, 842605, 842606, 860602, 860603, 866734, 866735,
  866876, 866877, 867014, 867015, 867156, 867157, 867300, 867301, 887348, 887349, 896537, 896538, 909469, 926803, 936146, 936147, 937039, 937040, 938993, 938994,
  939052, 939053, 963021, 963022, 965263, 965264, 965505, 965506, 965683, 965684, 969302, 969303, 977242, 977289, 977290, 1002076, 1002077, 1005703, 1005704, 1015389,
  1015390, 1015864, 1015865, 1015951, 1015952, 1016826, 1016827, 1017562, 1017563, 1018197, 1018198, 1026059, 1026060, 1036536, 1036537, 1040225, 1040226, 1043878, 1043879, 1049501,
  1049502, 1077699, 1077700, 1078612, 1092069, 1092070, 1099340, 1099341, 1101754, 1101755, 1113289, 1113290, 1115820, 1115821, 1131260, 1131261, 1132237, 1132238, 1134587, 1141176,
  1146027, 1149258, 1149259, 1150274, 1156599, 1156600, 1177343, 1177344, 1177841, 1177842, 1178328, 1178329, 1179605, 1179606, 1179802, 1179803, 1184914, 1185748, 1185749, 1188734,
  1188735, 1189195, 1189196, 1194665, 1194666, 1202242, 1202243, 1211030, 1211031, 1215618, 1215619, 1220910, 1220911, 1221478, 1221479, 1224023, 1234679, 1234680, 1235298, 1235299,
  1235851, 1235852, 1237283, 1237284, 1252316, 1270200, 1270201, 1272016, 1274694, 1274695, 1279647, 1279648, 1279904, 1279905, 1282605, 1282606, 1282872, 1282873, 1289211, 1289212,
  1289424, 1289425, 1297259, 1297260, 1297541, 1297542, 1307699, 1307700, 1315806, 1315807, 1318406, 1318407, 1318450, 1320049, 1320050, 1324853, 1324854, 1325671, 1325672, 1348220,
  1348221, 1350574, 1350575, 1380910, 1380911, 1380912, 1380913, 1388301, 1388302, 1388495, 1388496, 1391091, 1391092, 1393459, 1393460, 1398916, 1398917, 1402486, 1402487, 1409692,
  1409693, 1420078, 1431739, 1431740, 1435282, 1457113, 1457114, 1460556, 1460557, 1464785, 1464786, 1469610, 1469611, 1470265, 1470266, 1473001, 1473002, 1481945, 1481946, 1498233,
  1498234, 1500863, 1500864, 1505675, 1505676, 1520781, 1520782, 1523459, 1523460, 1524100, 1524101, 1524590, 1524591, 1530702, 1530703, 1530978, 1530979, 1537917, 1537918, 1554308,
  1554309, 1556603, 1556604, 1562514, 1562515, 1566616, 1566617, 1569571, 1569572, 1570765, 1570766, 1579725, 1579726, 1580237, 1580238, 1585194, 1585195);
  GET DIAGNOSTICS changed = ROW_COUNT;
  INSERT INTO tnu_changed VALUES (changed);
END $$;

CREATE OR REPLACE FUNCTION public.apply_division_parties(p_division_id integer, p_members jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_set integer;
  v_rows integer;
  v_with_party integer;
  v_rebels integer;
BEGIN
  UPDATE mp_division_votes v
     SET party = x.party
    FROM jsonb_to_recordset(p_members) AS x(member_id integer, party text)
   WHERE v.division_id = p_division_id
     AND v.member_id = x.member_id
     AND nullif(trim(x.party), '') IS NOT NULL
     AND v.party IS DISTINCT FROM x.party;
  GET DIAGNOSTICS v_set = ROW_COUNT;

  WITH split AS (
    SELECT party,
           count(*) FILTER (WHERE vote_type = 'aye' AND NOT coalesce(is_teller, false)) AS ayes,
           count(*) FILTER (WHERE vote_type = 'no'  AND NOT coalesce(is_teller, false)) AS noes
      FROM mp_division_votes
     WHERE division_id = p_division_id
       AND party IS NOT NULL
       AND party NOT ILIKE 'Independent%'
       AND party <> 'Speaker'
     GROUP BY party
  ), side AS (
    SELECT party, CASE WHEN ayes > noes THEN 'aye' WHEN noes > ayes THEN 'no' END AS side FROM split
  ), flag AS (
    SELECT v2.id, (s.side IS NOT NULL AND v2.vote_type IN ('aye', 'no') AND v2.vote_type <> s.side) AS rebel
      FROM mp_division_votes v2
      LEFT JOIN side s ON s.party = v2.party
     WHERE v2.division_id = p_division_id
  )
  UPDATE mp_division_votes v
     SET is_rebellion = f.rebel
    FROM flag f
   WHERE v.id = f.id
     AND v.is_rebellion IS DISTINCT FROM f.rebel;

  SELECT count(*), count(party), count(*) FILTER (WHERE is_rebellion)
    INTO v_rows, v_with_party, v_rebels
    FROM mp_division_votes WHERE division_id = p_division_id;

  UPDATE commons_division_totals SET parties_applied_at = now() WHERE division_id = p_division_id;

  RETURN jsonb_build_object('division_id', p_division_id, 'party_set', v_set, 'rows', v_rows,
                            'rows_with_party', v_with_party, 'rebellions', v_rebels);
END $function$;

REFRESH MATERIALIZED VIEW CONCURRENTLY public.party_member_vote_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mp_vote_counts_stored;
SELECT public.recompute_mp_activity_metrics() IS NOT NULL AS activity_metrics_recomputed;

DO $$
DECLARE
  b record;
  a record;
  changed integer;
BEGIN
  SELECT * INTO b FROM tnu_before;
  SELECT n INTO changed FROM tnu_changed;
  SELECT count(*) AS n, sum(('x' || substr(md5((to_jsonb(v) - 'is_rebellion')::text), 1, 15))::bit(60)::bigint)::numeric AS checksum,
         count(*) FILTER (WHERE is_teller AND is_rebellion) AS teller_rebels,
         count(*) FILTER (WHERE is_rebellion) AS rebels
    INTO a FROM public.mp_division_votes v;
  RAISE NOTICE 'UNDO: rows changed %, teller rebels after %, rebellion rows % to %, other columns unchanged %', changed, a.teller_rebels, b.rebels, a.rebels, (a.checksum = b.checksum);
  IF changed <> 317 THEN RAISE EXCEPTION 'expected exactly 317 rows changed, got %', changed; END IF;
  IF a.teller_rebels <> 317 THEN RAISE EXCEPTION 'expected 317 teller rebels after the undo, got %', a.teller_rebels; END IF;
  IF a.n <> b.n OR a.checksum <> b.checksum THEN RAISE EXCEPTION 'a row or a column other than is_rebellion changed'; END IF;
  IF a.rebels <> b.rebels + 317 THEN RAISE EXCEPTION 'rebellion rows % to %, expected a rise of 317', b.rebels, a.rebels; END IF;
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.apply_division_parties(integer, jsonb)'::regprocedure) ILIKE '%is_teller, false)) AS rebel%' THEN
    RAISE EXCEPTION 'apply_division_parties still holds the teller rule';
  END IF;
END $$;

COMMIT;
