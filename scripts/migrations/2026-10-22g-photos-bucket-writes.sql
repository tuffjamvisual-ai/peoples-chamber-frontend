-- 2026-10-22g: the photos bucket no longer accepts uploads or overwrites with the public key (owner's
-- approval, 22 Oct 2026). Drops "Allow public uploads to photos bucket" (INSERT) and "Allow public updates
-- to photos bucket" (UPDATE) on storage.objects. The photo scripts upload with the service key, which
-- storage policies do not apply to. The bucket stays public, so photos are still served by URL.
-- The definitions are kept in storage_policy_backup_20261022.
\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.storage_policy_backup_20261022') IS NOT NULL THEN RAISE EXCEPTION 'backup table already exists'; END IF;
END $$;

CREATE TABLE public.storage_policy_backup_20261022 AS
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check, now() AS backed_up_at
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname IN ('Allow public uploads to photos bucket', 'Allow public updates to photos bucket');
ALTER TABLE public.storage_policy_backup_20261022 ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.storage_policy_backup_20261022;
  IF n <> 2 THEN RAISE EXCEPTION 'backup has % policies, expected 2', n; END IF;
END $$;

DROP POLICY "Allow public uploads to photos bucket" ON storage.objects;
DROP POLICY "Allow public updates to photos bucket" ON storage.objects;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND (qual ~ 'photos' OR with_check ~ 'photos');
  IF n <> 0 THEN RAISE EXCEPTION '% photos policies still present', n; END IF;
END $$;

SELECT policyname, cmd FROM public.storage_policy_backup_20261022 ORDER BY 1;

COMMIT;
