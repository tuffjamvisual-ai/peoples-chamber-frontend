-- Council control clashes found 17 Oct 2026 (reassessment: Guildford said "majority of seats" and
-- "minority administration" at once). Checked against current membership:
--   Guildford: Liberal Democrats 25 of 48 (local-democracy.uk, 5 May 2026; Wikipedia: Lib Dem
--     majority since 2023). The publisher's "LD min" label is wrong; it becomes "LD".
--   Broxtowe: no overall control since January 2025; largest group Broxtowe Alliance 19 of 44
--     (Wikipedia, composition to September 2026). Was shown as majority because the publisher's
--     "other" bucket (24) lumps the Alliance with the Broxtowe Independent Group.
--   Tandridge: Residents' Alliance 20 of 43, short of the 22 needed (tandridge.gov.uk, How the
--     Council is run). Was shown as majority for the same reason.
-- Old values kept in public.council_control_backup_20261017. Rolls back unless each row matches.
\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS public.council_control_backup_20261017 AS
  SELECT c.slug, c.political_control, c.political_control_status, cc.administration_code, now() AS saved_at
  FROM public.councils c LEFT JOIN public.council_composition cc ON cc.council_slug = c.slug
  WHERE c.slug IN ('guildford', 'broxtowe', 'tandridge');
ALTER TABLE public.council_control_backup_20261017 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_control_backup_20261017 FROM anon, authenticated;
DO $do$ DECLARE n int; BEGIN
  UPDATE public.council_composition SET administration_code = 'LD' WHERE council_slug = 'guildford' AND administration_code = 'LD min';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'guildford: % rows', n; END IF;
  UPDATE public.councils SET political_control = 'No overall control', political_control_status = 'NOC (largest: Broxtowe Alliance 19/44)' WHERE slug = 'broxtowe' AND political_control_status = 'majority';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'broxtowe: % rows', n; END IF;
  UPDATE public.councils SET political_control = 'No overall control', political_control_status = 'NOC (largest: Residents'' Alliance 20/43)' WHERE slug = 'tandridge' AND political_control_status = 'majority';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'tandridge: % rows', n; END IF;
END $do$;
SELECT c.slug, c.political_control, c.political_control_status, cc.administration_code FROM public.councils c LEFT JOIN public.council_composition cc ON cc.council_slug = c.slug WHERE c.slug IN ('guildford','broxtowe','tandridge') ORDER BY 1;
COMMIT;
