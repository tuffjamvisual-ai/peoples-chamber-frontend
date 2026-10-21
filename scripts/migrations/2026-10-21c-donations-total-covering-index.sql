-- party_donations_total() (migration 2026-10-21b) read every matching row from the 53 MB political_donations table:
-- 3,133 pages and 610 ms for Labour even when cached, and it ran past anon's 3 s limit during the Vercel build of
-- 779c66a (21 Oct 2026). With amount in the index the sum is read from the index alone. The plain recipient_name
-- index from 2026-10-21b is a prefix of this one, so it is dropped.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$
BEGIN
  IF to_regclass('public.political_donations_recipient_amount_idx') IS NOT NULL THEN RAISE EXCEPTION 'the covering index already exists'; END IF;
  IF to_regclass('public.political_donations_recipient_name_idx') IS NULL THEN RAISE EXCEPTION 'the 2026-10-21b index is missing'; END IF;
END $$;
CREATE INDEX political_donations_recipient_amount_idx ON public.political_donations (recipient_name) INCLUDE (amount);
DROP INDEX public.political_donations_recipient_name_idx;
ANALYZE public.political_donations;
DO $$
DECLARE a numeric; b numeric;
BEGIN
  SELECT sum(amount) INTO a FROM public.political_donations WHERE recipient_name = 'Labour Party';
  b := public.party_donations_total('Labour Party');
  IF a IS DISTINCT FROM b THEN RAISE EXCEPTION 'party_donations_total % <> %', b, a; END IF;
END $$;
COMMIT;
-- Outside the transaction: mark the table's pages all-visible so the sum is index-only straight away.
VACUUM (ANALYZE) public.political_donations;
