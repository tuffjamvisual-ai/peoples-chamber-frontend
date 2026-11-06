-- NOT APPLIED. Removes the five tables of 2026-11-06h and their data, which can be loaded again from the plan's files. No other table is touched.
-- Run only after the pages that read them have been taken back out.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE public.register_archive_entry_editions;
DROP TABLE public.register_archive_entries;
DROP TABLE public.register_archive_editions;
DROP TABLE public.historic_commons_votes;
DROP TABLE public.historic_commons_divisions;
COMMIT;
