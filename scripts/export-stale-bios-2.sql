-- Read-only: full written biographies for 5 more MPs flagged by check-stale-phrases.sql. Changes nothing.
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -f scripts/export-stale-bios-2.sql > stale-bios-2.txt 2>&1
\pset format unaligned
\pset tuples_only on
select '##### ' || b.member_id || ' | ' || m.display_name || ' | ' || coalesce(m.party, '') || E'\n' || b.political_bio || E'\n'
from mp_biography b join mps m on m.member_id = b.member_id
where b.member_id in (4396, 4491, 4777, 5222, 5320)
order by b.member_id;
