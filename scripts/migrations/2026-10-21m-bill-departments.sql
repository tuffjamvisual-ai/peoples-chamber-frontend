-- Topic pages: bills by sponsoring department (government bills) or by whole words in the title (other bills), rule B
-- (owner's approval, 21 Oct 2026). Topic pages matched keywords as substrings, so "bus" put the Child-like Sexual Abuse
-- Dolls (Offences) Bill on Transport.
--   bill_type_id: the Bills API billTypeId (1 Government, 2/5/7/8 private members', 3 Consolidation, 4 Hybrid,
--     6 Private, 9 Draft, 10 Supply and Appropriation).
--   sponsor_departments: the distinct sponsors[].organisation.name of the bill.
-- Both are written by /api/sync-bill-sponsors, and filled once by scripts/backfill-bill-departments.mjs.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '120s';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bill' AND column_name IN ('bill_type_id', 'sponsor_departments'))
    THEN RAISE EXCEPTION 'bill_type_id or sponsor_departments already exists'; END IF;
  IF to_regprocedure('public.topic_bills(text[],text[],text[],text[],integer)') IS NOT NULL THEN RAISE EXCEPTION 'topic_bills already exists'; END IF;
END $$;

ALTER TABLE public.bill ADD COLUMN bill_type_id smallint, ADD COLUMN sponsor_departments text[];
CREATE INDEX bill_sponsor_departments_idx ON public.bill USING gin (sponsor_departments);

-- A whole-word, case-insensitive pattern for a list of words or phrases; NULL for an empty list.
CREATE FUNCTION public.whole_words_pattern(p_words text[]) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN coalesce(cardinality(p_words), 0) = 0 THEN NULL ELSE
    '\m(' || (SELECT string_agg(regexp_replace(w, '([.*+?^${}()|\[\]\\])', '\\\1', 'g'), '|') FROM unnest(p_words) w) || ')\M' END
$$;

-- The bills a topic page lists. Government-type bills: sponsored by one of p_depts; when every matching department is
-- in p_shared (departments covering several subjects), the title must also match p_words. Other bills: the title
-- matches p_words. Either way no word of p_exclude. Newest first; the page puts Acts last.
CREATE FUNCTION public.topic_bills(p_depts text[], p_shared text[], p_words text[], p_exclude text[], p_limit int DEFAULT 8)
RETURNS TABLE (id int, title text, is_act boolean, current_stage text, last_update timestamptz)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH p AS (
    SELECT whole_words_pattern(p_words) AS inc, whole_words_pattern(p_exclude) AS exc,
           coalesce((SELECT array_agg(d) FROM unnest(p_depts) d WHERE d <> ALL (coalesce(p_shared, '{}'))), '{}') AS own
  )
  SELECT b.id, b.title::text, b.is_act, b.current_stage, b.last_update
  FROM bill b, p
  WHERE b.hidden_reason IS NULL
    AND (p.exc IS NULL OR b.title !~* p.exc)
    AND (
      (b.bill_type_id IN (1, 3, 4, 10) AND (b.sponsor_departments && p.own OR (b.sponsor_departments && p_depts AND b.title ~* p.inc)))
      OR (b.bill_type_id IN (2, 5, 6, 7, 8) AND b.title ~* p.inc)
    )
  ORDER BY b.last_update DESC
  LIMIT p_limit
$$;
GRANT EXECUTE ON FUNCTION public.whole_words_pattern(text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.topic_bills(text[], text[], text[], text[], int) TO anon, authenticated;

DO $$ DECLARE n int; BEGIN
  IF public.whole_words_pattern(ARRAY['bus']) <> '\m(bus)\M' THEN RAISE EXCEPTION 'pattern: %', public.whole_words_pattern(ARRAY['bus']); END IF;
  SELECT count(*) INTO n FROM bill WHERE title ~* public.whole_words_pattern(ARRAY['bus']) AND title ILIKE '%abuse%';
  IF n > 0 THEN RAISE EXCEPTION '"bus" still matches Abuse (% bills)', n; END IF;
  RAISE NOTICE 'ok';
END $$;
COMMIT;
