-- Backfill dept_ministers.salary_band from role text + structural rules.
--
-- Re-runnable from scratch — overwrites every row's salary_band.
-- Use this any time dept_ministers is re-synced from gov.uk to keep
-- /earnings + the MP profile Earnings tab in sync.
--
-- Order matters:
--   1. Role-text mapping with PUSS detected BEFORE 'sos' (so the substring
--      "Secretary of State" inside "Parliamentary Under-Secretary of State"
--      doesn't mis-bump junior ministers into Cabinet).
--   2. Structural override: any row with is_secretary_of_state = true is
--      Cabinet by definition (catches cases where gov.uk records the
--      concurrent hat as the role text, e.g. Phillipson / Kyle).
--   3. Structural override: cabinet-office is_secretary_of_state holder
--      is the PM (catches the Starmer "Minister for the Union" case).
--
-- Salary bands: 'pm' | 'sos' | 'minister_of_state' | 'puss' | NULL
-- Amounts live in lib/ministerial-salaries.ts (single source of truth on the app side).

BEGIN;

ALTER TABLE dept_ministers ADD COLUMN IF NOT EXISTS salary_band text;

-- Step 1: role-text mapping
UPDATE dept_ministers
SET salary_band = CASE
  WHEN role IS NULL OR role = '' THEN NULL
  WHEN role ~* '^prime minister$' THEN 'pm'
  -- PUSS first (most specific phrase that contains 'Secretary of State' substring)
  WHEN role ~* 'parliamentary under[- ]secretary' THEN 'puss'
  -- Cabinet rate
  WHEN role ~* '\mdeputy prime minister\M' THEN 'sos'
  WHEN role ~* '\msecretary of state\M' THEN 'sos'
  WHEN role ~* '\mchief secretary to the treasury\M' THEN 'sos'
  WHEN role ~* '\mchancellor of the exchequer\M' THEN 'sos'
  WHEN role ~* '\mchancellor of the duchy of lancaster\M' THEN 'sos'
  WHEN role ~* '\mleader of the house\M' THEN 'sos'
  WHEN role ~* '\mgovernment chief whip\M' THEN 'sos'
  WHEN role ~* '\mparliamentary secretary to the treasury\M' THEN 'sos'
  WHEN role ~* '\mlord president of the council\M' THEN 'sos'
  WHEN role ~* '\mlord privy seal\M' THEN 'sos'
  WHEN role ~* '\mattorney general\M' THEN 'sos'
  WHEN role ~* '\madvocate general\M' THEN 'sos'
  WHEN role ~* '^chief secretary to the prime minister' THEN 'sos'
  -- Minister of State + Treasury seconds + cabinet-office MoS post
  WHEN role ~* '\mminister of state\M' THEN 'minister_of_state'
  WHEN role ~* '\meconomic secretary to the treasury\M' THEN 'minister_of_state'
  WHEN role ~* '\mexchequer secretary to the treasury\M' THEN 'minister_of_state'
  WHEN role ~* '\mfinancial secretary to the treasury\M' THEN 'minister_of_state'
  WHEN role ~* '^minister for the cabinet office' THEN 'minister_of_state'
  -- PUSS equivalents
  WHEN role ~* '\mparliamentary secretary\M' AND role !~* 'treasury' THEN 'puss'
  WHEN role ~* '\msolicitor general\M' THEN 'puss'
  WHEN role ~* '\massistant whip\M' THEN 'puss'
  WHEN role ~* '\mlord(s)? of the treasury\M' THEN 'puss'
  WHEN role ~* '(?:baroness|lord) in waiting' THEN 'puss'
  WHEN role ~* '\mgovernment whip\M' THEN 'puss'
  ELSE NULL
END;

-- Step 2: any Secretary-of-State row is Cabinet (resilient to gov.uk
-- recording a concurrent hat — e.g. "Minister for Women and Equalities" or
-- "President of the Board of Trade" — as the role text).
UPDATE dept_ministers
SET salary_band = 'sos'
WHERE is_secretary_of_state = true
  AND (salary_band IS NULL OR salary_band <> 'sos')
  AND dept_slug <> 'cabinet-office';

-- Step 3: cabinet-office Secretary-of-State holder is the PM
UPDATE dept_ministers
SET salary_band = 'pm'
WHERE dept_slug = 'cabinet-office'
  AND is_secretary_of_state = true;

COMMIT;

-- Quick verification (shouldn't fail; safe to leave in)
SELECT salary_band, count(*) FROM dept_ministers GROUP BY salary_band ORDER BY 2 DESC;
