-- 2026-10-22a: topic_bills_page(), a topic's bills a page at a time (owner's approval, 22 Oct 2026).
-- The same matching as topic_bills() (migration 2026-10-21m, rule B), with:
--   p_acts_only  only Acts, for the topic page's "Key Acts" section;
--   p_offset     for /topics/[slug]/bills, which lists the topic's full set, newest first, 20 a page;
--   total        the number of matching bills, on every row (for "page N of M").
-- Ties on last_update are broken by id so pages never overlap. topic_bills() is kept as it is.
\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF to_regprocedure('public.topic_bills_page(text[],text[],text[],text[],boolean,integer,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'topic_bills_page already exists';
  END IF;
  IF to_regprocedure('public.whole_words_pattern(text[])') IS NULL THEN RAISE EXCEPTION 'whole_words_pattern is missing'; END IF;
END $$;

CREATE FUNCTION public.topic_bills_page(p_depts text[], p_shared text[], p_words text[], p_exclude text[],
  p_acts_only boolean DEFAULT false, p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS TABLE (id int, title text, is_act boolean, current_stage text, last_update timestamptz, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH p AS (
    SELECT whole_words_pattern(p_words) AS inc, whole_words_pattern(p_exclude) AS exc,
           coalesce((SELECT array_agg(d) FROM unnest(p_depts) d WHERE d <> ALL (coalesce(p_shared, '{}'))), '{}') AS own
  )
  SELECT b.id, b.title::text, b.is_act, b.current_stage, b.last_update, count(*) OVER () AS total
  FROM bill b, p
  WHERE b.hidden_reason IS NULL
    AND (NOT p_acts_only OR b.is_act)
    AND (p.exc IS NULL OR b.title !~* p.exc)
    AND (
      (b.bill_type_id IN (1, 3, 4, 10) AND (b.sponsor_departments && p.own OR (b.sponsor_departments && p_depts AND b.title ~* p.inc)))
      OR (b.bill_type_id IN (2, 5, 6, 7, 8) AND b.title ~* p.inc)
    )
  ORDER BY b.last_update DESC, b.id DESC
  LIMIT p_limit OFFSET p_offset
$$;
GRANT EXECUTE ON FUNCTION public.topic_bills_page(text[], text[], text[], text[], boolean, int, int) TO anon, authenticated;

-- Same bills as topic_bills() for a topic (Transport), and Acts only returns only Acts.
DO $$ DECLARE a int; b int; c int; BEGIN
  SELECT count(*) INTO a FROM topic_bills(ARRAY['Department for Transport'], '{}', ARRAY['rail', 'bus'], '{}', 100000);
  SELECT count(*) INTO b FROM topic_bills_page(ARRAY['Department for Transport'], '{}', ARRAY['rail', 'bus'], '{}', false, 100000, 0);
  IF a <> b OR a = 0 THEN RAISE EXCEPTION 'topic_bills % vs topic_bills_page %', a, b; END IF;
  SELECT count(*) INTO c FROM topic_bills_page(ARRAY['Department for Transport'], '{}', ARRAY['rail', 'bus'], '{}', true, 100000, 0) WHERE NOT is_act;
  IF c > 0 THEN RAISE EXCEPTION 'Acts only returned % bills that are not Acts', c; END IF;
  RAISE NOTICE 'ok: % bills', a;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
