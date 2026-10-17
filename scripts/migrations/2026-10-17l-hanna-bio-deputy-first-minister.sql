-- Claire Hanna's biography called Emma Little-Pengelly "now First Minister of Northern Ireland".
-- She became deputy First Minister on 3 February 2024, when the Executive was restored (NI Assembly member record).
-- Only political_bio changes; review dates, sources, visibility and flags are left alone.
\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE public.mp_biography_backup_20261017l AS
  SELECT member_id, political_bio, now() AS backed_up_at FROM public.mp_biography WHERE member_id = 4827;
ALTER TABLE public.mp_biography_backup_20261017l ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mp_biography_backup_20261017l FROM anon, authenticated;

DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT political_bio INTO v FROM public.mp_biography WHERE member_id = 4827;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Emma Little-Pengelly, now First Minister of Northern Ireland,$t$, ''))) / length($t$Emma Little-Pengelly, now First Minister of Northern Ireland,$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'member 4827: phrase found % times', c; END IF;
  UPDATE public.mp_biography
     SET political_bio = replace(political_bio, $t$Emma Little-Pengelly, now First Minister of Northern Ireland,$t$, $t$Emma Little-Pengelly, who became deputy First Minister of Northern Ireland in February 2024,$t$)
   WHERE member_id = 4827;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'member 4827: % rows', n; END IF;
END $do$;

COMMIT;
