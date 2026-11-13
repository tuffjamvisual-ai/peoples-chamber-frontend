-- 2026-11-13b-ar7-headline-CHECK: read only. How many rows hold the old and the new headline (before: 1 and 0; after: 0 and 1),
-- and the row's other fields unchanged in size.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT (SELECT count(*) FROM editorials WHERE headline = 'Offshore Wind Auction: £890m Budget Rise Left Out Grid Congestion') AS old_headline,
       (SELECT count(*) FROM editorials WHERE headline = 'Offshore Wind Got £890m More. The Grid It Plugs Into Is Already Jammed') AS new_headline,
       (SELECT headline FROM editorials WHERE slug = '7f60n23aw5') AS current,
       (SELECT length(standfirst) || '/' || length(body_text) || '/' || jsonb_array_length(body_json) FROM editorials WHERE slug = '7f60n23aw5') AS standfirst_text_blocks;
ROLLBACK;
