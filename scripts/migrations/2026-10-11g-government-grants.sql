-- Government grants: Cabinet Office "Government grants register" (scheme
-- and award data), published annually on GOV.UK under the Open Government
-- Licence. First load: 2024 to 2025 (published 24 March 2026): 204,203
-- awards totalling ~£153.0bn and 1,699 schemes, from 49 funding bodies
-- (live-verified 2026-10-11 by scripts/discover-grants-register.js).
--
-- Each award has a "Funding Org" (always the parent department, 20 in all)
-- and a "Managed by" organisation (the body that distributed it, e.g. Arts
-- Council England for DCMS, Rural Payments Agency for Defra; 49 in all).
-- Departments are mapped to tab codes using the register's own
-- per-department tabs, plus overrides for names that appear in no tab.
-- department_code is the register's tab code (CO, DBT, DCMS, ...);
-- department_slug is this site's /departments/[slug] where one exists
-- (none yet for DSIT, HMRC or The National Archives, so their rows are
-- stored with department_slug NULL and not displayed).
--
-- amount: per the register's field notes, the total paid out in that
-- financial year. Recipient names are withheld by government for some
-- sensitive awards; awards whose "Award type" isn't "Organisation" are
-- stored without a recipient name or identifiers so no individual is named.

CREATE TABLE IF NOT EXISTS public.government_grant_schemes (
  fy                 text NOT NULL,          -- e.g. '2024-25'
  scheme_code        text NOT NULL,
  title              text,
  description        text,
  funder_name        text,
  managed_by         text,
  department_code    text,
  department_slug    text,
  fy_value           numeric,
  start_date         date,
  end_date           date,
  allocation_method  text,
  duration_months    integer,
  cofog_sector       text,
  authority_act      text,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fy, scheme_code)
);

CREATE INDEX IF NOT EXISTS idx_grant_schemes_dept_value
  ON public.government_grant_schemes (department_slug, fy, fy_value DESC);

CREATE TABLE IF NOT EXISTS public.government_grants (
  identifier                text PRIMARY KEY,   -- register's award Identifier
  fy                        text NOT NULL,
  title                     text,
  amount                    numeric NOT NULL,
  scheme_code               text,
  scheme_title              text,
  award_date                date,
  recipient_id              text,
  recipient_name            text,
  recipient_charity_number  text,
  recipient_company_number  text,
  recipient_city            text,
  recipient_postcode        text,
  funder_id                 text,
  funder_name               text,
  managed_by                text,
  allocation_method         text,
  open_call                 boolean,
  award_type                text,
  department_code           text,
  department_slug           text,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Department tab: largest awards for a department in a year.
CREATE INDEX IF NOT EXISTS idx_grants_dept_fy_amount
  ON public.government_grants (department_slug, fy, amount DESC);

CREATE INDEX IF NOT EXISTS idx_grants_recipient_name
  ON public.government_grants (recipient_name);

-- Pre-aggregated per distributing body ("Managed by"), so department pages
-- don't sum ~200k rows on every render.
CREATE TABLE IF NOT EXISTS public.government_grants_summary (
  fy               text NOT NULL,
  department_code  text NOT NULL,
  department_slug  text,
  body_name        text NOT NULL,     -- "Managed by" organisation
  award_count      integer NOT NULL,
  total_amount     numeric NOT NULL,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fy, department_code, body_name)
);

ALTER TABLE public.government_grant_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_grants_summary ENABLE ROW LEVEL SECURITY;

-- Policies are dropped first so this file can be re-run safely.
DROP POLICY IF EXISTS "government_grant_schemes_anon_read" ON public.government_grant_schemes;
DROP POLICY IF EXISTS "government_grants_anon_read" ON public.government_grants;
DROP POLICY IF EXISTS "government_grants_summary_anon_read" ON public.government_grants_summary;
CREATE POLICY "government_grant_schemes_anon_read" ON public.government_grant_schemes FOR SELECT TO anon USING (true);
CREATE POLICY "government_grants_anon_read" ON public.government_grants FOR SELECT TO anon USING (true);
CREATE POLICY "government_grants_summary_anon_read" ON public.government_grants_summary FOR SELECT TO anon USING (true);
