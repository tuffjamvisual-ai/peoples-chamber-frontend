-- 2026-10-23f: revoke unused write grants from anon and authenticated (owner's approval, 23 Oct 2026).
-- Supabase's default privileges gave both roles INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER on every
-- table, and USAGE and UPDATE on every sequence. Row level security blocks all of those writes (no write policy exists
-- for either role) and the site writes only with the service key, so the grants are unused. Revoking them means a
-- future permissive policy, or RLS left off on a new table, does not open the table to anyone holding the public key.
-- Kept: SELECT on tables, views and sequences (pages read through RLS), MAINTAIN, and every function EXECUTE grant and
-- function default (pages call functions as anon). The supabase_admin default privileges cannot be changed from the
-- postgres role, so tables that role creates still get the old grants.
-- Every privilege removed is kept in grants_backup_20261023f; 2026-10-23f-UNDO.sql puts them all back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regclass('public.grants_backup_20261023f') IS NOT NULL THEN RAISE EXCEPTION 'grants_backup_20261023f already exists'; END IF;
END $$;

-- 1. Snapshot: every table, view and sequence privilege the two roles hold, and the postgres default privileges.
CREATE TABLE public.grants_backup_20261023f AS
  SELECT CASE c.relkind WHEN 'S' THEN 'sequence' WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized view' ELSE 'table' END AS object_kind,
         c.relname AS object_name, a.grantee::regrole::text AS grantee, a.privilege_type, a.is_grantable,
         pg_get_userbyid(a.grantor) AS grantor, now() AS backed_up_at
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S') AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole)
  UNION ALL
  SELECT 'default privileges: ' || CASE d.defaclobjtype WHEN 'r' THEN 'tables' WHEN 'S' THEN 'sequences' WHEN 'f' THEN 'functions' ELSE d.defaclobjtype::text END,
         pg_get_userbyid(d.defaclrole), a.grantee::regrole::text, a.privilege_type, a.is_grantable, pg_get_userbyid(a.grantor), now()
  FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace, aclexplode(d.defaclacl) a
  WHERE n.nspname = 'public' AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole);
ALTER TABLE public.grants_backup_20261023f ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grants_backup_20261023f FROM anon, authenticated;

CREATE TEMP TABLE anon_select_before ON COMMIT DROP AS
  SELECT count(*) AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f') AND c.relname <> 'grants_backup_20261023f'
    AND has_table_privilege('anon', c.oid, 'SELECT');
CREATE TEMP TABLE service_role_before ON COMMIT DROP AS
  SELECT c.relname, a.privilege_type FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S') AND c.relname <> 'grants_backup_20261023f'
    AND a.grantee = 'service_role'::regrole;

-- 2a. Tables, views and materialized views: no writes for either role. SELECT is kept.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- 2b. Sequences: no nextval or setval. SELECT is kept (no page reads a sequence).
REVOKE USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
-- 2c. New tables and sequences the postgres role creates get no write grants for these roles either.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE USAGE, UPDATE ON SEQUENCES FROM anon, authenticated;

-- 2d. Checks.
DO $$
DECLARE writable int; sel_after int; sel_before int; sr_diff int; seq_left int;
BEGIN
  SELECT count(*) INTO writable FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
    AND (has_table_privilege('anon', c.oid, 'INSERT') OR has_table_privilege('anon', c.oid, 'UPDATE')
      OR has_table_privilege('anon', c.oid, 'DELETE') OR has_table_privilege('anon', c.oid, 'TRUNCATE')
      OR has_table_privilege('authenticated', c.oid, 'INSERT') OR has_table_privilege('authenticated', c.oid, 'UPDATE')
      OR has_table_privilege('authenticated', c.oid, 'DELETE') OR has_table_privilege('authenticated', c.oid, 'TRUNCATE'));
  IF writable <> 0 THEN RAISE EXCEPTION '% tables still writable by anon or authenticated', writable; END IF;

  SELECT count(*) INTO seq_left FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'S'
    AND (has_sequence_privilege('anon', c.oid, 'USAGE') OR has_sequence_privilege('anon', c.oid, 'UPDATE')
      OR has_sequence_privilege('authenticated', c.oid, 'USAGE') OR has_sequence_privilege('authenticated', c.oid, 'UPDATE'));
  IF seq_left <> 0 THEN RAISE EXCEPTION '% sequences still usable by anon or authenticated', seq_left; END IF;

  SELECT n INTO sel_before FROM anon_select_before;
  SELECT count(*) INTO sel_after FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f') AND c.relname <> 'grants_backup_20261023f'
    AND has_table_privilege('anon', c.oid, 'SELECT');
  IF sel_after <> sel_before THEN RAISE EXCEPTION 'anon SELECT changed: % before, % after', sel_before, sel_after; END IF;

  SELECT count(*) INTO sr_diff FROM (
    (SELECT * FROM service_role_before EXCEPT ALL
     SELECT c.relname, a.privilege_type FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
     WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S') AND c.relname <> 'grants_backup_20261023f'
       AND a.grantee = 'service_role'::regrole)
    UNION ALL
    (SELECT c.relname, a.privilege_type FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
     WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S') AND c.relname <> 'grants_backup_20261023f'
       AND a.grantee = 'service_role'::regrole
     EXCEPT ALL SELECT * FROM service_role_before)) d;
  IF sr_diff <> 0 THEN RAISE EXCEPTION 'service_role privileges changed in % places', sr_diff; END IF;

  IF has_table_privilege('anon', 'public.grants_backup_20261023f', 'SELECT') THEN RAISE EXCEPTION 'anon can read the backup'; END IF;
END $$;

SELECT 'privileges backed up' AS step, count(*) AS n FROM public.grants_backup_20261023f
UNION ALL SELECT 'write privileges removed (tables, views)', count(*) FROM public.grants_backup_20261023f
  WHERE object_kind IN ('table','view','materialized view') AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
UNION ALL SELECT 'sequence privileges removed', count(*) FROM public.grants_backup_20261023f
  WHERE object_kind = 'sequence' AND privilege_type IN ('USAGE','UPDATE')
UNION ALL SELECT 'anon SELECT on tables and views (unchanged)', (SELECT n FROM anon_select_before)
UNION ALL SELECT 'service_role privileges (unchanged)', (SELECT count(*) FROM service_role_before);

COMMIT;
