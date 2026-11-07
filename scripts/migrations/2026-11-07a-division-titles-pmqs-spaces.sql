-- Applied on the owner's yes, 7 Nov 2026. D1: 11 archive division titles from the official motion wording, and the line break before "The House divided:" on 7 May 2008 no. 171, from the Hansard API. D2: "Proceedings on the" back on 3 bill titles. D3: spaces restored in PMQs rows 30 and 31 on 2 April 1963, whose text matches the Hansard API once spaces are ignored. Every old value is matched exactly; a different row count rolls back.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE _titles (external_id text, old_value text NOT NULL, new_value text NOT NULL) ON COMMIT DROP;
INSERT INTO _titles VALUES
('06070584001525', 'Ambulances (County Durham)', 'Adjourn till Monday 9 October 2006'),
('09031174002874', 'Bassetlaw (Arts)', 'Adjourn till Monday 20 April 2009'),
('09040169001279', 'Nick Cousins', 'Adjourn till Tuesday 5 May 2009'),
('09070186001718', 'Bank Lending Policies', 'Adjourn till Monday 12 October 2009'),
('09112537001255', 'Adoption and Custody (Suffolk)', 'Adjourn till Tuesday 5 January 2010'),
('10012088001077', 'Ex Parte Applications (Family Courts)', 'Adjourn till Monday 22 February 2010'),
('08050789001018', 'South West Regional Spatial Strategy', 'Temporary and Agency Workers (Equal Treatment) Bill'),
('09031174002875', 'Bassetlaw (Arts)', 'European Union Documents Nos. 15944/08 and ADDS 1 to 4'),
('09040169001278', 'Nick Cousins', 'Ecclesiastical Offices (Terms of Service) Measure'),
('09070898003468', 'Taxation of Pensions', 'Preliminary Draft Budget of the European Communities for the year 2010'),
('09071581001232', 'Diageo Closures', 'East Midlands Regional Grand Committee'),
('08102255003926', 'Political Parties and Elections Bill', 'Proceedings on the Political Parties and Elections Bill'),
('09051375002746', 'Equality Bill', 'Proceedings on the Equality Bill'),
('12011187000607', 'Local Government Finance Bill', 'Proceedings on the Local Government Finance Bill');
CREATE TEMP TABLE _pm (date date, item_order integer, old_value text NOT NULL, new_value text NOT NULL) ON COMMIT DROP;
INSERT INTO _pm VALUES
('1963-04-02'::date, 30, 'asked the Prime Minister whether the public statements of the Lord Privy Seal, made during an authorised interview published by the French newspaper,Le Monde,on 28th March to the effect that discussions with the Six about Great Britain''s entry into the European Economic Community should continue, represent the policy of Her Majesty''s Government.', 'asked the Prime Minister whether the public statements of the Lord Privy Seal, made during an authorised interview published by the French newspaper, Le Monde, on 28th March to the effect that discussions with the Six about Great Britain''s entry into the European Economic Community should continue, represent the policy of Her Majesty''s Government.'),
('1963-04-02'::date, 31, 'asked the Prime Minister if the public statements made during an authorised interview by the Lord Privy Seal published in the French newspaper,Le Monde,on 28th March on the British Government''s attitude towards the European Economic Community represent the policy of Her Majesty''s Government.', 'asked the Prime Minister if the public statements made during an authorised interview by the Lord Privy Seal published in the French newspaper, Le Monde, on 28th March on the British Government''s attitude towards the European Economic Community represent the policy of Her Majesty''s Government.');
DO $fix$
DECLARE n integer;
BEGIN
  UPDATE public.historic_commons_divisions t SET title = f.new_value FROM _titles f WHERE t.external_id = f.external_id AND t.title = f.old_value;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 14 THEN RAISE EXCEPTION 'division titles: expected 14 rows, touched %', n; END IF;
  UPDATE public.historic_commons_divisions SET text_before = 'That, for the purposes of any Act resulting from the Temporary and Agency Workers (Equal Treatment) Bill, it is expedient to authorise—
The House divided:' WHERE external_id = '08050789001018' AND text_before = 'That, for the purposes of any Act resulting from the Temporary and Agency Workers (Equal Treatment) Bill, it is expedient to authorise—The House divided:';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'division text: expected 1 row, touched %', n; END IF;
  UPDATE public.pmqs_archive_exchanges t SET contribution_text = f.new_value FROM _pm f WHERE t."date" = f.date AND t.item_order = f.item_order AND t.contribution_text = f.old_value;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'PMQs archive: expected 2 rows, touched %', n; END IF;
END
$fix$;
COMMIT;
