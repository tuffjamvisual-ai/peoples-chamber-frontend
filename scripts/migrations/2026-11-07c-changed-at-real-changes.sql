-- Applied on the owner's yes, 7 Nov 2026. The changed_at triggers on historic_commons_divisions and pmqs_archive_exchanges now fire only when a row's values really change, comparing every column except changed_at itself. An UPDATE that changes nothing leaves changed_at as it was. A change to changed_at alone is kept as written. No row data changes, so the 119 and 11 existing dates stay as they are.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE TRIGGER set_changed_at BEFORE UPDATE ON public.historic_commons_divisions FOR EACH ROW
  WHEN ((to_jsonb(OLD) - 'changed_at') IS DISTINCT FROM (to_jsonb(NEW) - 'changed_at'))
  EXECUTE FUNCTION public.set_changed_at();
CREATE OR REPLACE TRIGGER set_changed_at BEFORE UPDATE ON public.pmqs_archive_exchanges FOR EACH ROW
  WHEN ((to_jsonb(OLD) - 'changed_at') IS DISTINCT FROM (to_jsonb(NEW) - 'changed_at'))
  EXECUTE FUNCTION public.set_changed_at();
COMMIT;
