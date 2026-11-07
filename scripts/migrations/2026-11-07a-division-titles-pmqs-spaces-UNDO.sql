-- UNDO for 2026-11-07a-division-titles-pmqs-spaces.sql: puts every old value back. Matches the new values exactly; a different row count rolls back.
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE _titles (external_id text, old_value text NOT NULL, new_value text NOT NULL) ON COMMIT DROP;
INSERT INTO _titles VALUES
('06070584001525', 'Adjourn till Monday 9 October 2006', 'Ambulances (County Durham)'),
('09031174002874', 'Adjourn till Monday 20 April 2009', 'Bassetlaw (Arts)'),
('09040169001279', 'Adjourn till Tuesday 5 May 2009', 'Nick Cousins'),
('09070186001718', 'Adjourn till Monday 12 October 2009', 'Bank Lending Policies'),
('09112537001255', 'Adjourn till Tuesday 5 January 2010', 'Adoption and Custody (Suffolk)'),
('10012088001077', 'Adjourn till Monday 22 February 2010', 'Ex Parte Applications (Family Courts)'),
('08050789001018', 'Temporary and Agency Workers (Equal Treatment) Bill', 'South West Regional Spatial Strategy'),
('09031174002875', 'European Union Documents Nos. 15944/08 and ADDS 1 to 4', 'Bassetlaw (Arts)'),
('09040169001278', 'Ecclesiastical Offices (Terms of Service) Measure', 'Nick Cousins'),
('09070898003468', 'Preliminary Draft Budget of the European Communities for the year 2010', 'Taxation of Pensions'),
('09071581001232', 'East Midlands Regional Grand Committee', 'Diageo Closures'),
('08102255003926', 'Proceedings on the Political Parties and Elections Bill', 'Political Parties and Elections Bill'),
('09051375002746', 'Proceedings on the Equality Bill', 'Equality Bill'),
('12011187000607', 'Proceedings on the Local Government Finance Bill', 'Local Government Finance Bill');
CREATE TEMP TABLE _pm (date date, item_order integer, old_value text NOT NULL, new_value text NOT NULL) ON COMMIT DROP;
INSERT INTO _pm VALUES
('1963-04-02'::date, 30, 'asked the Prime Minister whether the public statements of the Lord Privy Seal, made during an authorised interview published by the French newspaper, Le Monde, on 28th March to the effect that discussions with the Six about Great Britain''s entry into the European Economic Community should continue, represent the policy of Her Majesty''s Government.', 'asked the Prime Minister whether the public statements of the Lord Privy Seal, made during an authorised interview published by the French newspaper,Le Monde,on 28th March to the effect that discussions with the Six about Great Britain''s entry into the European Economic Community should continue, represent the policy of Her Majesty''s Government.'),
('1963-04-02'::date, 31, 'asked the Prime Minister if the public statements made during an authorised interview by the Lord Privy Seal published in the French newspaper, Le Monde, on 28th March on the British Government''s attitude towards the European Economic Community represent the policy of Her Majesty''s Government.', 'asked the Prime Minister if the public statements made during an authorised interview by the Lord Privy Seal published in the French newspaper,Le Monde,on 28th March on the British Government''s attitude towards the European Economic Community represent the policy of Her Majesty''s Government.');
DO $fix$
DECLARE n integer;
BEGIN
  UPDATE public.historic_commons_divisions t SET title = f.new_value FROM _titles f WHERE t.external_id = f.external_id AND t.title = f.old_value;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 14 THEN RAISE EXCEPTION 'division titles: expected 14 rows, touched %', n; END IF;
  UPDATE public.historic_commons_divisions SET text_before = 'That, for the purposes of any Act resulting from the Temporary and Agency Workers (Equal Treatment) Bill, it is expedient to authorise—The House divided:' WHERE external_id = '08050789001018' AND text_before = 'That, for the purposes of any Act resulting from the Temporary and Agency Workers (Equal Treatment) Bill, it is expedient to authorise—
The House divided:';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'division text: expected 1 row, touched %', n; END IF;
  UPDATE public.pmqs_archive_exchanges t SET contribution_text = f.new_value FROM _pm f WHERE t."date" = f.date AND t.item_order = f.item_order AND t.contribution_text = f.old_value;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'PMQs archive: expected 2 rows, touched %', n; END IF;
END
$fix$;
COMMIT;
