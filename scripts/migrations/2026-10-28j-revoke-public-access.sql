-- 2026-10-28j: remove public access to the database (owner's "go", 28 Oct 2026; report 84, Phase 2).
-- Every table, view, materialized view and sequence in schema public loses all privileges for the anon and
-- authenticated roles, which the legacy anon key (now in public git history) uses. The site, the syncs, the scripts
-- and the workflows all use SUPABASE_SECRET_KEY (service_role) since commit b42d5895, which keeps its own grants.
-- New tables made by postgres are no longer granted to anon or authenticated. RLS and its policies are unchanged.
-- Default privileges owned by supabase_admin cannot be changed by postgres; they apply only to objects supabase_admin
-- creates. Undo: 2026-10-28j-UNDO.sql restores the 412 SELECT grants backed up before this ran.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
COMMIT;
