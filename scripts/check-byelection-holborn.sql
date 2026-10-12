-- Read-only check after the Holborn and St Pancras by-election (8 Oct 2026). Changes nothing.
-- Starmer = member 4514 (left 1 Sep 2026). Abdi-Wali = member 5484 (elected 8 Oct 2026).
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -f scripts/check-byelection-holborn.sql > byelection.txt 2>&1
\x on

\echo '=== 1. mps rows ==='
select member_id, display_name, party, constituency, current_member, start_date, end_date, retirement_pending_since
from mps where member_id in (4514, 5484) order by member_id;

\echo '=== 2. Current MPs for Holborn and St Pancras (should be only 5484) ==='
select member_id, display_name from mps where constituency = 'Holborn and St Pancras' and current_member = true;

\echo '=== 3. mp_biography: written bio and post lists ==='
select member_id, left(political_bio, 500) as political_bio_start, length(b::text) as row_length
from mp_biography b where member_id in (4514, 5484) order by member_id;

\echo '=== 4. mp_contact rows ==='
select member_id, count(*) as rows from mp_contact where member_id in (4514, 5484) group by member_id;

\echo '=== 5. dept_ministers rows for Starmer or Abdi-Wali ==='
select * from dept_ministers d where d.member_id in (4514, 5484) or d::text ilike '%starmer%';

\echo '=== 6. dept_ministers rows mentioning Prime Minister ==='
select * from dept_ministers d where d::text ilike '%prime minister%';

\echo '=== 7. mp_biography rows that still describe Starmer as Prime Minister ==='
select member_id, left(political_bio, 300) as political_bio_start
from mp_biography where political_bio ilike '%starmer%' and political_bio ilike '%prime minister%';
