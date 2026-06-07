-- Phase 1: Civil Service Transparency
--
-- Three feature additions:
--   1. Extend dept_officials with role_rank / appointment_date /
--      previous_role so the existing senior officials section can show
--      who they are and how long they've been there.
--   2. department_staffing — quarterly ONS Public Sector Employment
--      Table 8 (HC + FTE per department).
--   3. department_budgets — annual HMT Main Estimates DEL XLSX
--      (Resource DEL, Capital DEL per department per FY), with the
--      hand-curated editorial prose preserved alongside the numbers.

-- 1. dept_officials extension ------------------------------------------------

ALTER TABLE dept_officials ADD COLUMN IF NOT EXISTS role_rank        TEXT;
ALTER TABLE dept_officials ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE dept_officials ADD COLUMN IF NOT EXISTS previous_role    TEXT;
CREATE INDEX IF NOT EXISTS idx_dept_officials_rank ON dept_officials (role_rank);

-- role_rank is one of:
--   'permanent_secretary'         — incl. Permanent Under-Secretary, Acting/Interim variants
--   'second_permanent_secretary'
--   'director_general'            — DG, Director-General, Senior Director
--   'chief_officer'               — COO, CDIO, CFO, Chief X Officer
--   'board'                       — Non-Executive Director, board member
--   'other'                       — everything else (commissioners, advisers)


-- 2. department_staffing -----------------------------------------------------

CREATE TABLE IF NOT EXISTS department_staffing (
  id                            BIGSERIAL PRIMARY KEY,
  department_slug               TEXT NOT NULL,
  period                        TEXT NOT NULL,             -- 'December 2025'
  period_end_date               DATE NOT NULL,             -- 2025-12-31
  headcount                     INTEGER,                   -- ONS Table 8 HC, rounded to 5
  fte                           NUMERIC(10,1),             -- ONS Table 8 FTE
  prior_quarter_headcount       INTEGER,
  change_from_previous_percent  NUMERIC(6,2),
  is_proxy                      BOOLEAN NOT NULL DEFAULT FALSE,
  proxy_note                    TEXT,                      -- e.g. "Aggregated under Attorney General's departments — includes CPS, SFO, GLD"
  source                        TEXT NOT NULL DEFAULT 'ons_pse_table8',
  source_file_url               TEXT,
  updated_at                    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (department_slug, period_end_date)
);
CREATE INDEX IF NOT EXISTS idx_dept_staffing_dept   ON department_staffing (department_slug);
CREATE INDEX IF NOT EXISTS idx_dept_staffing_period ON department_staffing (period_end_date DESC);


-- 3. department_budgets ------------------------------------------------------

CREATE TABLE IF NOT EXISTS department_budgets (
  id                              BIGSERIAL PRIMARY KEY,
  department_slug                 TEXT NOT NULL,
  financial_year                  TEXT NOT NULL,           -- '2026-27'
  is_outturn                      BOOLEAN NOT NULL DEFAULT FALSE,
  resource_del_millions           NUMERIC(12,2),
  resource_del_ex_depr_millions   NUMERIC(12,2),           -- PESA Table 1.5 — apples-to-apples after 26-27
  capital_del_millions            NUMERIC(12,2),
  total_del_millions              NUMERIC(12,2),
  ame_millions                    NUMERIC(12,2),           -- material only for work-pensions; nullable
  change_from_previous_percent    NUMERIC(6,2),
  editorial_prose                 TEXT,                    -- migrated from lib/department-budgets.ts
  caveat_note                     TEXT,                    -- e.g. "Mains 26-27 reclassified RDEL depreciation to AME"
  source                          TEXT NOT NULL DEFAULT 'hmt_main_estimates',
  source_file_url                 TEXT,
  source_release_date             DATE,
  updated_at                      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (department_slug, financial_year, source)
);
CREATE INDEX IF NOT EXISTS idx_dept_budgets_dept ON department_budgets (department_slug);
CREATE INDEX IF NOT EXISTS idx_dept_budgets_year ON department_budgets (financial_year DESC);


-- 4. RLS — anon read, consistent with other transparency tables --------------

ALTER TABLE department_staffing ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_budgets  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read department staffing" ON department_staffing FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can read department budgets"  ON department_budgets  FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
