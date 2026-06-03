-- May 2026 election cycle marker. Bumps last_election_year and flags
-- London boroughs as 'post-2026 review pending' so the per-page render
-- can show "control as of 2022; 2026 result pending review" rather
-- than pretending the elections didn't happen. Replace with confirmed
-- post-2026 political_control once results are ingested.

BEGIN;
UPDATE councils 
SET last_election_year = 2026,
    political_control_status = COALESCE(political_control_status, 'post-2026 review pending')
WHERE type = 'lon-borough';
UPDATE councils
SET political_control_status = 'post-2026 review pending'
WHERE type = 'lon-borough' AND political_control IS NOT NULL;
UPDATE councils SET last_election_year = 2026 
WHERE type = 'met-borough' AND last_election_year < 2026;
COMMIT;
