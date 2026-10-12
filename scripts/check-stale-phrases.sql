-- Read-only: sentences in written biographies that may still treat Starmer's leadership as current. Changes nothing.
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -f scripts/check-stale-phrases.sql > stale-phrases.txt 2>&1
select b.member_id, m.display_name, s[1] as sentence
from mp_biography b join mps m on m.member_id = b.member_id
cross join lateral regexp_matches(
  b.political_bio,
  '[^.!?\n]*(under this leadership|under the current leadership|this Prime Minister|the current Prime Minister|current leader|Starmer government to date|has been Prime Minister since)[^.!?\n]*[.!?]?',
  'gi') as s
order by b.member_id;
