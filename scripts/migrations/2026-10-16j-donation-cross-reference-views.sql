-- Audit X11: /donations/government-contractors (16.8 s first load) and /donations/foreign
-- (11.8 s) paged whole tables through the API and joined them in the page, without a stable
-- order (so pages could repeat or skip rows). These views do the same work in the database.
-- Read-only views over public tables; anon can already read both tables.

\set ON_ERROR_STOP on
BEGIN;

-- Companies on both registers under the same name (case and spacing ignored), as the page did.
CREATE OR REPLACE VIEW public.contractor_donor_matches WITH (security_invoker = true) AS
WITH s AS (
  SELECT upper(regexp_replace(btrim(supplier), '\s+', ' ', 'g')) AS norm,
         count(*) AS contracts, sum(coalesce(value, 0)) AS contract_value
  FROM public.government_contracts WHERE supplier IS NOT NULL AND btrim(supplier) <> ''
  GROUP BY 1
), d AS (
  SELECT upper(regexp_replace(btrim(donor_name), '\s+', ' ', 'g')) AS norm,
         min(donor_name) AS display_name, count(*) AS donations, sum(coalesce(amount, 0)) AS donated
  FROM public.political_donations WHERE donor_name IS NOT NULL AND btrim(donor_name) <> ''
  GROUP BY 1
)
SELECT d.display_name, s.norm, s.contracts, s.contract_value, d.donations, d.donated
FROM s JOIN d USING (norm);

-- Donations whose donor address country is outside the UK, by country.
CREATE OR REPLACE VIEW public.foreign_donations_by_country WITH (security_invoker = true) AS
SELECT btrim(addr_country) AS country,
       sum(coalesce(amount, 0)) AS total,
       count(*) AS donations,
       (array_agg(donor_name ORDER BY amount DESC NULLS LAST, id) FILTER (WHERE donor_name IS NOT NULL))[1] AS top_donor,
       max(amount) AS top_amount
FROM public.political_donations
WHERE addr_country IS NOT NULL AND btrim(addr_country) <> ''
  AND btrim(addr_country) NOT IN ('United Kingdom', 'UK', 'GB', 'Great Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland')
GROUP BY 1;

GRANT SELECT ON public.contractor_donor_matches, public.foreign_donations_by_country TO anon, authenticated;
COMMIT;

-- Timing check (anon role has a 3 s limit):
EXPLAIN (ANALYZE, SUMMARY) SELECT * FROM public.contractor_donor_matches;
EXPLAIN (ANALYZE, SUMMARY) SELECT * FROM public.foreign_donations_by_country;
