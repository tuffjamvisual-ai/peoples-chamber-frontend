-- Applied on the owner's yes, 7 Nov 2026. A changed_at column on historic_commons_divisions and pmqs_archive_exchanges, set by trigger on every UPDATE. A nullable column with no default rewrites nothing. The rows already corrected are given the time their migration was applied: 2026-11-06j and k at 23:46:18 GMT on 6 Nov, 2026-11-07a at 02:13:46 GMT on 7 Nov. All other rows stay null. The trigger is created after the fill, so the fill keeps those times. A different row count rolls back.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.historic_commons_divisions ADD COLUMN changed_at timestamptz;
ALTER TABLE public.pmqs_archive_exchanges ADD COLUMN changed_at timestamptz;
CREATE TEMP TABLE _div (external_id text PRIMARY KEY, at timestamptz NOT NULL) ON COMMIT DROP;
INSERT INTO _div VALUES
('06070584001524', '2026-11-06 23:46:18+00'::timestamptz),
('06110169001449', '2026-11-06 23:46:18+00'::timestamptz),
('07032881000852', '2026-11-06 23:46:18+00'::timestamptz),
('07032881000853', '2026-11-06 23:46:18+00'::timestamptz),
('07062062000722', '2026-11-06 23:46:18+00'::timestamptz),
('070718105000444', '2026-11-06 23:46:18+00'::timestamptz),
('07072614000812', '2026-11-06 23:46:18+00'::timestamptz),
('07112878001698', '2026-11-06 23:46:18+00'::timestamptz),
('080220117000428', '2026-11-06 23:46:18+00'::timestamptz),
('08040270001642', '2026-11-06 23:46:18+00'::timestamptz),
('08042377001638', '2026-11-06 23:46:18+00'::timestamptz),
('08051479002439', '2026-11-06 23:46:18+00'::timestamptz),
('08051479002440', '2026-11-06 23:46:18+00'::timestamptz),
('09012174000467', '2026-11-06 23:46:18+00'::timestamptz),
('09031174002873', '2026-11-06 23:46:18+00'::timestamptz),
('09061783002325', '2026-11-06 23:46:18+00'::timestamptz),
('09070186001717', '2026-11-06 23:46:18+00'::timestamptz),
('09070898003462', '2026-11-06 23:46:18+00'::timestamptz),
('09120965000673', '2026-11-06 23:46:18+00'::timestamptz),
('10020396001321', '2026-11-06 23:46:18+00'::timestamptz),
('10020396001322', '2026-11-06 23:46:18+00'::timestamptz),
('10030467000877', '2026-11-06 23:46:18+00'::timestamptz),
('10031743002460', '2026-11-06 23:46:18+00'::timestamptz),
('10031743002461', '2026-11-06 23:46:18+00'::timestamptz),
('10031743002462', '2026-11-06 23:46:18+00'::timestamptz),
('10031743002463', '2026-11-06 23:46:18+00'::timestamptz),
('1004088001557', '2026-11-06 23:46:18+00'::timestamptz),
('1007226001191', '2026-11-06 23:46:18+00'::timestamptz),
('10112477002221', '2026-11-06 23:46:18+00'::timestamptz),
('10120164000666', '2026-11-06 23:46:18+00'::timestamptz),
('10121541000553', '2026-11-06 23:46:18+00'::timestamptz),
('11020978001399', '2026-11-06 23:46:18+00'::timestamptz),
('11020978001400', '2026-11-06 23:46:18+00'::timestamptz),
('11020978001401', '2026-11-06 23:46:18+00'::timestamptz),
('110316131000457', '2026-11-06 23:46:18+00'::timestamptz),
('11032395000463', '2026-11-06 23:46:18+00'::timestamptz),
('11033083000572', '2026-11-06 23:46:18+00'::timestamptz),
('11042792000501', '2026-11-06 23:46:18+00'::timestamptz),
('11071379001550', '2026-11-06 23:46:18+00'::timestamptz),
('11071379001551', '2026-11-06 23:46:18+00'::timestamptz),
('11091499001604', '2026-11-06 23:46:18+00'::timestamptz),
('11112385003210', '2026-11-06 23:46:18+00'::timestamptz),
('12012538002398', '2026-11-06 23:46:18+00'::timestamptz),
('12012538002399', '2026-11-06 23:46:18+00'::timestamptz),
('12020189002878', '2026-11-06 23:46:18+00'::timestamptz),
('12020189002879', '2026-11-06 23:46:18+00'::timestamptz),
('12020189002880', '2026-11-06 23:46:18+00'::timestamptz),
('12020189002881', '2026-11-06 23:46:18+00'::timestamptz),
('12020854003724', '2026-11-06 23:46:18+00'::timestamptz),
('12020854003725', '2026-11-06 23:46:18+00'::timestamptz),
('12020854003726', '2026-11-06 23:46:18+00'::timestamptz),
('12020854003727', '2026-11-06 23:46:18+00'::timestamptz),
('12020854003728', '2026-11-06 23:46:18+00'::timestamptz),
('12020854003729', '2026-11-06 23:46:18+00'::timestamptz),
('12020854003730', '2026-11-06 23:46:18+00'::timestamptz),
('12030785000667', '2026-11-06 23:46:18+00'::timestamptz),
('120620105001713', '2026-11-06 23:46:18+00'::timestamptz),
('12062776004314', '2026-11-06 23:46:18+00'::timestamptz),
('12062776004315', '2026-11-06 23:46:18+00'::timestamptz),
('12062776004316', '2026-11-06 23:46:18+00'::timestamptz),
('120704104001289', '2026-11-06 23:46:18+00'::timestamptz),
('120704104001290', '2026-11-06 23:46:18+00'::timestamptz),
('12101775002308', '2026-11-06 23:46:18+00'::timestamptz),
('12101775002309', '2026-11-06 23:46:18+00'::timestamptz),
('12102465001292', '2026-11-06 23:46:18+00'::timestamptz),
('12112190000696', '2026-11-06 23:46:18+00'::timestamptz),
('12120570001996', '2026-11-06 23:46:18+00'::timestamptz),
('12120570001997', '2026-11-06 23:46:18+00'::timestamptz),
('1301172000500', '2026-11-06 23:46:18+00'::timestamptz),
('13021388002031', '2026-11-06 23:46:18+00'::timestamptz),
('13021388002032', '2026-11-06 23:46:18+00'::timestamptz),
('13031374003389', '2026-11-06 23:46:18+00'::timestamptz),
('13031374003390', '2026-11-06 23:46:18+00'::timestamptz),
('13031374003391', '2026-11-06 23:46:18+00'::timestamptz),
('13031374003392', '2026-11-06 23:46:18+00'::timestamptz),
('13061288000560', '2026-11-06 23:46:18+00'::timestamptz),
('13062694001553', '2026-11-06 23:46:18+00'::timestamptz),
('1307114000481', '2026-11-06 23:46:18+00'::timestamptz),
('1307185002223', '2026-11-06 23:46:18+00'::timestamptz),
('1307185002224', '2026-11-06 23:46:18+00'::timestamptz),
('1307185002225', '2026-11-06 23:46:18+00'::timestamptz),
('1307185002226', '2026-11-06 23:46:18+00'::timestamptz),
('13103075001529', '2026-11-06 23:46:18+00'::timestamptz),
('13120511002211', '2026-11-06 23:46:18+00'::timestamptz),
('13120511002212', '2026-11-06 23:46:18+00'::timestamptz),
('140122107003340', '2026-11-06 23:46:18+00'::timestamptz),
('14021317000499', '2026-11-06 23:46:18+00'::timestamptz),
('14030577003514', '2026-11-06 23:46:18+00'::timestamptz),
('14030577003515', '2026-11-06 23:46:18+00'::timestamptz),
('14030577003516', '2026-11-06 23:46:18+00'::timestamptz),
('14030577003517', '2026-11-06 23:46:18+00'::timestamptz),
('14030577003518', '2026-11-06 23:46:18+00'::timestamptz),
('14030577003519', '2026-11-06 23:46:18+00'::timestamptz),
('14050791003108', '2026-11-06 23:46:18+00'::timestamptz),
('14061889000493', '2026-11-06 23:46:18+00'::timestamptz),
('14070981001513', '2026-11-06 23:46:18+00'::timestamptz),
('14071677001334', '2026-11-06 23:46:18+00'::timestamptz),
('14102288000858', '2026-11-06 23:46:18+00'::timestamptz),
('15031186000775', '2026-11-06 23:46:18+00'::timestamptz),
('150325101001668', '2026-11-06 23:46:18+00'::timestamptz),
('15102846001454', '2026-11-06 23:46:18+00'::timestamptz),
('15121646000878', '2026-11-06 23:46:18+00'::timestamptz),
('160210122002104', '2026-11-06 23:46:18+00'::timestamptz),
('16022459001638', '2026-11-06 23:46:18+00'::timestamptz),
('16022459001639', '2026-11-06 23:46:18+00'::timestamptz),
('06070584001525', '2026-11-07 02:13:46+00'::timestamptz),
('08050789001018', '2026-11-07 02:13:46+00'::timestamptz),
('08102255003926', '2026-11-07 02:13:46+00'::timestamptz),
('09031174002874', '2026-11-07 02:13:46+00'::timestamptz),
('09031174002875', '2026-11-07 02:13:46+00'::timestamptz),
('09040169001278', '2026-11-07 02:13:46+00'::timestamptz),
('09040169001279', '2026-11-07 02:13:46+00'::timestamptz),
('09051375002746', '2026-11-07 02:13:46+00'::timestamptz),
('09070186001718', '2026-11-07 02:13:46+00'::timestamptz),
('09070898003468', '2026-11-07 02:13:46+00'::timestamptz),
('09071581001232', '2026-11-07 02:13:46+00'::timestamptz),
('09112537001255', '2026-11-07 02:13:46+00'::timestamptz),
('10012088001077', '2026-11-07 02:13:46+00'::timestamptz),
('12011187000607', '2026-11-07 02:13:46+00'::timestamptz);
CREATE TEMP TABLE _pm (date date, item_order integer, at timestamptz NOT NULL) ON COMMIT DROP;
INSERT INTO _pm VALUES
('1961-12-07'::date, 13, '2026-11-06 23:46:18+00'::timestamptz),
('1963-04-02'::date, 29, '2026-11-06 23:46:18+00'::timestamptz),
('1965-12-07'::date, 1, '2026-11-06 23:46:18+00'::timestamptz),
('1966-07-07'::date, 57, '2026-11-06 23:46:18+00'::timestamptz),
('1971-05-20'::date, 1, '2026-11-06 23:46:18+00'::timestamptz),
('1977-07-28'::date, 7, '2026-11-06 23:46:18+00'::timestamptz),
('1980-05-08'::date, 24, '2026-11-06 23:46:18+00'::timestamptz),
('2013-10-23'::date, 56, '2026-11-06 23:46:18+00'::timestamptz),
('2015-03-25'::date, 63, '2026-11-06 23:46:18+00'::timestamptz),
('1963-04-02'::date, 30, '2026-11-07 02:13:46+00'::timestamptz),
('1963-04-02'::date, 31, '2026-11-07 02:13:46+00'::timestamptz);
DO $fix$
DECLARE n integer;
BEGIN
  UPDATE public.historic_commons_divisions t SET changed_at = f.at FROM _div f WHERE t.external_id = f.external_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 119 THEN RAISE EXCEPTION 'divisions: expected 119 rows, touched %', n; END IF;
  UPDATE public.pmqs_archive_exchanges t SET changed_at = f.at FROM _pm f WHERE t."date" = f.date AND t.item_order = f.item_order;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 11 THEN RAISE EXCEPTION 'PMQs archive: expected 11 rows, touched %', n; END IF;
END
$fix$;
CREATE FUNCTION public.set_changed_at() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  NEW.changed_at := now();
  RETURN NEW;
END
$fn$;
CREATE TRIGGER set_changed_at BEFORE UPDATE ON public.historic_commons_divisions FOR EACH ROW EXECUTE FUNCTION public.set_changed_at();
CREATE TRIGGER set_changed_at BEFORE UPDATE ON public.pmqs_archive_exchanges FOR EACH ROW EXECUTE FUNCTION public.set_changed_at();
NOTIFY pgrst, 'reload schema';
COMMIT;
