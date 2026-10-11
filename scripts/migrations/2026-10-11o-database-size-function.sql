-- Database size for the disk warning in /api/monitor-freshness (lib/database-size.ts).
--
-- get_database_size() returns two figures, in bytes:
--   database_bytes  the Postgres data size (tables, indexes, materialised views),
--                   the same measure Supabase reports as "database size"
--   wal_bytes       the write-ahead log, which counts towards disk but not database size
--
-- Read-only. SECURITY DEFINER so it runs as the function owner (postgres), which
-- can read the WAL directory; if that read is refused, wal_bytes is NULL and the
-- monitor uses the database size alone. service_role only: anon and authenticated
-- are explicitly revoked, so the public can't call it.

CREATE OR REPLACE FUNCTION public.get_database_size()
  RETURNS TABLE(database_bytes bigint, wal_bytes bigint)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  db  bigint;
  wal bigint;
BEGIN
  SELECT sum(pg_database_size(datname))::bigint INTO db FROM pg_database;
  BEGIN
    SELECT sum(size)::bigint INTO wal FROM pg_ls_waldir();
  EXCEPTION WHEN OTHERS THEN
    wal := NULL;
  END;
  RETURN QUERY SELECT db, wal;
END;
$$;

REVOKE ALL ON FUNCTION public.get_database_size() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_database_size() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_database_size() TO service_role;
