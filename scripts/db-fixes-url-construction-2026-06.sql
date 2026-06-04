-- Applied 2026-06-04.
-- Fix URL construction bugs: mp_contact.website and government_posts.additional_info_link

-- CHANGE 2: mp_contact.website -- prefix bare www. values with https://

-- Step 1: report affected rows
SELECT member_id, website
FROM mp_contact
WHERE website IS NOT NULL
  AND website != ''
  AND website NOT LIKE 'http://%'
  AND website NOT LIKE 'https://%';

-- Step 2: apply update
UPDATE mp_contact
SET website = 'https://' || website
WHERE website IS NOT NULL
  AND website != ''
  AND website NOT LIKE 'http://%'
  AND website NOT LIKE 'https://%'
  AND website LIKE 'www.%';

-- Step 3: confirm zero rows remain
SELECT member_id, website
FROM mp_contact
WHERE website IS NOT NULL
  AND website != ''
  AND website NOT LIKE 'http://%'
  AND website NOT LIKE 'https://%';

-- CHANGE 3: government_posts.additional_info_link -- strip leading /

-- Step 1: report affected rows (expect 2)
SELECT id, additional_info_link
FROM government_posts
WHERE additional_info_link LIKE '/http://%'
   OR additional_info_link LIKE '/https://%';

-- Step 2: strip leading slash
UPDATE government_posts
SET additional_info_link = SUBSTRING(additional_info_link FROM 2)
WHERE additional_info_link LIKE '/http://%'
   OR additional_info_link LIKE '/https://%';

-- Step 3: confirm zero rows remain
SELECT id, additional_info_link
FROM government_posts
WHERE additional_info_link LIKE '/http://%'
   OR additional_info_link LIKE '/https://%';
