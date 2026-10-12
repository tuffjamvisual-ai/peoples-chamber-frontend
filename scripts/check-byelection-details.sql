-- Read-only, part 2 of the by-election check. Changes nothing.
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -f scripts/check-byelection-details.sql > byelection2.txt 2>&1

\echo '=== 1. mp_contact columns ==='
select column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public' and table_name = 'mp_contact' order by ordinal_position;

\echo '=== 2. mp_biography columns ==='
select column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public' and table_name = 'mp_biography' order by ordinal_position;

\echo '=== 3. Unique keys on mp_contact and mp_biography ==='
select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename in ('mp_contact', 'mp_biography');

\echo '=== 4. Sample mp_contact row (one current MP) ==='
\x on
select c.* from mp_contact c join mps m on m.member_id = c.member_id where m.current_member limit 1;
\x off

\echo '=== 5. Current MPs with no mp_biography row / no mp_contact row ==='
select m.member_id, m.display_name,
       (b.member_id is null) as no_biography_row,
       (c.member_id is null) as no_contact_row
from mps m
left join mp_biography b on b.member_id = m.member_id
left join mp_contact c on c.member_id = m.member_id
where m.current_member and (b.member_id is null or c.member_id is null)
order by m.member_id;

\echo '=== 6. Every sentence mentioning Starmer in a written biography ==='
select b.member_id, m.display_name, m.current_member, s[1] as sentence
from mp_biography b
join mps m on m.member_id = b.member_id
cross join lateral regexp_matches(b.political_bio, '[^.!?\n]*Starmer[^.!?\n]*[.!?]?', 'g') as s
order by b.member_id;
