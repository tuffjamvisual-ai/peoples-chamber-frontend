-- Fix hyphenated line breaks in mp_biography.political_bio
-- Targets the PDF/scrape artefact:  "consti-\ntuency"  ->  "constituency"
-- Does NOT touch legitimate hyphens like "post-war" or "criminal-justice".

-- Wrap in a transaction so you can ROLLBACK if the row counts look wrong.
BEGIN;

-- 1. Preview which rows will change (run this first; should match expectations)
SELECT
  member_id,
  -- Count of "-\n" or "- \n" sequences per bio
  array_length(
    regexp_split_to_array(political_bio, E'-[ \\t]*\\n'),
    1
  ) - 1 AS hyphen_breaks_found,
  substring(political_bio FROM 1 FOR 120) AS preview
FROM mp_biography
WHERE political_bio ~ E'-[ \\t]*\\n'
ORDER BY hyphen_breaks_found DESC;

-- 2. The actual fix: collapse "<word>-<optional spaces><newline><word>" into "<word><word>"
--    regexp_replace with 'g' flag = global (all occurrences per row).
UPDATE mp_biography
SET political_bio = regexp_replace(
  political_bio,
  E'-[ \\t]*\\n[ \\t]*',
  '',
  'g'
)
WHERE political_bio ~ E'-[ \\t]*\\n';

-- 3. Sanity-check: confirm no more hyphenated line breaks remain
SELECT COUNT(*) AS rows_still_affected
FROM mp_biography
WHERE political_bio ~ E'-[ \\t]*\\n';

-- If the counts look right, COMMIT. Otherwise ROLLBACK and the changes vanish.
-- COMMIT;
-- ROLLBACK;
