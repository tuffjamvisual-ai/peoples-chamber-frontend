-- NOT APPLIED. Undoes 2026-11-06f-written-question-fields.sql, and removes what the backfill put in the columns.
-- Run only after the pages and the sync that use them have been taken back out.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP FUNCTION public.written_question_department_stats();
ALTER TABLE public.parliament_written_questions
  DROP COLUMN date_holding_answer,
  DROP COLUMN date_answer_corrected,
  DROP COLUMN original_answer_html,
  DROP COLUMN attachments;
COMMIT;
