-- NOT APPLIED. Removes the three tables of 2026-11-06i and their data, which can be loaded again from the plan's files. No other table is touched.
-- Run only after the pages that read them have been taken back out.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE public.pm_question_exchange_rows_1945_1961;
DROP TABLE public.pm_questions_1945_1961;
DROP TABLE public.pm_question_people_1945_1961;
COMMIT;
