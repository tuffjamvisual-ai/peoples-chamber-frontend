-- Read-only database size check. Changes nothing.
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -f scripts/check-database-size.sql > dbsize.txt 2>&1

\echo '=== 1. Total database size (Supabase compares this with the plan limit) ==='
select pg_size_pretty(sum(pg_database_size(datname))) as total_database_size,
       round(sum(pg_database_size(datname)) / 1024.0 / 1024.0, 1) as total_mb
from pg_database;

\echo '=== 2. Size by schema ==='
select n.nspname as schema,
       pg_size_pretty(sum(pg_total_relation_size(c.oid))) as total_size,
       round(sum(pg_total_relation_size(c.oid)) / 1024.0 / 1024.0, 1) as total_mb
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'm')
group by n.nspname
order by sum(pg_total_relation_size(c.oid)) desc;

\echo '=== 3. 25 largest tables ==='
select n.nspname || '.' || c.relname as table_name,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
       pg_size_pretty(pg_relation_size(c.oid)) as data_size,
       pg_size_pretty(pg_indexes_size(c.oid)) as index_size,
       round(pg_total_relation_size(c.oid) / 1024.0 / 1024.0, 1) as total_mb,
       c.reltuples::bigint as approx_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'm')
order by pg_total_relation_size(c.oid) desc
limit 25;

\echo '=== 4. Tables with the most dead (deleted or replaced, not yet reclaimed) rows ==='
select schemaname || '.' || relname as table_name,
       n_live_tup as live_rows,
       n_dead_tup as dead_rows,
       last_autovacuum
from pg_stat_user_tables
order by n_dead_tup desc
limit 10;

\echo '=== 5. WAL size (counts towards disk, not the database size limit; may say permission denied) ==='
select pg_size_pretty(sum(size)) as wal_size from pg_ls_waldir();
