-- Read-only: exports every written biography as one JSON object per line, for preparing bulk fixes. Changes nothing.
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -At -f scripts/export-all-bios.sql > bios.jsonl 2> bios-export-errors.txt
SELECT json_build_object('id', b.member_id, 'name', m.display_name, 'party', m.party, 'current', m.current_member, 'bio', b.political_bio)
FROM mp_biography b JOIN mps m ON m.member_id = b.member_id
WHERE coalesce(b.political_bio, '') <> ''
ORDER BY b.member_id;
