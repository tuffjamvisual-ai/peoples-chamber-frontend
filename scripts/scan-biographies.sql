-- Read-only scan of every written MP biography for known problem patterns. Changes nothing.
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -f scripts/scan-biographies.sql > bio-scan.txt 2>&1
-- Also writes bio-scan.csv (one row per biography) in the project folder.

DROP TABLE IF EXISTS pg_temp.bio_scan;
CREATE TEMP TABLE bio_scan AS
WITH b AS (
  SELECT m.member_id, m.display_name, m.party, m.current_member, bb.political_bio AS t
  FROM mp_biography bb JOIN mps m ON m.member_id = bb.member_id
  WHERE coalesce(bb.political_bio, '') <> ''
),
n AS (
  SELECT member_id, display_name, party, current_member, t,
    -- 1. Text that goes stale with time
    (SELECT count(*) FROM regexp_matches(t, '\mAt (1[89]|[2-9][0-9])\M', 'g'))                                   AS ages,
    (SELECT count(*) FROM regexp_matches(t, '\mcurrently\M', 'gi'))                                             AS currently,
    (SELECT count(*) FROM regexp_matches(t, '(under this leadership|under the current leadership|this prime minister|current prime minister|this parliament|the next parliament)', 'gi')) AS leadership_or_parliament,
    (SELECT count(*) FROM regexp_matches(t, '\m(to date|so far|has yet to|remains to be seen)\M', 'gi'))         AS so_far_phrases,
    -- 2. Template phrases
    (SELECT count(*) FROM regexp_matches(t, 'strengths include', 'gi'))                                         AS strengths_list,
    (SELECT count(*) FROM regexp_matches(t, 'weaknesses include', 'gi'))                                        AS weaknesses_list,
    (SELECT count(*) FROM regexp_matches(t, 'Whether[^.]{0,250}(will determine|determines|depends on|will decide|will show|is the (immediate )?question|remains the question)', 'g')) AS whether_ending,
    -- 3. Leftover editing instructions / arguing with an unseen draft
    (SELECT count(*) FROM regexp_matches(t, '(must be (precisely )?stated|requires precise detail|must be precisely|the bare label|is not simply|not merely a|is no mere|than "[^"]{2,60}" (suggests|implies|captures|allows|conveys|obscures)|"[^"]{2,60}" (verdict|label|framing)|verdict (captures|allows)|some assessments|it is sometimes said|open govt note)', 'gi')) AS leftover_instructions,
    -- 4. House style
    (SELECT count(*) FROM regexp_matches(t, '—', 'g'))                                                          AS em_dashes,
    (SELECT count(*) FROM regexp_matches(t, '\mpercent\M', 'gi'))                                               AS percent_one_word,
    -- 5. Structure
    (SELECT count(*) FROM regexp_split_to_table(t, '\n\s*\n') p WHERE length(trim(p)) BETWEEN 1 AND 70)         AS one_line_paras,
    (SELECT count(*) FROM regexp_split_to_table(t, '\n\s*\n') p WHERE length(trim(p)) > 0)                      AS paragraphs,
    array_length(regexp_split_to_array(trim(t), '\s+'), 1)                                                     AS words,
    (SELECT count(*) FROM regexp_matches(t, '\mStarmer\M', 'g'))                                                AS starmer_mentions
  FROM b
)
SELECT *,
  (ages + currently + leadership_or_parliament + so_far_phrases
   + strengths_list + weaknesses_list + whether_ending
   + 2 * leftover_instructions + em_dashes + percent_one_word + one_line_paras) AS score
FROM n;

\echo '=== 1. How many biographies, and how many show each pattern at least once ==='
SELECT count(*)                                         AS biographies,
       count(*) FILTER (WHERE current_member)           AS current_mps,
       count(*) FILTER (WHERE ages > 0)                 AS with_ages,
       count(*) FILTER (WHERE currently > 0)            AS with_currently,
       count(*) FILTER (WHERE leadership_or_parliament > 0) AS with_leadership_or_parliament,
       count(*) FILTER (WHERE so_far_phrases > 0)       AS with_so_far_phrases,
       count(*) FILTER (WHERE strengths_list > 0)       AS with_strengths_list,
       count(*) FILTER (WHERE weaknesses_list > 0)      AS with_weaknesses_list,
       count(*) FILTER (WHERE whether_ending > 0)       AS with_whether_ending,
       count(*) FILTER (WHERE leftover_instructions > 0) AS with_leftover_instructions,
       count(*) FILTER (WHERE em_dashes > 0)            AS with_em_dashes,
       count(*) FILTER (WHERE percent_one_word > 0)     AS with_percent_one_word,
       count(*) FILTER (WHERE one_line_paras > 0)       AS with_one_line_paras,
       count(*) FILTER (WHERE score = 0)                AS clean
FROM bio_scan;

\echo '=== 2. Length ==='
SELECT min(words) AS min_words, round(avg(words)) AS avg_words, max(words) AS max_words,
       count(*) FILTER (WHERE words < 150) AS under_150_words
FROM bio_scan;

\echo '=== 3. The 40 biographies with the most problem patterns (current MPs) ==='
SELECT member_id, display_name, party, words, score, ages, currently, leadership_or_parliament AS leadership,
       strengths_list + weaknesses_list AS sw_lists, whether_ending, leftover_instructions AS leftover, one_line_paras AS one_liners
FROM bio_scan WHERE current_member
ORDER BY score DESC, words DESC
LIMIT 40;

\echo '=== 4. Example sentences: leftover editing instructions (first 40) ==='
SELECT s.member_id, s.display_name, left(m[1], 220) AS sentence
FROM bio_scan s
CROSS JOIN LATERAL regexp_matches(s.t, '([^.\n]*(must be (precisely )?stated|requires precise detail|the bare label|is not simply|is no mere|verdict (captures|allows)|some assessments|it is sometimes said|open govt note)[^.\n]*[.]?)', 'gi') AS m
ORDER BY s.member_id
LIMIT 40;

\echo '=== 5. Example sentences: ages (first 20) ==='
SELECT s.member_id, s.display_name, left(m[1], 160) AS sentence
FROM bio_scan s
CROSS JOIN LATERAL regexp_matches(s.t, '([^.\n]*\mAt (1[89]|[2-9][0-9])\M[^.\n]*[.]?)', 'g') AS m
ORDER BY s.member_id
LIMIT 20;

\echo '=== 6. Example sentences: "currently" (first 30) ==='
SELECT s.member_id, s.display_name, left(m[1], 200) AS sentence
FROM bio_scan s
CROSS JOIN LATERAL regexp_matches(s.t, '([^.\n]*\mcurrently\M[^.\n]*[.]?)', 'gi') AS m
ORDER BY s.member_id
LIMIT 30;

\echo '=== 7. Full per-biography results written to bio-scan.csv ==='
\copy (SELECT member_id, display_name, party, current_member, words, score, ages, currently, leadership_or_parliament, so_far_phrases, strengths_list, weaknesses_list, whether_ending, leftover_instructions, em_dashes, percent_one_word, one_line_paras, paragraphs, starmer_mentions FROM bio_scan ORDER BY score DESC) TO 'bio-scan.csv' WITH CSV HEADER
