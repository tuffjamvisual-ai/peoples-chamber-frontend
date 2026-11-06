-- NOT APPLIED. Undoes 2026-11-06c-constituencies.sql: removes the four new tables and their data, which can be loaded again
-- from "Claude outputs/constituencies/". Run only after the pages that read them have been taken back out.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE public.constituency_mp_terms;
DROP TABLE public.constituency_election_results;
DROP TABLE public.constituency_byelections;
DROP TABLE public.constituencies;
COMMIT;
