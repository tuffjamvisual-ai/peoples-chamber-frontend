-- Read-only: every written biography with the MP's party, seat and posts (from the nightly Members API syncs),
-- one JSON object per line, for the template clean-up and the automatic roles/party check. Changes nothing.
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -At -f scripts/export-bios-with-roles.sql > bios-roles.jsonl 2> bios-roles-errors.txt
SELECT json_build_object(
  'id', b.member_id, 'name', m.display_name, 'party', m.party, 'constituency', m.constituency,
  'current', m.current_member, 'visible', b.bio_visible, 'reviewed', b.bio_last_reviewed,
  'gov', coalesce(b.government_posts, '[]'::jsonb), 'opp', coalesce(b.opposition_posts, '[]'::jsonb),
  'bio', b.political_bio)
FROM mp_biography b JOIN mps m ON m.member_id = b.member_id
WHERE coalesce(b.political_bio, '') <> ''
ORDER BY b.member_id;
