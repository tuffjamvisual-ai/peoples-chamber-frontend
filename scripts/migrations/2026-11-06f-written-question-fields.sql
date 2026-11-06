-- Applied to production on 6 Nov 2026 at 12:47:36 GMT, on the owner's yes.
-- Written questions pages (owner, backlog item 15c). Four new empty columns on public.parliament_written_questions, from fields
-- Parliament publishes that the sync has not stored, and one read function. No existing column or row changes.
-- date_holding_answer    dateHoldingAnswer. answerIsHolding is not used: it was false on all 2,400 rows sampled, 26 of which had this date.
-- date_answer_corrected  dateAnswerCorrected, on 390 questions.
-- original_answer_html   originalAnswerText, the answer before correction. In the single question record only, so one request each.
-- attachments            attachments: [{url, title, fileType, fileSizeBytes}].
-- New nullable columns with no default rewrite nothing, and the generated search column does not depend on them.
-- Filled by a backfill afterwards; the sync fills them from then on. No backup: nothing existing changes.
-- Indexes are separate, because CONCURRENTLY cannot run in a transaction: 2026-11-06g. Undo: 2026-11-06f-written-question-fields-UNDO.sql
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.parliament_written_questions
  ADD COLUMN date_holding_answer date,
  ADD COLUMN date_answer_corrected date,
  ADD COLUMN original_answer_html text,
  ADD COLUMN attachments jsonb;

-- Counts for /questions/department/<slug> and the sitemap's dates: about 100 ms over the whole table, so kept in a daily cache.
-- Withdrawn questions are not counted as asked, as Parliament's own default lists leave them out.
CREATE FUNCTION public.written_question_department_stats()
RETURNS TABLE (answering_body_id integer, asked bigint, answered bigint, average_days numeric, latest_answer date)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT answering_body_id, count(*), count(date_answered), round(avg(date_answered - date_tabled), 1), max(date_answered)
    FROM public.parliament_written_questions WHERE NOT coalesce(is_withdrawn, false) GROUP BY answering_body_id
$$;
REVOKE ALL ON FUNCTION public.written_question_department_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.written_question_department_stats() TO service_role;
COMMIT;
