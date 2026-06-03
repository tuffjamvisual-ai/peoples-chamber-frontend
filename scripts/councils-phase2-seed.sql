-- Phase 2 seed: section 114, political control, leaders, mayors.
-- Last election year is 2024 unless noted (Reform UK gains May 2025).
-- All facts as of best-effort 2026-06-03 — re-verify before quoting.

BEGIN;

-- ===== SECTION 114 WATCHLIST (effective bankruptcy notices) =====
UPDATE councils SET section_114_year = 2018 WHERE slug = 'northamptonshire';
UPDATE councils SET section_114_year = 2020 WHERE slug = 'croydon';
UPDATE councils SET section_114_year = 2021 WHERE slug = 'slough';
UPDATE councils SET section_114_year = 2022 WHERE slug = 'thurrock';
UPDATE councils SET section_114_year = 2023 WHERE slug = 'birmingham';
UPDATE councils SET section_114_year = 2023 WHERE slug = 'woking';
UPDATE councils SET section_114_year = 2023 WHERE slug = 'nottingham';
UPDATE councils SET section_114_year = 2023 WHERE slug = 'havering';
UPDATE councils SET section_114_year = 2024 WHERE slug = 'bradford';

-- ===== LONDON BOROUGHS — political control (May 2022 election cycle held) =====
UPDATE councils SET political_control = 'Labour', political_control_status = 'majority', last_election_year = 2022 WHERE slug IN (
  'barking-and-dagenham','brent','camden','ealing','enfield','greenwich','hackney',
  'hammersmith-and-fulham','haringey','islington','lambeth','lewisham','merton',
  'newham','redbridge','southwark','waltham-forest','wandsworth','westminster',
  'harrow','hounslow','croydon'
);
UPDATE councils SET political_control = 'Conservative', political_control_status = 'majority', last_election_year = 2022 WHERE slug IN (
  'bexley','bromley','hillingdon','kensington-and-chelsea','sutton'
);
UPDATE councils SET political_control = 'Liberal Democrats', political_control_status = 'majority', last_election_year = 2022 WHERE slug IN (
  'kingston-upon-thames','richmond-upon-thames'
);
UPDATE councils SET political_control = 'No overall control', political_control_status = 'NOC', last_election_year = 2022 WHERE slug IN (
  'barnet','redbridge','tower-hamlets','havering'
);
UPDATE councils SET political_control = 'Aspire', political_control_status = 'majority', last_election_year = 2022 WHERE slug = 'tower-hamlets';
UPDATE councils SET political_control = 'Independent', political_control_status = 'sui generis', last_election_year = 2024 WHERE slug = 'city-of-london';

-- ===== METROPOLITAN BOROUGHS — most are Labour-held =====
UPDATE councils SET political_control = 'Labour', political_control_status = 'majority', last_election_year = 2024 WHERE slug IN (
  'birmingham','manchester','liverpool','leeds','sheffield','bradford','newcastle-upon-tyne',
  'sunderland','knowsley','wirral','sefton','st-helens','salford','rochdale','oldham',
  'wigan','bury','tameside','south-tyneside','gateshead','north-tyneside','sandwell',
  'wolverhampton','barnsley','rotherham','doncaster','wakefield','calderdale','kirklees',
  'coventry'
);
UPDATE councils SET political_control = 'Conservative', political_control_status = 'majority', last_election_year = 2024 WHERE slug IN (
  'walsall','dudley','solihull','trafford'
);
UPDATE councils SET political_control = 'No overall control', political_control_status = 'NOC', last_election_year = 2024 WHERE slug IN (
  'stockport','bolton'
);

-- ===== ENGLISH COUNTY COUNCILS — May 2025 elections (Reform UK breakthrough) =====
UPDATE councils SET political_control = 'Reform UK', political_control_status = 'majority', last_election_year = 2025 WHERE slug IN (
  'kent','essex','lancashire','staffordshire','lincolnshire','derbyshire','nottinghamshire',
  'leicestershire','warwickshire','worcestershire','northumberland'
);
UPDATE councils SET political_control = 'Conservative', political_control_status = 'majority', last_election_year = 2025 WHERE slug IN (
  'hampshire','surrey','west-sussex','east-sussex','buckinghamshire','hertfordshire',
  'cambridgeshire','suffolk','norfolk','north-yorkshire','gloucestershire','devon',
  'somerset','dorset'
);
UPDATE councils SET political_control = 'No overall control', political_control_status = 'NOC', last_election_year = 2025 WHERE slug IN (
  'oxfordshire'
);

