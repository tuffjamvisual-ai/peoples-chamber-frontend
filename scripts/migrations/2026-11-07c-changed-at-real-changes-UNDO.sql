-- UNDO for 2026-11-07c-changed-at-real-changes.sql: puts back the triggers from 2026-11-07b, which set changed_at on every UPDATE, and the function body from 2026-11-07b. No row data changed.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.set_changed_at() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  NEW.changed_at := now();
  RETURN NEW;
END
$fn$;
CREATE OR REPLACE TRIGGER set_changed_at BEFORE UPDATE ON public.historic_commons_divisions FOR EACH ROW EXECUTE FUNCTION public.set_changed_at();
CREATE OR REPLACE TRIGGER set_changed_at BEFORE UPDATE ON public.pmqs_archive_exchanges FOR EACH ROW EXECUTE FUNCTION public.set_changed_at();
COMMIT;
