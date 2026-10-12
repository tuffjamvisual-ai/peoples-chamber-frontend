-- Read-only: full written biographies for the 14 MPs whose text treats Starmer as still in office. Changes nothing.
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -f scripts/export-stale-bios.sql > stale-bios.txt 2>&1
\pset format unaligned
\pset tuples_only on
select '##### ' || b.member_id || ' | ' || m.display_name || E'\n' || b.political_bio || E'\n'
from mp_biography b join mps m on m.member_id = b.member_id
where b.member_id in (4514, 4268, 4479, 4493, 4623, 4716, 4747, 4828, 4873, 5065, 5154, 5178, 5215, 5221)
order by b.member_id;