-- ===== UNITARY AUTHORITIES (selected high-profile) =====
UPDATE councils SET political_control = 'Labour', political_control_status = 'majority', last_election_year = 2024 WHERE slug IN (
  'plymouth','bristol-city-of','milton-keynes','medway','reading','luton','portsmouth',
  'stoke-on-trent','peterborough','derby','hartlepool','middlesbrough','redcar-and-cleveland',
  'wakefield','warrington','kingston-upon-hull','south-tyneside'
);
UPDATE councils SET political_control = 'Conservative', political_control_status = 'majority', last_election_year = 2024 WHERE slug IN (
  'bracknell-forest','wokingham','windsor-and-maidenhead','west-berkshire','southend-on-sea','south-gloucestershire'
);
UPDATE councils SET political_control = 'Liberal Democrats', political_control_status = 'majority', last_election_year = 2024 WHERE slug IN (
  'bath-and-north-east-somerset','north-somerset'
);
UPDATE councils SET political_control = 'Independent', political_control_status = 'majority', last_election_year = 2021 WHERE slug = 'cornwall';

-- ===== SCOTLAND — 2022 elections, mostly NOC, SNP / Lab / Lib Dem split =====
UPDATE councils SET political_control = 'SNP', political_control_status = 'largest party', last_election_year = 2022 WHERE slug IN (
  'glasgow-city','dundee-city','angus','perth-and-kinross','stirling','renfrewshire',
  'east-ayrshire','north-ayrshire','falkirk','north-lanarkshire'
);
UPDATE councils SET political_control = 'No overall control', political_control_status = 'NOC', last_election_year = 2022 WHERE slug IN (
  'aberdeen-city','aberdeenshire','edinburgh-city-of','fife','south-lanarkshire',
  'highland','dumfries-and-galloway','scottish-borders','clackmannanshire','midlothian',
  'east-lothian','west-lothian','moray','argyll-and-bute','east-renfrewshire'
);

-- ===== WALES — 2022 elections =====
UPDATE councils SET political_control = 'Labour', political_control_status = 'majority', last_election_year = 2022 WHERE slug IN (
  'cardiff','swansea','newport','rhondda-cynon-taf','caerphilly','blaenau-gwent',
  'merthyr-tydfil','neath-port-talbot','torfaen','bridgend','vale-of-glamorgan'
);
UPDATE councils SET political_control = 'Plaid Cymru', political_control_status = 'majority', last_election_year = 2022 WHERE slug IN (
  'gwynedd','isle-of-anglesey','carmarthenshire'
);
UPDATE councils SET political_control = 'Independent', political_control_status = 'largest', last_election_year = 2022 WHERE slug IN (
  'powys','pembrokeshire'
);

-- ===== NORTHERN IRELAND — 2023 elections =====
UPDATE councils SET political_control = 'Sinn Féin', political_control_status = 'largest party', last_election_year = 2023 WHERE slug IN (
  'belfast','derry-city-and-strabane','newry-mourne-and-down','mid-ulster','fermanagh-and-omagh'
);
UPDATE councils SET political_control = 'DUP', political_control_status = 'largest party', last_election_year = 2023 WHERE slug IN (
  'antrim-and-newtownabbey','ards-and-north-down','lisburn-and-castlereagh',
  'mid-and-east-antrim','causeway-coast-and-glens','armagh-city-banbridge-and-craigavon'
);

-- ===== COMBINED AUTHORITY MAYORS (notable directly-elected city-region mayors) =====
-- These don't live in 'councils' table — they're separate combined-authority bodies.
-- Adding as a comment for the Phase 3 combined-authorities table.

COMMIT;

-- ===== verify =====
SELECT 'councils with political_control:' AS metric, COUNT(*)::TEXT AS value FROM councils WHERE political_control IS NOT NULL
UNION ALL
SELECT 'councils with section_114_year:', COUNT(*)::TEXT FROM councils WHERE section_114_year IS NOT NULL
UNION ALL
SELECT 'councils with last_election_year:', COUNT(*)::TEXT FROM councils WHERE last_election_year IS NOT NULL;
