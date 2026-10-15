-- /expenses/refused reads every refused or repaid claim (about 3,800 of 565,000 rows since
-- the 2010-11 to 2022-23 history was loaded on 15 October). Read in id order, page by page,
-- the public role's 3-second limit cut the read off after the first page, so the page showed
-- one year. This partial index holds just those rows in id order, so each page is a short
-- index read.

\set ON_ERROR_STOP on

CREATE INDEX IF NOT EXISTS mp_expenses_detail_refused_repaid_idx
  ON public.mp_expenses_detail (id)
  WHERE (amount_not_paid > 0 OR amount_repaid > 0);

ANALYZE public.mp_expenses_detail;
