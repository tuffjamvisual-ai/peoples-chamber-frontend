-- 2026-11-04d rows: the 45 "Also see" links the owner approved on 4 Nov 2026, from the rehearsal of
-- scripts/link-organisations.js (46 confirmed, less Airbus to Airbus Defence and Space Ltd, dropped by the owner).
-- Run after 2026-11-04d-organisation-links.sql. Undo: 2026-11-04d-organisation-links-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
INSERT INTO public.organisation_links (lobby_org_id, company_number, matched_spelling, ch_name, ch_status) VALUES
  (1519, '04757301', 'accenture', 'ACCENTURE (UK) LIMITED', 'active'),
  (1301, '06825798', 'age uk', 'AGE UK', 'active'),
  (2720, 'SC268016', 'alexander dennis', 'ALEXANDER DENNIS LIMITED', 'active'),
  (1656, '00395826', 'balfour beatty', 'BALFOUR BEATTY PLC', 'active'),
  (1313, '00048839', 'barclays', 'BARCLAYS PLC', 'active'),
  (2787, '00549410', 'bidfood', 'BIDFOOD LIMITED', 'active'),
  (1348, '04190816', 'bt group', 'BT GROUP PLC', 'active'),
  (2832, '10080864', 'cadent gas', 'CADENT GAS LIMITED', 'active'),
  (2851, '03975999', 'cavendish nuclear', 'CAVENDISH NUCLEAR LIMITED', 'active'),
  (2876, '02140985', 'chiesi', 'CHIESI LIMITED', 'active'),
  (2501, '01074383', 'cranswick', 'CRANSWICK PLC', 'active'),
  (1426, '02366970', 'e on uk', 'E.ON UK LIMITED', 'active'),
  (1344, '03977902', 'google uk', 'GOOGLE UK LIMITED', 'active'),
  (3057, 'OC310989', 'herbert smith freehills', 'HERBERT SMITH FREEHILLS LLP', 'active'),
  (3101, '02755304', 'informed solutions', 'INFORMED SOLUTIONS LIMITED', 'active'),
  (3102, 'FC020086', 'infosys', 'INFOSYS LIMITED', 'active'),
  (1397, '12132713', 'joseph rowntree foundation', 'JOSEPH ROWNTREE FOUNDATION', 'active'),
  (1326, '01417162', 'legal and general group', 'LEGAL & GENERAL GROUP PLC', 'active'),
  (2562, '03476576', 'lgbt foundation', 'LGBT FOUNDATION LTD', 'active'),
  (1380, '03037449', 'london councils', 'LONDON COUNCILS LIMITED', 'active'),
  (1345, '01624297', 'microsoft uk', 'MICROSOFT LIMITED', 'active'),
  (1523, '01243967', 'mott macdonald', 'MOTT MACDONALD LIMITED', 'active'),
  (1390, '01853927', 'national energy action', 'NATIONAL ENERGY ACTION', 'active'),
  (3241, '02912597', 'national youth agency', 'THE NATIONAL YOUTH AGENCY', 'active'),
  (3260, '03271033', 'northern powergrid', 'NORTHERN POWERGRID LIMITED', 'active'),
  (3262, '02366703', 'northumbrian water', 'NORTHUMBRIAN WATER LIMITED', 'active'),
  (3273, '03942880', 'octopus investments', 'OCTOPUS INVESTMENTS LIMITED', 'active'),
  (3275, '02995605', 'oliver wyman', 'OLIVER WYMAN LIMITED', 'active'),
  (1658, '10690039', 'openreach', 'OPENREACH LIMITED', 'active'),
  (2604, '00053723', 'pearson', 'PEARSON PLC', 'active'),
  (1586, '00526209', 'pfizer', 'PFIZER LIMITED', 'active'),
  (2607, '03777037', 'places for people group', 'PLACES FOR PEOPLE GROUP LIMITED', 'active'),
  (2618, '10149826', 'public first', 'PUBLIC FIRST LIMITED', 'active'),
  (1351, 'OC303525', 'pwc', 'PRICEWATERHOUSECOOPERS LLP', 'active'),
  (3344, '13039768', 'rolls royce smr', 'ROLLS-ROYCE SMR LIMITED', 'active'),
  (2640, '03866683', 'skills for care', 'SKILLS FOR CARE LTD', 'active'),
  (3426, '01797726', 'sustrans', 'SUSTRANS', 'active'),
  (2661, 'FC025271', 'tata consultancy services', 'TATA CONSULTANCY SERVICES LIMITED', 'active'),
  (1286, '01200318', 'techuk', 'TECHUK LTD', 'active'),
  (1475, '01778149', 'terrence higgins trust', 'THE TERRENCE HIGGINS TRUST', 'active'),
  (1568, '07054929', 'tokamak energy', 'TOKAMAK ENERGY LTD', 'active'),
  (3473, '02366616', 'united utilities', 'UNITED UTILITIES PLC', 'active'),
  (3497, '02158780', 'victim support', 'VICTIM SUPPORT', 'active'),
  (1436, '01471587', 'vodafone', 'VODAFONE LIMITED', 'active'),
  (3526, 'RC000749', 'zoological society of london', 'THE ZOOLOGICAL SOCIETY OF LONDON', 'active');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.organisation_links) <> 45 THEN RAISE EXCEPTION 'expected 45 links'; END IF;
END $$;
COMMIT;
