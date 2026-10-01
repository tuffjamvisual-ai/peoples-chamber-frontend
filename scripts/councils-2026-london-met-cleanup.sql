-- Corrects the two remaining London/Met-borough rows left by the May 2026
-- election-cycle marker. Neither actually had a May 2026 election:
--
-- city-of-doncaster: last whole-council election was 1 May 2025 (Doncaster
-- moved to all-out elections every 4 years from 2017; next is 2029, not
-- 2026). Result: Reform UK gained control from Labour, 37/55 seats.
-- Doncaster also has a directly-elected mayor (separate from council
-- control) — Labour's Ros Jones, re-elected to a 4th term the same day by
-- a 698-vote margin. That split is recorded in political_control_status
-- rather than left implicit.
--
-- city-of-london-corporation: the election-cycle marker script incorrectly
-- bumped last_election_year to 2026 for this row. The City's cycle is
-- quadrennial from 2022 (last election 20 March 2025, next due 2029).
-- Category is unchanged (independents still hold an overwhelming
-- majority, 83/100 seats, up from 78 in 2022) — only last_election_year
-- was wrong and is corrected here.
--
-- A third fix is included below: the election-cycle marker script had also
-- overwritten political_control_status with 'post-2026 review pending' for
-- city-of-london-corporation, replacing the correct 'sui generis'
-- categorisation that was in place before. That is restored here.
--
-- Sources: doncaster.gov.uk official 2025 results; Wikipedia "2025 City of
-- Doncaster Council election"; Wikipedia "2025 Doncaster mayoral election";
-- Wikipedia "2025 City of London Corporation election". Cross-checked
-- 2026-10-01.

-- ===== PREVIEW: rows before change =====
SELECT slug, name, political_control, political_control_status, last_election_year
FROM councils
WHERE slug IN ('city-of-doncaster', 'city-of-london-corporation');

-- ===== UPDATE =====
BEGIN;

UPDATE councils
SET political_control = 'Reform UK',
    political_control_status = 'majority (directly elected mayor: Labour)',
    last_election_year = 2025
WHERE slug = 'city-of-doncaster';

UPDATE councils
SET last_election_year = 2025
WHERE slug = 'city-of-london-corporation';

UPDATE councils
SET political_control_status = 'sui generis'
WHERE slug = 'city-of-london-corporation';

COMMIT;

-- ===== VERIFY =====
SELECT slug, name, political_control, political_control_status, last_election_year
FROM councils
WHERE slug IN ('city-of-doncaster', 'city-of-london-corporation');
