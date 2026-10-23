-- RLS guard (23 Oct 2026). Read only. Lists every public table with row level security off, and every public table,
-- view or materialized view that anon or authenticated can write to (directly or through PUBLIC). No rows means clean.
-- Run: psql "$DATABASE_URL" -f scripts/checks/rls-guard.sql
\set ON_ERROR_STOP on
BEGIN READ ONLY;

SELECT c.relname AS object_name,
       CASE c.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized view' WHEN 'f' THEN 'foreign table' ELSE 'table' END AS kind,
       concat_ws('; ',
         CASE WHEN c.relkind IN ('r','p') AND NOT c.relrowsecurity THEN 'row level security off' END,
         CASE WHEN w.anon IS NOT NULL THEN 'anon can ' || w.anon END,
         CASE WHEN w.auth IS NOT NULL THEN 'authenticated can ' || w.auth END) AS problem
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL (
  SELECT (SELECT string_agg(p, ', ') FROM unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
          WHERE has_table_privilege('anon', c.oid, p)) AS anon,
         (SELECT string_agg(p, ', ') FROM unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
          WHERE has_table_privilege('authenticated', c.oid, p)) AS auth
) w
WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
  AND ((c.relkind IN ('r','p') AND NOT c.relrowsecurity) OR w.anon IS NOT NULL OR w.auth IS NOT NULL)
ORDER BY c.relname;

SELECT count(*) FILTER (WHERE c.relkind IN ('r','p')) AS tables_checked,
       count(*) FILTER (WHERE c.relkind IN ('v','m','f')) AS views_checked,
       count(*) FILTER (WHERE c.relkind IN ('r','p') AND NOT c.relrowsecurity) AS rls_off
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f');

ROLLBACK;
