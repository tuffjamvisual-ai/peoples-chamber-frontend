-- Hide the written biography on every MP profile (John's decision, 18 Oct 2026),
-- until biographies are rewritten to the record only standard. The rest of each
-- profile is unchanged. Only mp_biography.bio_visible changes; the text, sources
-- and review dates are kept. Fully reversible from the backup:
--   UPDATE public.mp_biography b SET bio_visible = k.bio_visible
--   FROM public.mp_biography_visible_backup_20261018f k WHERE k.member_id = b.member_id;
\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE public.mp_biography_visible_backup_20261018f AS
  SELECT member_id, bio_visible, now() AS saved_at FROM public.mp_biography;
ALTER TABLE public.mp_biography_visible_backup_20261018f ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mp_biography_visible_backup_20261018f FROM anon, authenticated;
UPDATE public.mp_biography SET bio_visible = false WHERE bio_visible IS DISTINCT FROM false;
DO $do$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.mp_biography WHERE bio_visible IS DISTINCT FROM false;
  IF n <> 0 THEN RAISE EXCEPTION 'still visible: %', n; END IF;
END $do$;
SELECT (SELECT count(*) FROM public.mp_biography) AS biographies,
       (SELECT count(*) FROM public.mp_biography_visible_backup_20261018f WHERE bio_visible) AS were_visible;
COMMIT;
