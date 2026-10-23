-- 2026-10-23g: tighten the remaining anon and authenticated privileges in schema public (owner's approval, 23 Oct 2026).
-- After 2026-10-23f both roles still held MAINTAIN (VACUUM, ANALYZE, REINDEX, REFRESH MATERIALIZED VIEW, CLUSTER,
-- LOCK TABLE) on every table, view and materialized view, and SELECT on every sequence, and the postgres default
-- privileges gave the same to new objects. No page needs either. This removes them from existing objects and from the
-- postgres defaults. Kept: SELECT on tables, views and materialized views for both roles (pages read through RLS),
-- SELECT on new tables, and every function EXECUTE grant and function default (pages call functions as anon).
-- The supabase_admin default privileges cannot be changed from the postgres role.
-- Every anon and authenticated privilege and default privilege in schema public is kept in grants_backup_20261023g;
-- 2026-10-23g-UNDO.sql puts back the ones this removes.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF to_regclass('public.grants_backup_20261023g') IS NOT NULL THEN RAISE EXCEPTION 'grants_backup_20261023g already exists'; END IF;
END $$;

-- 1. Backup: every table, view, sequence and function privilege the two roles hold in schema public, and every default
-- privilege they get there.
CREATE TABLE public.grants_backup_20261023g AS
  SELECT CASE c.relkind WHEN 'S' THEN 'sequence' WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized view' ELSE 'table' END AS object_kind,
         c.relname AS object_name, a.grantee::regrole::text AS grantee, a.privilege_type, a.is_grantable,
         pg_get_userbyid(a.grantor) AS grantor, now() AS backed_up_at
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S') AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole)
  UNION ALL
  SELECT 'function', p.oid::regprocedure::text, a.grantee::regrole::text, a.privilege_type, a.is_grantable, pg_get_userbyid(a.grantor), now()
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace, aclexplode(p.proacl) a
  WHERE n.nspname = 'public' AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole)
  UNION ALL
  SELECT 'default privileges: ' || CASE d.defaclobjtype WHEN 'r' THEN 'tables' WHEN 'S' THEN 'sequences' WHEN 'f' THEN 'functions' ELSE d.defaclobjtype::text END,
         pg_get_userbyid(d.defaclrole), a.grantee::regrole::text, a.privilege_type, a.is_grantable, pg_get_userbyid(a.grantor), now()
  FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace, aclexplode(d.defaclacl) a
  WHERE n.nspname = 'public' AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole);
ALTER TABLE public.grants_backup_20261023g ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grants_backup_20261023g FROM anon, authenticated;

-- 2. Existing tables, views and materialized views: no MAINTAIN for either role.
REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- 3. Existing sequences: nothing for either role.
REVOKE SELECT ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
-- 4. New tables the postgres role creates: SELECT only. New sequences: nothing. Function defaults are left alone.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE MAINTAIN ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- 5. Checks. Any failure raises, and the whole migration rolls back.
DO $$
DECLARE anon_sel int; sr int; writes int; maint int; seqs int; fn_before int; fn_after int; def_tables text; def_seqs int;
BEGIN
  SELECT count(*) INTO anon_sel FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f') AND c.relname NOT LIKE 'grants\_backup\_%'
    AND has_table_privilege('anon', c.oid, 'SELECT');
  IF anon_sel <> 195 THEN RAISE EXCEPTION 'anon SELECT on tables and views is %, expected 195', anon_sel; END IF;

  SELECT count(*) INTO sr FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S') AND c.relname NOT LIKE 'grants\_backup\_%'
    AND a.grantee = 'service_role'::regrole;
  IF sr <> 2056 THEN RAISE EXCEPTION 'service_role privileges on tables, views and sequences are %, expected 2056', sr; END IF;

  SELECT count(*) INTO writes FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S') AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole, 0::oid)
    AND a.privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','USAGE');
  IF writes <> 0 THEN RAISE EXCEPTION '% write privileges held by anon, authenticated or PUBLIC', writes; END IF;

  SELECT count(*) INTO maint FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
  WHERE n.nspname = 'public' AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole) AND a.privilege_type = 'MAINTAIN';
  IF maint <> 0 THEN RAISE EXCEPTION '% MAINTAIN privileges left', maint; END IF;

  SELECT count(*) INTO seqs FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
  WHERE n.nspname = 'public' AND c.relkind = 'S' AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole);
  IF seqs <> 0 THEN RAISE EXCEPTION '% sequence privileges left', seqs; END IF;

  SELECT count(*) INTO fn_before FROM public.grants_backup_20261023g WHERE object_kind = 'function';
  SELECT count(*) INTO fn_after FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace, aclexplode(p.proacl) a
  WHERE n.nspname = 'public' AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole);
  IF fn_after <> fn_before THEN RAISE EXCEPTION 'function grants changed: % before, % after', fn_before, fn_after; END IF;

  SELECT string_agg(a.grantee::regrole::text || ':' || a.privilege_type, ',' ORDER BY 1) INTO def_tables
  FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace, aclexplode(d.defaclacl) a
  WHERE n.nspname = 'public' AND d.defaclrole = 'postgres'::regrole AND d.defaclobjtype = 'r'
    AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole);
  IF def_tables IS DISTINCT FROM 'anon:SELECT,authenticated:SELECT' THEN RAISE EXCEPTION 'table defaults are %', def_tables; END IF;

  SELECT count(*) INTO def_seqs FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace, aclexplode(d.defaclacl) a
  WHERE n.nspname = 'public' AND d.defaclrole = 'postgres'::regrole AND d.defaclobjtype = 'S'
    AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole);
  IF def_seqs <> 0 THEN RAISE EXCEPTION '% sequence defaults left', def_seqs; END IF;

  IF has_table_privilege('anon', 'public.grants_backup_20261023g', 'SELECT')
    OR has_table_privilege('authenticated', 'public.grants_backup_20261023g', 'SELECT') THEN RAISE EXCEPTION 'the backup is readable'; END IF;
END $$;

SELECT 'privileges backed up' AS step, count(*) AS n FROM public.grants_backup_20261023g
UNION ALL SELECT 'MAINTAIN removed (tables, views, materialized views)', count(*) FROM public.grants_backup_20261023g
  WHERE object_kind IN ('table','view','materialized view') AND privilege_type = 'MAINTAIN'
UNION ALL SELECT 'SELECT removed (sequences)', count(*) FROM public.grants_backup_20261023g
  WHERE object_kind = 'sequence' AND privilege_type = 'SELECT'
UNION ALL SELECT 'postgres default privileges removed', count(*) FROM public.grants_backup_20261023g
  WHERE object_name = 'postgres' AND ((object_kind = 'default privileges: tables' AND privilege_type = 'MAINTAIN') OR object_kind = 'default privileges: sequences');

COMMIT;
