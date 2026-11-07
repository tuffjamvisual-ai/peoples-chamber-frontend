-- Applied on the owner's yes, 7 Nov 2026 (AA2; proposed in AA1): built at 17:17:34 GMT in 2.5 s, 6,048 kB, valid. A plain VACUUM
-- (ANALYZE) of the table followed (13 s; 15,402 dead rows to 0), as the index-only scan still made 74,584 heap fetches. The
-- department stats then read 0 heap rows: 69 ms, against 1,826 ms on average and 7,331 ms at most before.
-- written_question_department_stats() groups every row of parliament_written_questions (194,535 rows; 656 MB with TOAST,
-- about 310 MB of table) to count questions and answers per answering body: 1,826 ms on average and 7,331 ms at most
-- (pg_stat_statements), against PostgREST's 8 s statement timeout. A covering index holding only the four columns the function
-- reads (answering_body_id; date_tabled, date_answered, is_withdrawn) lets it read the index instead of the table, an
-- index-only scan of roughly 10 MB once the table's visibility map is current (VACUUM). Built CONCURRENTLY, so reads and writes
-- carry on; run outside a transaction block on a session connection (port 5432). No data changes.
-- Undo: 2026-11-07j-written-questions-stats-index-UNDO.sql.
SET statement_timeout = '300s';
SET lock_timeout = '5s';
CREATE INDEX CONCURRENTLY IF NOT EXISTS parliament_written_questions_body_stats_idx
  ON public.parliament_written_questions (answering_body_id) INCLUDE (date_tabled, date_answered, is_withdrawn);
RESET statement_timeout;
RESET lock_timeout;
-- Then, read only: EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.written_question_department_stats(); expect an Index Only
-- Scan on parliament_written_questions_body_stats_idx. If heap fetches stay high, a plain VACUUM (no FULL) of the table first.
