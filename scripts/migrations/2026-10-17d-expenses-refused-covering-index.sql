-- /expenses/refused reads every claim that was refused or repaid (4,621 rows since the
-- 2010-11 history was added) in pages of 1,000. mp_expenses_detail_refused_repaid_idx finds
-- the rows, but each one is then fetched from a 179 MB table: about 1.1 s per page from cold,
-- so five pages under build load passed the 3 s anon statement timeout and failed the Vercel
-- build of f20fe31 (17 Oct 2026). This index carries every column the page selects, so the
-- read is an index-only scan. Additive; the old partial index is left in place.
--
-- CONCURRENTLY: no write lock on the table while it builds. It cannot run inside a
-- transaction, so this file has no BEGIN/COMMIT. If it fails part-way, drop the invalid
-- index (DROP INDEX CONCURRENTLY IF EXISTS mp_expenses_detail_refused_repaid_cover_idx;)
-- and run the file again.
-- UNDO: DROP INDEX CONCURRENTLY IF EXISTS public.mp_expenses_detail_refused_repaid_cover_idx;

\set ON_ERROR_STOP on
CREATE INDEX CONCURRENTLY IF NOT EXISTS mp_expenses_detail_refused_repaid_cover_idx
  ON public.mp_expenses_detail (id)
  INCLUDE (year, member_id, mp_name, amount_not_paid, amount_repaid, reason_if_not_paid)
  WHERE (amount_not_paid > 0 OR amount_repaid > 0);

-- Index-only scans need the visibility map to be current.
VACUUM (ANALYZE) public.mp_expenses_detail;

EXPLAIN (ANALYZE, BUFFERS)
SELECT year, member_id, mp_name, amount_not_paid, amount_repaid, reason_if_not_paid
FROM public.mp_expenses_detail
WHERE (amount_not_paid > 0 OR amount_repaid > 0)
ORDER BY id LIMIT 1000 OFFSET 1000;
