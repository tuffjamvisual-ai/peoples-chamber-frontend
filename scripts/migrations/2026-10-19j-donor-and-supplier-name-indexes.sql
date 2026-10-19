-- Indexes for the donor pages' name lookups (John's approval, 19 Oct 2026). The donor page filters
-- political_donations.donor_name with ILIKE '%token%' (three times) and IN (...), and government_contracts.supplier with
-- ILIKE '%token%'; each was a full table scan (66,706 and 30,705 rows), and under build load these hit the anon role's
-- 3s statement timeout. pg_trgm is installed (already used by idx_pd_recipient_name_trgm).
--
-- CREATE INDEX CONCURRENTLY: builds without blocking reads or writes (it takes a SHARE UPDATE EXCLUSIVE lock, which
-- does not conflict with INSERT/UPDATE/DELETE). It cannot run inside a transaction, so this file has no BEGIN/COMMIT
-- and cannot be rehearsed with ROLLBACK. If a build fails part way, the index is left INVALID: drop it and run again.
-- After running, check pg_index.indisvalid for all three (query at the end).
\set ON_ERROR_STOP on

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_donor_name_trgm ON public.political_donations USING gin (donor_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_donor_name ON public.political_donations USING btree (donor_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gc_supplier_trgm ON public.government_contracts USING gin (supplier gin_trgm_ops);

SELECT c.relname AS index_name, i.indisvalid, i.indisready, pg_size_pretty(pg_relation_size(c.oid)) AS size
  FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
 WHERE c.relname IN ('idx_pd_donor_name_trgm', 'idx_pd_donor_name', 'idx_gc_supplier_trgm')
 ORDER BY 1;
