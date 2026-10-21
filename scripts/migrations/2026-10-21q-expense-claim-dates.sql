-- Three 2025-26 IPSA claims dated a year late in IPSA's own file (owner's approval, 21 Oct 2026): 26/12/2026,
-- 30/11/2026 and 18/11/2026 for claims in the year ending 31 March 2026. Moved back one year, as
-- scripts/sync-ipsa-expenses-detail.js now does on import.
\set ON_ERROR_STOP on
BEGIN;
DO $$ DECLARE n int; BEGIN
  UPDATE mp_expenses_detail SET claim_date = claim_date - interval '1 year', updated_at = now()
   WHERE year = '25_26' AND claim_date > current_date AND claim_date - interval '1 year' BETWEEN DATE '2025-04-01' AND DATE '2026-03-31';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 claims, found %', n; END IF;
  IF EXISTS (SELECT 1 FROM mp_expenses_detail WHERE claim_date > current_date) THEN RAISE EXCEPTION 'future-dated claims remain'; END IF;
  RAISE NOTICE 'moved % claim dates back a year', n;
END $$;
COMMIT;
