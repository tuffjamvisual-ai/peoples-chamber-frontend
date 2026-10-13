-- Council financial health (England), and a correction to the councils table.
--
-- council_finance_events: dated events, one row per council, type and period.
--   section_114             a section 114 report (the council formally declared it could
--                           not balance its budget). Verified list, see the import script.
--   exceptional_support     exceptional financial support (EFS) from government for a
--                           financial year (GOV.UK "Exceptional financial support for local
--                           authorities" pages, Open Government Licence).
--   intervention            current statutory intervention (directions, often with
--                           commissioners), from GOV.UK "Statutory best value inspections
--                           and interventions in England".
--   best_value_inspection   a current statutory best value inspection (same GOV.UK list).
--
-- council_reserves: usable reserves per council and financial year, from MHCLG's revenue
--   outturn (RS) individual local authority data (Open Government Licence). Usable
--   reserves = unallocated + other earmarked reserves (schools, dedicated schools grant
--   and public health reserves are ring-fenced and left out). Figures in £ thousands.
--
-- Correction: Barnet never issued a section 114 report (it received exceptional
-- financial support in 2025-26 and 2026-27, which is different). Its section_114_year,
-- filled in earlier from Wikipedia/Wikidata, is cleared.
--
-- Written by scripts/import-council-finance.js (dry run by default; --write to save).

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.council_finance_events (
  council_gss_code  text NOT NULL,
  event_type        text NOT NULL CHECK (event_type IN ('section_114', 'exceptional_support', 'intervention', 'best_value_inspection')),
  period            text NOT NULL,          -- notice date, financial year ('2026-27') or start year
  event_date        date,
  amount_gbp        numeric,                -- exceptional support amount where the page states it clearly
  detail            jsonb,
  source            text NOT NULL,
  source_url        text NOT NULL,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, event_type, period)
);

CREATE TABLE IF NOT EXISTS public.council_reserves (
  council_gss_code                 text NOT NULL,
  financial_year                   text NOT NULL,   -- e.g. '2024-25'
  unallocated_start                numeric,         -- £ thousands, 1 April
  earmarked_start                  numeric,         -- other earmarked (non-ring-fenced), 1 April
  unallocated_end                  numeric,         -- 31 March
  earmarked_end                    numeric,
  usable_start                     numeric,         -- unallocated + other earmarked
  usable_end                       numeric,
  usable_change                    numeric,         -- end - start
  net_revenue_expenditure          numeric,         -- £ thousands, for reference only; the ratio uses total service expenditure (stored in detail)
  usable_end_pct_of_spending       numeric,         -- usable_end / total service expenditure * 100
  detail                           jsonb,
  source                           text NOT NULL,
  source_url                       text NOT NULL,
  synced_at                        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (council_gss_code, financial_year)
);

ALTER TABLE public.council_finance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_reserves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "council_finance_events_anon_read" ON public.council_finance_events;
DROP POLICY IF EXISTS "council_reserves_anon_read" ON public.council_reserves;
CREATE POLICY "council_finance_events_anon_read" ON public.council_finance_events FOR SELECT TO anon USING (true);
CREATE POLICY "council_reserves_anon_read" ON public.council_reserves FOR SELECT TO anon USING (true);

-- Barnet correction: exactly one row must change, or nothing is applied.
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.councils SET section_114_year = NULL
  WHERE gss_code = 'E09000003' AND name ILIKE '%Barnet%' AND section_114_year IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Barnet correction: expected 1 row, changed %', n; END IF;
END $$;

COMMIT;
