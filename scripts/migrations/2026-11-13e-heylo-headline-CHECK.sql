-- 2026-11-13e-heylo-headline-CHECK: read only. Rows holding the old and the new headline (before: 1 and 0; after: 0 and 1).
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT (SELECT count(*) FROM editorials WHERE headline = 'Heylo Housing Was Warned in 2022. Now Administrators Decide the Future of Nearly 3,500 Homes') AS old_headline,
       (SELECT count(*) FROM editorials WHERE headline = 'Heylo Housing Was Warned in 2022. Administrators Decide the Future of Nearly 3,500 Homes') AS new_headline,
       (SELECT length(standfirst) || '/' || length(body_text) FROM editorials WHERE slug = 'cq8m4xw2hl') AS standfirst_text;
ROLLBACK;
