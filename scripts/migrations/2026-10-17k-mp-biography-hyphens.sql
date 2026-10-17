-- Step 4 of the house style change (no dashes or hyphens in our own prose): MP biographies.
-- Only mp_biography.political_bio changes. bio_last_reviewed, bio_sources, bio_visible and the
-- review flags are not touched: this is a partial wording edit, not a review.
-- Each phrase must occur exactly once in that MP's text, or the whole run stops.
-- Originals are kept in mp_biography_style_backup_20261017.
\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE public.mp_biography_style_backup_20261017 AS
  SELECT member_id, political_bio, now() AS backed_up_at FROM public.mp_biography WHERE political_bio IS NOT NULL;
ALTER TABLE public.mp_biography_style_backup_20261017 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mp_biography_style_backup_20261017 FROM anon, authenticated;

CREATE FUNCTION pg_temp.swap(mid int, old text, new text) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE v text; c int; n int; BEGIN
  SELECT political_bio INTO v FROM public.mp_biography WHERE member_id = mid;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), old, ''))) / length(old);
  IF c <> 1 THEN RAISE EXCEPTION 'member %: phrase found % times: %', mid, c, left(old, 80); END IF;
  UPDATE public.mp_biography SET political_bio = replace(political_bio, old, new) WHERE member_id = mid;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'member %: % rows', mid, n; END IF;
END $f$;

-- member 146
SELECT pg_temp.swap(146, $t$a serious cross-party attempt$t$, $t$a serious cross party attempt$t$);
SELECT pg_temp.swap(146, $t$trade-union wing. He opposed Starmer's disability-benefit legislation$t$, $t$trade union wing. He opposed Starmer's disability benefit legislation$t$);
SELECT pg_temp.swap(146, $t$straightforward anti-business left-winger$t$, $t$straightforward anti business left winger$t$);
SELECT pg_temp.swap(146, $t$rights by the cut-off date$t$, $t$rights by the cutoff date$t$);
-- member 163
SELECT pg_temp.swap(163, $t$to the Treasury (2006-2007)$t$, $t$to the Treasury (2006 to 2007)$t$);
SELECT pg_temp.swap(163, $t$In 2024 he was re-elected with$t$, $t$In 2024 he was elected again with$t$);
-- member 165
SELECT pg_temp.swap(165, $t$understood as centre-left but$t$, $t$understood as centre left but$t$);
SELECT pg_temp.swap(165, $t$sympathetic soft-left MPs$t$, $t$sympathetic soft left MPs$t$);
SELECT pg_temp.swap(165, $t$parliamentary centre-left to develop$t$, $t$parliamentary centre left to develop$t$);
SELECT pg_temp.swap(165, $t$won its second-reading vote$t$, $t$won its second reading vote$t$);
SELECT pg_temp.swap(165, $t$the promised fan-led review$t$, $t$the promised fan led review$t$);
SELECT pg_temp.swap(165, $t$Crouch's fan-led review$t$, $t$Crouch's fan led review$t$);
SELECT pg_temp.swap(165, $t$statutory fan-engagement standards$t$, $t$statutory fan engagement standards$t$);
SELECT pg_temp.swap(165, $t$backed scrapping the two-child benefit limit$t$, $t$backed scrapping the two child benefit limit$t$);
-- member 177
SELECT pg_temp.swap(177, $t$when a co-operative or community society$t$, $t$when a cooperative or community society$t$);
SELECT pg_temp.swap(177, $t$the 2014 co-operative societies statute$t$, $t$the 2014 cooperative societies statute$t$);
SELECT pg_temp.swap(177, $t$argued for co-operatives and mutuals$t$, $t$argued for cooperatives and mutuals$t$);
-- member 178
SELECT pg_temp.swap(178, $t$placing a long-standing ally$t$, $t$placing a longstanding ally$t$);
SELECT pg_temp.swap(178, $t$stronger trade-union power$t$, $t$stronger trade union power$t$);
SELECT pg_temp.swap(178, $t$and large-scale borrowing$t$, $t$and large scale borrowing$t$);
SELECT pg_temp.swap(178, $t$balancing day-to-day spending over a rolling five-year period$t$, $t$balancing day to day spending over a rolling five year period$t$);
SELECT pg_temp.swap(178, $t$two general-election manifestos$t$, $t$two general election manifestos$t$);
SELECT pg_temp.swap(178, $t$opposition to the two-child benefit limit$t$, $t$opposition to the two child benefit limit$t$);
-- member 193
SELECT pg_temp.swap(193, $t$strongly pro-Israel$t$, $t$strongly pro Israel$t$);
SELECT pg_temp.swap(193, $t$whether anti-capitalism therefore$t$, $t$whether anti capitalism therefore$t$);
SELECT pg_temp.swap(193, $t$capitalism with anti-Jewish prejudice$t$, $t$capitalism with anti Jewish prejudice$t$);
SELECT pg_temp.swap(193, $t$McDonagh's cross-party group$t$, $t$McDonagh's cross party group$t$);
SELECT pg_temp.swap(193, $t$turn brain-cancer campaigning$t$, $t$turn brain cancer campaigning$t$);
SELECT pg_temp.swap(193, $t$Her own wide-ranging Brain$t$, $t$Her own wide ranging Brain$t$);
SELECT pg_temp.swap(193, $t$review of drug-approval rules, makes rare-cancer research$t$, $t$review of drug approval rules, makes rare cancer research$t$);
SELECT pg_temp.swap(193, $t$vulnerability, ill-health or deaths$t$, $t$vulnerability, ill health or deaths$t$);
SELECT pg_temp.swap(193, $t$A brain-tumour research consortium$t$, $t$A brain tumour research consortium$t$);
SELECT pg_temp.swap(193, $t$demonstrated large-scale administrative$t$, $t$demonstrated large scale administrative$t$);
-- member 400
SELECT pg_temp.swap(400, $t$He co-chaired the Ukraine$t$, $t$He was joint chair of the Ukraine$t$);
SELECT pg_temp.swap(400, $t$political decision-making on$t$, $t$political decision making on$t$);
SELECT pg_temp.swap(400, $t$£850 million in 2026-27$t$, $t$£850 million in 2026/27$t$);
-- member 410
SELECT pg_temp.swap(410, $t$Hemsworth by-election$t$, $t$Hemsworth byelection$t$);
SELECT pg_temp.swap(410, $t$counter-terrorism powers$t$, $t$counterterrorism powers$t$);
SELECT pg_temp.swap(410, $t$market-led public-service reform$t$, $t$market led public service reform$t$);
SELECT pg_temp.swap(410, $t$shadow-cabinet resignations$t$, $t$shadow cabinet resignations$t$);
SELECT pg_temp.swap(410, $t$economic decision-making$t$, $t$economic decision making$t$);
SELECT pg_temp.swap(410, $t$combine left-wing economics$t$, $t$combine left wing economics$t$);
SELECT pg_temp.swap(410, $t$pro-Brexit electorate$t$, $t$pro Brexit electorate$t$);
SELECT pg_temp.swap(410, $t$remain-supporting party$t$, $t$remain supporting party$t$);
SELECT pg_temp.swap(410, $t$means-tested support$t$, $t$means tested support$t$);
SELECT pg_temp.swap(410, $t$long-running political pressure$t$, $t$long running political pressure$t$);
SELECT pg_temp.swap(410, $t$post-industrial electorate$t$, $t$postindustrial electorate$t$);
SELECT pg_temp.swap(410, $t$effective left-wing strategist$t$, $t$effective left wing strategist$t$);
SELECT pg_temp.swap(410, $t$calling for the two-child benefit limit to be abolished$t$, $t$calling for the two child benefit limit to be abolished$t$);
-- member 413
SELECT pg_temp.swap(413, $t$debt-relief programme$t$, $t$debt relief programme$t$);
SELECT pg_temp.swap(413, $t$anti-poverty focus$t$, $t$anti poverty focus$t$);
SELECT pg_temp.swap(413, $t$short-term foreign-policy goals$t$, $t$short term foreign policy goals$t$);
SELECT pg_temp.swap(413, $t$post-war planning$t$, $t$postwar planning$t$);
SELECT pg_temp.swap(413, $t$five-year carbon budgets$t$, $t$five year carbon budgets$t$);
SELECT pg_temp.swap(413, $t$flood-defence spending$t$, $t$flood defence spending$t$);
SELECT pg_temp.swap(413, $t$by 2010–11$t$, $t$by 2010/11$t$);
SELECT pg_temp.swap(413, $t$a much larger United States-led operation$t$, $t$a much larger operation led by the United States$t$);
SELECT pg_temp.swap(413, $t$longer-term settlement$t$, $t$longer term settlement$t$);
SELECT pg_temp.swap(413, $t$shadow-cabinet resignations$t$, $t$shadow cabinet resignations$t$);
SELECT pg_temp.swap(413, $t$no-confidence vote$t$, $t$no confidence vote$t$);
SELECT pg_temp.swap(413, $t$pro-European Labour$t$, $t$pro European Labour$t$);
SELECT pg_temp.swap(413, $t$The UK-Irish agreement$t$, $t$The agreement between the UK and the Irish government$t$);
SELECT pg_temp.swap(413, $t$cross-party authority$t$, $t$cross party authority$t$);
-- member 415
SELECT pg_temp.swap(415, $t$Liz Davies, the left-wing candidate$t$, $t$Liz Davies, the left wing candidate$t$);
SELECT pg_temp.swap(415, $t$promoted nuclear non-proliferation$t$, $t$promoted nuclear nonproliferation$t$);
SELECT pg_temp.swap(415, $t$to resume large-scale housebuilding$t$, $t$to resume large scale housebuilding$t$);
SELECT pg_temp.swap(415, $t$illegally modified e-bikes$t$, $t$illegally modified electric bikes$t$);
SELECT pg_temp.swap(415, $t$developed stronger product-safety rules$t$, $t$developed stronger product safety rules$t$);
SELECT pg_temp.swap(415, $t$gave him a government-backed diplomatic$t$, $t$gave him a government backed diplomatic$t$);
SELECT pg_temp.swap(415, $t$of MPs' second-home claims later found mortgage-interest overpayments$t$, $t$of MPs' second home claims later found mortgage interest overpayments$t$);
-- member 420
SELECT pg_temp.swap(420, $t$a two-state solution$t$, $t$a two state solution$t$);
-- member 429
SELECT pg_temp.swap(429, $t$first cross-government welfare$t$, $t$first cross government welfare$t$);
SELECT pg_temp.swap(429, $t$the party-management route$t$, $t$the party management route$t$);
SELECT pg_temp.swap(429, $t$towards step-free routes$t$, $t$towards step free routes$t$);
SELECT pg_temp.swap(429, $t$establish the cross-government approach$t$, $t$establish the cross government approach$t$);
SELECT pg_temp.swap(429, $t$criticised, mental-health provision$t$, $t$criticised, mental health provision$t$);
SELECT pg_temp.swap(429, $t$community mental-health services$t$, $t$community mental health services$t$);
SELECT pg_temp.swap(429, $t$security-minded wing$t$, $t$security minded wing$t$);
SELECT pg_temp.swap(429, $t$opposed same-sex marriage$t$, $t$opposed same sex marriage$t$);
SELECT pg_temp.swap(429, $t$resisted assisted-dying legislation$t$, $t$resisted assisted dying legislation$t$);
SELECT pg_temp.swap(429, $t$a well-targeted programme$t$, $t$a well targeted programme$t$);
-- member 449
SELECT pg_temp.swap(449, $t$a policy trade-off$t$, $t$a policy tradeoff$t$);
SELECT pg_temp.swap(449, $t$a long-standing Labour Eurosceptic$t$, $t$a longstanding Labour Eurosceptic$t$);
SELECT pg_temp.swap(449, $t$against a customs-union safeguard$t$, $t$against a customs union safeguard$t$);
SELECT pg_temp.swap(449, $t$an anti-net-zero rally$t$, $t$an anti net zero rally$t$);
SELECT pg_temp.swap(449, $t$executive and coalition-builder$t$, $t$executive and coalition builder$t$);
-- member 473
SELECT pg_temp.swap(473, $t$at a by-election in November 2000$t$, $t$at a byelection in November 2000$t$);
SELECT pg_temp.swap(473, $t$of Anglo-Somali descent$t$, $t$of Anglo Somali descent$t$);
SELECT pg_temp.swap(473, $t$an Anglo-Somali Chartered$t$, $t$an Anglo Somali Chartered$t$);
SELECT pg_temp.swap(473, $t$he was re-elected with 14,006$t$, $t$he was elected again with 14,006$t$);
-- member 483
SELECT pg_temp.swap(483, $t$and—following boundary changes—Liverpool Garston again$t$, $t$and (following boundary changes) Liverpool Garston again$t$);
SELECT pg_temp.swap(483, $t$state-led investment$t$, $t$state led investment$t$);
SELECT pg_temp.swap(483, $t$stronger trade-union and tenant$t$, $t$stronger trade union and tenant$t$);
SELECT pg_temp.swap(483, $t$Hillsborough breakthrough—the families and survivors drove the campaign—but$t$, $t$Hillsborough breakthrough (the families and survivors drove the campaign), but$t$);
SELECT pg_temp.swap(483, $t$mine-countermeasures vessel$t$, $t$mine countermeasures vessel$t$);
SELECT pg_temp.swap(483, $t$counter-drone systems$t$, $t$counter drone systems$t$);
SELECT pg_temp.swap(483, $t$programmes—many begun before she became minister—but$t$, $t$programmes (many begun before she became minister), but$t$);
SELECT pg_temp.swap(483, $t$in 2024–25 followed$t$, $t$in 2024/25 followed$t$);
SELECT pg_temp.swap(483, $t$non-competitive sourcing$t$, $t$non competitive sourcing$t$);
SELECT pg_temp.swap(483, $t$strategic factors—not simply one junior minister—but$t$, $t$strategic factors (not simply one junior minister), but$t$);
SELECT pg_temp.swap(483, $t$longer-term reform$t$, $t$longer term reform$t$);
SELECT pg_temp.swap(483, $t$low-scandal career$t$, $t$low scandal career$t$);
SELECT pg_temp.swap(483, $t$institutional justice—but only$t$, $t$institutional justice, but only$t$);
-- member 491
SELECT pg_temp.swap(491, $t$older social-democratic tradition$t$, $t$older social democratic tradition$t$);
SELECT pg_temp.swap(491, $t$two anti-Corbyn candidates$t$, $t$two anti Corbyn candidates$t$);
SELECT pg_temp.swap(491, $t$and nature-friendly farming$t$, $t$and nature friendly farming$t$);
SELECT pg_temp.swap(491, $t$the cash-flow crisis$t$, $t$the cash flow crisis$t$);
-- member 529
SELECT pg_temp.swap(529, $t$most durable power-brokers$t$, $t$most durable power brokers$t$);
SELECT pg_temp.swap(529, $t$While better-known MPs$t$, $t$While better known MPs$t$);
SELECT pg_temp.swap(529, $t$a factional standard-bearer$t$, $t$a factional standard bearer$t$);
SELECT pg_temp.swap(529, $t$Westminster was step-free$t$, $t$Westminster was step free$t$);
SELECT pg_temp.swap(529, $t$serious long-term illnesses$t$, $t$serious long term illnesses$t$);
SELECT pg_temp.swap(529, $t$proposed disability-benefit reductions$t$, $t$proposed disability benefit reductions$t$);
SELECT pg_temp.swap(529, $t$His chief-whip operation$t$, $t$His chief whip operation$t$);
SELECT pg_temp.swap(529, $t$calling for the two-child benefit limit$t$, $t$calling for the two child benefit limit$t$);
-- member 632
SELECT pg_temp.swap(632, $t$chair of general-election strategy$t$, $t$chair of general election strategy$t$);
SELECT pg_temp.swap(632, $t$20-year-old Mhairi Black.$t$, $t$Mhairi Black, aged 20.$t$);
SELECT pg_temp.swap(632, $t$pro-business, internationalist$t$, $t$pro business, internationalist$t$);
SELECT pg_temp.swap(632, $t$is the UK–India free-trade agreement$t$, $t$is the UK and India free trade agreement$t$);
SELECT pg_temp.swap(632, $t$trade strategy and free-trade negotiations$t$, $t$trade strategy and free trade negotiations$t$);
SELECT pg_temp.swap(632, $t$500 jobs plus supply-chain employment$t$, $t$500 jobs plus supply chain employment$t$);
-- member 1171
SELECT pg_temp.swap(1171, $t$terrain: big-state economic$t$, $t$terrain: big state economic$t$);
SELECT pg_temp.swap(1171, $t$committee's 2024-25 priorities$t$, $t$committee's 2024/25 priorities$t$);
SELECT pg_temp.swap(1171, $t$the reported UK-US deal$t$, $t$the reported UK and US deal$t$);
SELECT pg_temp.swap(1171, $t$policing and counter-terrorism$t$, $t$policing and counterterrorism$t$);
SELECT pg_temp.swap(1171, $t$government's crisis-era machinery$t$, $t$government's crisis era machinery$t$);
SELECT pg_temp.swap(1171, $t$damaging self-inflicted messages of the post-2010 Labour$t$, $t$damaging self inflicted messages of the post 2010 Labour$t$);
SELECT pg_temp.swap(1171, $t$is a high-capacity political$t$, $t$is a high capacity political$t$);
-- member 1383
SELECT pg_temp.swap(1383, $t$he was re-elected with$t$, $t$he was elected again with$t$);
-- member 1427
SELECT pg_temp.swap(1427, $t$the Commons at a by-election in June$t$, $t$the Commons at a byelection in June$t$);
SELECT pg_temp.swap(1427, $t$The single-night count$t$, $t$The single night count$t$);
SELECT pg_temp.swap(1427, $t$won the Makerfield by-election on$t$, $t$won the Makerfield byelection on$t$);
SELECT pg_temp.swap(1427, $t$of a five-year programme to end long-term rough$t$, $t$of a five year programme to end long term rough$t$);
-- member 1446
SELECT pg_temp.swap(1446, $t$in a 325-213 final-ballot defeat$t$, $t$in a 325 to 213 final ballot defeat$t$);
SELECT pg_temp.swap(1446, $t$data-sharing reforms$t$, $t$data sharing reforms$t$);
SELECT pg_temp.swap(1446, $t$a 30-sitting-day suspension$t$, $t$a 30 sitting day suspension$t$);
SELECT pg_temp.swap(1446, $t$smart-data schemes$t$, $t$smart data schemes$t$);
SELECT pg_temp.swap(1446, $t$of data-protection complaints$t$, $t$of data protection complaints$t$);
SELECT pg_temp.swap(1446, $t$preserved tariff-free access$t$, $t$preserved tariff free access$t$);
SELECT pg_temp.swap(1446, $t$allowing rights-holders$t$, $t$allowing rights holders$t$);
SELECT pg_temp.swap(1446, $t$rejected it 317-185.$t$, $t$rejected it 317 to 185.$t$);
SELECT pg_temp.swap(1446, $t$abandoned the opt-out model$t$, $t$abandoned the opt out model$t$);
SELECT pg_temp.swap(1446, $t$By the cut-off date there$t$, $t$By the cutoff date there$t$);
-- member 1447
SELECT pg_temp.swap(1447, $t$Chagossian self-determination$t$, $t$Chagossian self determination$t$);
-- member 1489
SELECT pg_temp.swap(1489, $t$or coalition-builder.$t$, $t$or coalition builder.$t$);
SELECT pg_temp.swap(1489, $t$first elected African-Caribbean woman$t$, $t$first elected African Caribbean woman$t$);
SELECT pg_temp.swap(1489, $t$government's youth-engagement programme$t$, $t$government's youth engagement programme$t$);
SELECT pg_temp.swap(1489, $t$political identity—anti-racist, socially progressive, trade-union aligned$t$, $t$political identity: anti racist, socially progressive, trade union aligned$t$);
SELECT pg_temp.swap(1489, $t$In the 2020 deputy-leadership election$t$, $t$In the 2020 deputy leadership election$t$);
SELECT pg_temp.swap(1489, $t$of first-preference votes$t$, $t$of first preference votes$t$);
SELECT pg_temp.swap(1489, $t$introduced a ten-minute-rule bill$t$, $t$introduced a ten minute rule bill$t$);
SELECT pg_temp.swap(1489, $t$a government promise—not the promised$t$, $t$a government promise, not the promised$t$);
SELECT pg_temp.swap(1489, $t$Black and minority-ethnic parliamentarians$t$, $t$Black and minority ethnic parliamentarians$t$);
SELECT pg_temp.swap(1489, $t$her deputy-leadership result$t$, $t$her deputy leadership result$t$);
SELECT pg_temp.swap(1489, $t$agitation and agenda-setting$t$, $t$agitation and agenda setting$t$);
-- member 1491
SELECT pg_temp.swap(1491, $t$animal-welfare politics$t$, $t$animal welfare politics$t$);
SELECT pg_temp.swap(1491, $t$the net-zero strategy$t$, $t$the net zero strategy$t$);
SELECT pg_temp.swap(1491, $t$the low-carbon economy$t$, $t$the low carbon economy$t$);
SELECT pg_temp.swap(1491, $t$invest in clean-power projects$t$, $t$invest in clean power projects$t$);
SELECT pg_temp.swap(1491, $t$as start-up chair$t$, $t$as startup chair$t$);
SELECT pg_temp.swap(1491, $t$presented the clean-power programme$t$, $t$presented the clean power programme$t$);
SELECT pg_temp.swap(1491, $t$fossil-fuel markets$t$, $t$fossil fuel markets$t$);
SELECT pg_temp.swap(1491, $t$that clean-power projects$t$, $t$that clean power projects$t$);
SELECT pg_temp.swap(1491, $t$in clean-energy supply chains$t$, $t$in clean energy supply chains$t$);
SELECT pg_temp.swap(1491, $t$ethical supply-chain oversight$t$, $t$ethical supply chain oversight$t$);
SELECT pg_temp.swap(1491, $t$renewable-energy supply chains$t$, $t$renewable energy supply chains$t$);
SELECT pg_temp.swap(1491, $t$later carbon-budget settlement$t$, $t$later carbon budget settlement$t$);
SELECT pg_temp.swap(1491, $t$long-term climate targets$t$, $t$long term climate targets$t$);
SELECT pg_temp.swap(1491, $t$finished clean-power system$t$, $t$finished clean power system$t$);
SELECT pg_temp.swap(1491, $t$postal-vote figures$t$, $t$postal vote figures$t$);
SELECT pg_temp.swap(1491, $t$electoral-law breach$t$, $t$electoral law breach$t$);
SELECT pg_temp.swap(1491, $t$carbon-market announcements$t$, $t$carbon market announcements$t$);
SELECT pg_temp.swap(1491, $t$later carbon-budget decisions$t$, $t$later carbon budget decisions$t$);
SELECT pg_temp.swap(1491, $t$environmental-policy minister$t$, $t$environmental policy minister$t$);
SELECT pg_temp.swap(1491, $t$clean-energy programme$t$, $t$clean energy programme$t$);
-- member 1510
SELECT pg_temp.swap(1510, $t$emissions-reduction target$t$, $t$emissions reduction target$t$);
SELECT pg_temp.swap(1510, $t$place long-term national climate targets$t$, $t$place long term national climate targets$t$);
SELECT pg_temp.swap(1510, $t$a one-member-one-vote leadership system$t$, $t$a one member, one vote leadership system$t$);
SELECT pg_temp.swap(1510, $t$energy-price freeze$t$, $t$energy price freeze$t$);
SELECT pg_temp.swap(1510, $t$at the cut-off date$t$, $t$at the cutoff date$t$);
SELECT pg_temp.swap(1510, $t$renewable-power contracts$t$, $t$renewable power contracts$t$);
SELECT pg_temp.swap(1510, $t$and long-term state backing$t$, $t$and long term state backing$t$);
SELECT pg_temp.swap(1510, $t$green-investment pledge$t$, $t$green investment pledge$t$);
SELECT pg_temp.swap(1510, $t$own clean-energy projects$t$, $t$own clean energy projects$t$);
SELECT pg_temp.swap(1510, $t$redesigned renewable-energy auctions$t$, $t$redesigned renewable energy auctions$t$);
SELECT pg_temp.swap(1510, $t$its clean-power programme$t$, $t$its clean power programme$t$);
-- member 1516
SELECT pg_temp.swap(1516, $t$with pro-European and pro-Palestinian positions$t$, $t$with pro European and pro Palestinian positions$t$);
SELECT pg_temp.swap(1516, $t$not been cost-free$t$, $t$not been cost free$t$);
SELECT pg_temp.swap(1516, $t$from legal-aid coverage$t$, $t$from legal aid coverage$t$);
SELECT pg_temp.swap(1516, $t$within freedom-of-information law$t$, $t$within freedom of information law$t$);
SELECT pg_temp.swap(1516, $t$miscarriage-of-justice case$t$, $t$miscarriage of justice case$t$);
SELECT pg_temp.swap(1516, $t$parliamentary pre-appointment scrutiny$t$, $t$parliamentary preappointment scrutiny$t$);
SELECT pg_temp.swap(1516, $t$became party-political$t$, $t$became party political$t$);
SELECT pg_temp.swap(1516, $t$Hamas-linked Palestinian$t$, $t$Hamas linked Palestinian$t$);
SELECT pg_temp.swap(1516, $t$evidence-led scrutiny$t$, $t$evidence led scrutiny$t$);
SELECT pg_temp.swap(1516, $t$major legal-aid cuts$t$, $t$major legal aid cuts$t$);
SELECT pg_temp.swap(1516, $t$his freedom-of-information reform$t$, $t$his freedom of information reform$t$);
-- member 1524
SELECT pg_temp.swap(1524, $t$argued for long-term investment$t$, $t$argued for long term investment$t$);
SELECT pg_temp.swap(1524, $t$through follow-up hearings$t$, $t$through follow up hearings$t$);
SELECT pg_temp.swap(1524, $t$national identity-card scheme$t$, $t$national identity card scheme$t$);
SELECT pg_temp.swap(1524, $t$biometric-passport programme$t$, $t$biometric passport programme$t$);
SELECT pg_temp.swap(1524, $t$from civil-liberties groups$t$, $t$from civil liberties groups$t$);
SELECT pg_temp.swap(1524, $t$build cross-party authority$t$, $t$build cross party authority$t$);
-- member 1533
SELECT pg_temp.swap(1533, $t$The Momentum-backed challenger$t$, $t$The Momentum backed challenger$t$);
SELECT pg_temp.swap(1533, $t$amendments and cross-party pressure$t$, $t$amendments and cross party pressure$t$);
SELECT pg_temp.swap(1533, $t$enough cross-party support$t$, $t$enough cross party support$t$);
SELECT pg_temp.swap(1533, $t$Conservative three-line whip$t$, $t$Conservative three line whip$t$);
SELECT pg_temp.swap(1533, $t$the three-month statutory deadline$t$, $t$the three month statutory deadline$t$);
SELECT pg_temp.swap(1533, $t$The neighbourhood-policing guarantee$t$, $t$The neighbourhood policing guarantee$t$);
SELECT pg_temp.swap(1533, $t$The infected-blood inquiry$t$, $t$The infected blood inquiry$t$);
-- member 1536
SELECT pg_temp.swap(1536, $t$legal and foreign-policy briefs$t$, $t$legal and foreign policy briefs$t$);
SELECT pg_temp.swap(1536, $t$barristers from sexual-offence cases$t$, $t$barristers from sexual offence cases$t$);
SELECT pg_temp.swap(1536, $t$taste of a working-class voter$t$, $t$taste of a working class voter$t$);
SELECT pg_temp.swap(1536, $t$merely a social-media mistake$t$, $t$merely a social media mistake$t$);
SELECT pg_temp.swap(1536, $t$a clearer human-rights emphasis$t$, $t$a clearer human rights emphasis$t$);
SELECT pg_temp.swap(1536, $t$for the Saudi-led war$t$, $t$for the Saudi led war$t$);
SELECT pg_temp.swap(1536, $t$supplied a cross-party case$t$, $t$supplied a cross party case$t$);
SELECT pg_temp.swap(1536, $t$proposed settlement-goods ban$t$, $t$proposed settlement goods ban$t$);
SELECT pg_temp.swap(1536, $t$case of British-Egyptian activist$t$, $t$case of British Egyptian activist$t$);
-- member 1541
SELECT pg_temp.swap(1541, $t$foreign-policy instincts$t$, $t$foreign policy instincts$t$);
SELECT pg_temp.swap(1541, $t$anti-nuclear left$t$, $t$anti nuclear left$t$);
SELECT pg_temp.swap(1541, $t$around longer-term orders$t$, $t$around longer term orders$t$);
SELECT pg_temp.swap(1541, $t$preserve it single-handedly$t$, $t$preserve it singlehandedly$t$);
SELECT pg_temp.swap(1541, $t$Her defence-industrial campaign$t$, $t$Her defence industrial campaign$t$);
SELECT pg_temp.swap(1541, $t$draft, trans-inclusive legislation$t$, $t$draft, trans inclusive legislation$t$);
SELECT pg_temp.swap(1541, $t$subject to pre-legislative scrutiny at the cut-off date$t$, $t$subject to prelegislative scrutiny at the cutoff date$t$);
-- member 1548
SELECT pg_temp.swap(1548, $t$junior party-management positions$t$, $t$junior party management positions$t$);
SELECT pg_temp.swap(1548, $t$The campaign was cross-party$t$, $t$The campaign was cross party$t$);
SELECT pg_temp.swap(1548, $t$the two-child benefit cap$t$, $t$the two child benefit cap$t$);
-- member 1579
SELECT pg_temp.swap(1579, $t$politically pro-European$t$, $t$politically pro European$t$);
SELECT pg_temp.swap(1579, $t$support for same-sex marriage$t$, $t$support for same sex marriage$t$);
SELECT pg_temp.swap(1579, $t$supplying single-use vapes$t$, $t$supplying single use vapes$t$);
SELECT pg_temp.swap(1579, $t$consistent workplace-recycling requirements$t$, $t$consistent workplace recycling requirements$t$);
SELECT pg_temp.swap(1579, $t$for threatened-species recovery$t$, $t$for threatened species recovery$t$);
SELECT pg_temp.swap(1579, $t$and coffee-cup recycling$t$, $t$and coffee cup recycling$t$);
SELECT pg_temp.swap(1579, $t$exemptions from biodiversity-net-gain requirements$t$, $t$exemptions from biodiversity net gain requirements$t$);
SELECT pg_temp.swap(1579, $t$quality—her willingness to pursue an argument forcefully—has$t$, $t$quality, her willingness to pursue an argument forcefully, has$t$);
SELECT pg_temp.swap(1579, $t$waste policy—the single-use vape ban—into law$t$, $t$waste policy, the single use vape ban, into law$t$);
-- member 1587
SELECT pg_temp.swap(1587, $t$Blairite and anti-Corbyn wing$t$, $t$Blairite and anti Corbyn wing$t$);
SELECT pg_temp.swap(1587, $t$between health-related Universal Credit$t$, $t$between health related Universal Credit$t$);
SELECT pg_temp.swap(1587, $t$by 2030-31$t$, $t$by 2030/31$t$);
SELECT pg_temp.swap(1587, $t$more face-to-face assessments$t$, $t$more face to face assessments$t$);
-- member 3914
SELECT pg_temp.swap(3914, $t$2025, said pre-sentence reports$t$, $t$2025, said presentence reports$t$);
SELECT pg_temp.swap(3914, $t$without those carve-outs$t$, $t$without those carveouts$t$);
SELECT pg_temp.swap(3914, $t$The 30-month review$t$, $t$The 30 month review$t$);
SELECT pg_temp.swap(3914, $t$the 20-year rule$t$, $t$the 20 year rule$t$);
-- member 3924
SELECT pg_temp.swap(3924, $t$A Pakistani-born child$t$, $t$A Pakistani born child$t$);
SELECT pg_temp.swap(3924, $t$became a UCL-educated barrister$t$, $t$became a UCL educated barrister$t$);
SELECT pg_temp.swap(3924, $t$Her pre-Parliament career was substantial$t$, $t$Her career before Parliament was substantial$t$);
SELECT pg_temp.swap(3924, $t$roles in post-conflict justice-building$t$, $t$roles in post conflict justice building$t$);
SELECT pg_temp.swap(3924, $t$and was re-elected in 2024$t$, $t$and was elected again in 2024$t$);
-- member 3966
SELECT pg_temp.swap(3966, $t$within Labour’s anti-Corbyn wing$t$, $t$within Labour’s anti Corbyn wing$t$);
SELECT pg_temp.swap(3966, $t$represents Labour’s pro-union, socially$t$, $t$represents Labour’s pro union, socially$t$);
-- member 3973
SELECT pg_temp.swap(3973, $t$public ownership, trade-union rights$t$, $t$public ownership, trade union rights$t$);
SELECT pg_temp.swap(3973, $t$the cross-party committee report$t$, $t$the cross party committee report$t$);
SELECT pg_temp.swap(3973, $t$proposed disability-benefit restrictions$t$, $t$proposed disability benefit restrictions$t$);
SELECT pg_temp.swap(3973, $t$brief shadow-cabinet opportunity$t$, $t$brief shadow cabinet opportunity$t$);
SELECT pg_temp.swap(3973, $t$a long-running campaign$t$, $t$a long running campaign$t$);
-- member 4026
SELECT pg_temp.swap(4026, $t$projected disability-benefit spending$t$, $t$projected disability benefit spending$t$);
SELECT pg_temp.swap(4026, $t$extra health-related support$t$, $t$extra health related support$t$);
SELECT pg_temp.swap(4026, $t$for 18 to 21-year-olds$t$, $t$for 18 to 21 year olds$t$);
SELECT pg_temp.swap(4026, $t$£500 million state-backed AI fund$t$, $t$£500 million state backed AI fund$t$);
SELECT pg_temp.swap(4026, $t$before the second-reading vote$t$, $t$before the second reading vote$t$);
SELECT pg_temp.swap(4026, $t$receiving means-tested benefits for winter 2024–25$t$, $t$receiving means tested benefits for winter 2024/25$t$);
SELECT pg_temp.swap(4026, $t$communication of state-pension-age changes$t$, $t$communication of state pension age changes$t$);
-- member 4029
SELECT pg_temp.swap(4029, $t$a long-serving Labour MP$t$, $t$a long serving Labour MP$t$);
SELECT pg_temp.swap(4029, $t$was re-elected in 2024$t$, $t$was elected again in 2024$t$);
SELECT pg_temp.swap(4029, $t$a front-rank national figure$t$, $t$a front rank national figure$t$);
SELECT pg_temp.swap(4029, $t$have a public-service and accessibility$t$, $t$have a public service and accessibility$t$);
SELECT pg_temp.swap(4029, $t$her long-running committee$t$, $t$her long running committee$t$);
SELECT pg_temp.swap(4029, $t$a pavement-parking ban$t$, $t$a pavement parking ban$t$);
SELECT pg_temp.swap(4029, $t$consult on drink-driving limits, improve young-driver training$t$, $t$consult on drink driving limits, improve young driver training$t$);
SELECT pg_temp.swap(4029, $t$walk-to-school programmes$t$, $t$walk to school programmes$t$);
SELECT pg_temp.swap(4029, $t$reduce out-of-area taxi$t$, $t$reduce out of area taxi$t$);
SELECT pg_temp.swap(4029, $t$casualty-reduction target$t$, $t$casualty reduction target$t$);
SELECT pg_temp.swap(4029, $t$Pavement-parking reform$t$, $t$Pavement parking reform$t$);
SELECT pg_temp.swap(4029, $t$Nottingham's public-service crisis$t$, $t$Nottingham's public service crisis$t$);
SELECT pg_temp.swap(4029, $t$blamed long-term Conservative$t$, $t$blamed long term Conservative$t$);
SELECT pg_temp.swap(4029, $t$not a high-profile ideological$t$, $t$not a high profile ideological$t$);
SELECT pg_temp.swap(4029, $t$converted long-standing transport$t$, $t$converted longstanding transport$t$);
SELECT pg_temp.swap(4029, $t$or delegated-powers stage$t$, $t$or delegated powers stage$t$);
-- member 4038
SELECT pg_temp.swap(4038, $t$failure was the driving-test backlog$t$, $t$failure was the driving test backlog$t$);
SELECT pg_temp.swap(4038, $t$authorised Gatwick's second-runway scheme$t$, $t$authorised Gatwick's second runway scheme$t$);
SELECT pg_temp.swap(4038, $t$the driving-test target was missed$t$, $t$the driving test target was missed$t$);
-- member 4040
SELECT pg_temp.swap(4040, $t$parliamentary inquiries and cross-party pressure$t$, $t$parliamentary inquiries and cross party pressure$t$);
SELECT pg_temp.swap(4040, $t$the party's non-Corbyn wing$t$, $t$the party's non Corbyn wing$t$);
SELECT pg_temp.swap(4040, $t$Evans co-chaired an inquiry$t$, $t$Evans was joint chair of an inquiry$t$);
SELECT pg_temp.swap(4040, $t$getting a constituent-led problem$t$, $t$getting a constituent led problem$t$);
SELECT pg_temp.swap(4040, $t$the Ajax armoured-vehicle programme$t$, $t$the Ajax armoured vehicle programme$t$);
SELECT pg_temp.swap(4040, $t$It blamed programme-management failures$t$, $t$It blamed programme management failures$t$);
SELECT pg_temp.swap(4040, $t$a persistent, party-aligned backbencher$t$, $t$a persistent, party aligned backbencher$t$);
-- member 4046
SELECT pg_temp.swap(4046, $t$breakfast clubs, private-school VAT$t$, $t$breakfast clubs, private school VAT$t$);
SELECT pg_temp.swap(4046, $t$VAT on private-school fees, backed$t$, $t$VAT on private school fees, backed$t$);
SELECT pg_temp.swap(4046, $t$VAT to private-school fees$t$, $t$VAT to private school fees$t$);
SELECT pg_temp.swap(4046, $t$state-school applications$t$, $t$state school applications$t$);
SELECT pg_temp.swap(4046, $t$Independent-school enrolment$t$, $t$Independent school enrolment$t$);
SELECT pg_temp.swap(4046, $t$by 2029-30$t$, $t$by 2029/30$t$);
SELECT pg_temp.swap(4046, $t$early-adopter schools$t$, $t$early adopter schools$t$);
SELECT pg_temp.swap(4046, $t$school-nursery programme$t$, $t$school nursery programme$t$);
SELECT pg_temp.swap(4046, $t$a decade-long transition$t$, $t$a decade long transition$t$);
SELECT pg_temp.swap(4046, $t$Private-school VAT, expanded$t$, $t$Private school VAT, expanded$t$);
SELECT pg_temp.swap(4046, $t$an education-system reformer$t$, $t$an education system reformer$t$);
SELECT pg_temp.swap(4046, $t$remove the two-child benefit limit$t$, $t$remove the two child benefit limit$t$);
-- member 4061
SELECT pg_temp.swap(4061, $t$exposed failed home-insulation work$t$, $t$exposed failed home insulation work$t$);
SELECT pg_temp.swap(4061, $t$threatened clean-power targets$t$, $t$threatened clean power targets$t$);
SELECT pg_temp.swap(4061, $t$of excess network-company profits$t$, $t$of excess network company profits$t$);
SELECT pg_temp.swap(4061, $t$in scrutiny and coalition-building$t$, $t$in scrutiny and coalition building$t$);
-- member 4077
SELECT pg_temp.swap(4077, $t$Labour's pro-business, pro-European tradition$t$, $t$Labour's pro business, pro European tradition$t$);
SELECT pg_temp.swap(4077, $t$the financial-services industry$t$, $t$the financial services industry$t$);
SELECT pg_temp.swap(4077, $t$withdraw from China-related decisions$t$, $t$withdraw from China related decisions$t$);
SELECT pg_temp.swap(4077, $t$workplace and local-government schemes$t$, $t$workplace and local government schemes$t$);
SELECT pg_temp.swap(4077, $t$larger defined-contribution funds, a value-for-money regime$t$, $t$larger defined contribution funds, a value for money regime$t$);
SELECT pg_temp.swap(4077, $t$and market-abuse protections$t$, $t$and market abuse protections$t$);
SELECT pg_temp.swap(4077, $t$proposed inheritance-tax changes$t$, $t$proposed inheritance tax changes$t$);
SELECT pg_temp.swap(4077, $t$raised the tax-free threshold$t$, $t$raised the tax free threshold$t$);
-- member 4082
SELECT pg_temp.swap(4082, $t$effect by the cut-off date$t$, $t$effect by the cutoff date$t$);
SELECT pg_temp.swap(4082, $t$health and crime-prevention support$t$, $t$health and crime prevention support$t$);
SELECT pg_temp.swap(4082, $t$results by the cut-off point$t$, $t$results by the cutoff point$t$);
SELECT pg_temp.swap(4082, $t$between 2025-26 and 2028-29$t$, $t$between 2025/26 and 2028/29$t$);
SELECT pg_temp.swap(4082, $t$BBC's long-term finances$t$, $t$BBC's long term finances$t$);
-- member 4083
SELECT pg_temp.swap(4083, $t$no health-policy achievement$t$, $t$no health policy achievement$t$);
SELECT pg_temp.swap(4083, $t$sitting left-wing MP$t$, $t$sitting left wing MP$t$);
SELECT pg_temp.swap(4083, $t$deputy-leadership contest$t$, $t$deputy leadership contest$t$);
SELECT pg_temp.swap(4083, $t$pro-European, active-government tradition$t$, $t$pro European, active government tradition$t$);
SELECT pg_temp.swap(4083, $t$lower health-related Universal Credit$t$, $t$lower health related Universal Credit$t$);
SELECT pg_temp.swap(4083, $t$economic-inactivity trailblazers$t$, $t$economic inactivity trailblazers$t$);
SELECT pg_temp.swap(4083, $t$well-established supported-employment models$t$, $t$well established supported employment models$t$);
SELECT pg_temp.swap(4083, $t$halve long-term rough sleeping$t$, $t$halve long term rough sleeping$t$);
SELECT pg_temp.swap(4083, $t$temporary-accommodation numbers$t$, $t$temporary accommodation numbers$t$);
SELECT pg_temp.swap(4083, $t$long-delayed repeal$t$, $t$long delayed repeal$t$);
-- member 4088
SELECT pg_temp.swap(4088, $t$pressure on high-cost credit$t$, $t$pressure on high cost credit$t$);
SELECT pg_temp.swap(4088, $t$Crime Prevention (2011-2013)$t$, $t$Crime Prevention (2011 to 2013)$t$);
SELECT pg_temp.swap(4088, $t$Skills (2013-2015)$t$, $t$Skills (2013 to 2015)$t$);
SELECT pg_temp.swap(4088, $t$for a full-time worker$t$, $t$for a full time worker$t$);
-- member 4119
SELECT pg_temp.swap(4119, $t$relationships with financial-services employers$t$, $t$relationships with financial services employers$t$);
SELECT pg_temp.swap(4119, $t$a pro-business social democrat and self-described Christian$t$, $t$a pro business social democrat and self described Christian$t$);
SELECT pg_temp.swap(4119, $t$government setting long-term priorities$t$, $t$government setting long term priorities$t$);
SELECT pg_temp.swap(4119, $t$pragmatic centre-left:$t$, $t$pragmatic centre left:$t$);
SELECT pg_temp.swap(4119, $t$straightforward free-market moderniser$t$, $t$straightforward free market moderniser$t$);
SELECT pg_temp.swap(4119, $t$UK supply-chain security$t$, $t$UK supply chain security$t$);
SELECT pg_temp.swap(4119, $t$employment-rights programme and launched a ten-year industrial$t$, $t$employment rights programme and launched a ten year industrial$t$);
SELECT pg_temp.swap(4119, $t$announcing a ten-year plan$t$, $t$announcing a ten year plan$t$);
-- member 4124
SELECT pg_temp.swap(4124, $t$two ethnic-minority women$t$, $t$two ethnic minority women$t$);
SELECT pg_temp.swap(4124, $t$under online-safety law$t$, $t$under online safety law$t$);
SELECT pg_temp.swap(4124, $t$organised a cross-party letter$t$, $t$organised a cross party letter$t$);
SELECT pg_temp.swap(4124, $t$into social-media algorithms$t$, $t$into social media algorithms$t$);
SELECT pg_temp.swap(4124, $t$July 2025 social-media report$t$, $t$July 2025 social media report$t$);
SELECT pg_temp.swap(4124, $t$June 2026 digital-government report$t$, $t$June 2026 digital government report$t$);
-- member 4125
SELECT pg_temp.swap(4125, $t$high-profile political combat$t$, $t$high profile political combat$t$);
SELECT pg_temp.swap(4125, $t$social-democratic politics$t$, $t$social democratic politics$t$);
SELECT pg_temp.swap(4125, $t$better-paid public servants$t$, $t$better paid public servants$t$);
SELECT pg_temp.swap(4125, $t$social-media users$t$, $t$social media users$t$);
SELECT pg_temp.swap(4125, $t$disability-related abuse. Those user-empowerment duties$t$, $t$disability related abuse. Those user empowerment duties$t$);
SELECT pg_temp.swap(4125, $t$new child-safeguarding measures$t$, $t$new child safeguarding measures$t$);
SELECT pg_temp.swap(4125, $t$breakfast-club duties$t$, $t$breakfast club duties$t$);
SELECT pg_temp.swap(4125, $t$three-item uniform$t$, $t$three item uniform$t$);
SELECT pg_temp.swap(4125, $t$part-funded by$t$, $t$part funded by$t$);
SELECT pg_temp.swap(4125, $t$further-education teachers. Across state-funded$t$, $t$further education teachers. Across state funded$t$);
SELECT pg_temp.swap(4125, $t$real-terms increase in high-needs funding$t$, $t$real terms increase in high needs funding$t$);
SELECT pg_temp.swap(4125, $t$assistive-technology pilot$t$, $t$assistive technology pilot$t$);
-- member 4126
SELECT pg_temp.swap(4126, $t$proposed disability-benefit restrictions$t$, $t$proposed disability benefit restrictions$t$);
SELECT pg_temp.swap(4126, $t$voted against same-sex marriage$t$, $t$voted against same sex marriage$t$);
SELECT pg_temp.swap(4126, $t$coherent conscience-based position$t$, $t$coherent conscience based position$t$);
SELECT pg_temp.swap(4126, $t$and reproductive-rights campaigners$t$, $t$and reproductive rights campaigners$t$);
SELECT pg_temp.swap(4126, $t$by asbestos-related disease$t$, $t$by asbestos related disease$t$);
SELECT pg_temp.swap(4126, $t$questions and early-day motions$t$, $t$questions and early day motions$t$);
SELECT pg_temp.swap(4126, $t$opposition to same-sex marriage$t$, $t$opposition to same sex marriage$t$);
SELECT pg_temp.swap(4126, $t$not as a policy-maker$t$, $t$not as a policymaker$t$);
-- member 4138
SELECT pg_temp.swap(4138, $t$Bow (2010-2024)$t$, $t$Bow (2010 to 2024)$t$);
SELECT pg_temp.swap(4138, $t$Development (2010-2013)$t$, $t$Development (2010 to 2013)$t$);
SELECT pg_temp.swap(4138, $t$(2013-2014, resigned$t$, $t$(2013 to 2014, resigned$t$);
SELECT pg_temp.swap(4138, $t$Business (2023-2024)$t$, $t$Business (2023 to 2024)$t$);
-- member 4139
SELECT pg_temp.swap(4139, $t$came from the trade-union movement$t$, $t$came from the trade union movement$t$);
SELECT pg_temp.swap(4139, $t$trade-union left:$t$, $t$trade union left:$t$);
SELECT pg_temp.swap(4139, $t$drive working-class Leave$t$, $t$drive working class Leave$t$);
SELECT pg_temp.swap(4139, $t$breaking a three-line whip$t$, $t$breaking a three line whip$t$);
SELECT pg_temp.swap(4139, $t$the 1984-85 miners$t$, $t$the 1984 to 1985 miners$t$);
SELECT pg_temp.swap(4139, $t$of social-media comments$t$, $t$of social media comments$t$);
SELECT pg_temp.swap(4139, $t$connection to the trade-union movement$t$, $t$connection to the trade union movement$t$);
-- member 4212
SELECT pg_temp.swap(4212, $t$resulting 2011 by-election$t$, $t$resulting 2011 byelection$t$);
SELECT pg_temp.swap(4212, $t$Committee, a cross-party endorsement$t$, $t$Committee, a cross party endorsement$t$);
SELECT pg_temp.swap(4212, $t$proposed disability-benefit reductions$t$, $t$proposed disability benefit reductions$t$);
SELECT pg_temp.swap(4212, $t$activation of the socio-economic duty$t$, $t$activation of the socioeconomic duty$t$);
SELECT pg_temp.swap(4212, $t$national two-thirds target$t$, $t$national two thirds target$t$);
SELECT pg_temp.swap(4212, $t$The socio-economic duty was$t$, $t$The socioeconomic duty was$t$);
SELECT pg_temp.swap(4212, $t$The Covid-contract judgment$t$, $t$The Covid contract judgment$t$);
-- member 4243
SELECT pg_temp.swap(4243, $t$for a single Yorkshire-wide settlement$t$, $t$for a single Yorkshire wide settlement$t$);
SELECT pg_temp.swap(4243, $t$introduced a one-year concession$t$, $t$introduced a one year concession$t$);
SELECT pg_temp.swap(4243, $t$estimate put its ten-year cost$t$, $t$estimate put its ten year cost$t$);
SELECT pg_temp.swap(4243, $t$unresolved at the cut-off date$t$, $t$unresolved at the cutoff date$t$);
SELECT pg_temp.swap(4243, $t$the five-week tenure$t$, $t$the five week tenure$t$);
SELECT pg_temp.swap(4243, $t$did not prove Cabinet-level administrative$t$, $t$did not prove Cabinet level administrative$t$);
-- member 4253
SELECT pg_temp.swap(4253, $t$Women and Girls (2014-2015)$t$, $t$Women and Girls (2014 to 2015)$t$);
SELECT pg_temp.swap(4253, $t$Secretary to the Treasury (2015-2016)$t$, $t$Secretary to the Treasury (2015 to 2016)$t$);
-- member 4263
SELECT pg_temp.swap(4263, $t$Central since a by-election on 15 November 2012$t$, $t$Central since a byelection on 15 November 2012$t$);
SELECT pg_temp.swap(4263, $t$2012 to fight the by-election.$t$, $t$2012 to fight the byelection.$t$);
SELECT pg_temp.swap(4263, $t$and vice-chair of the 2015$t$, $t$and vice chair of the 2015$t$);
SELECT pg_temp.swap(4263, $t$Gorton and Denton by-election$t$, $t$Gorton and Denton byelection$t$);
SELECT pg_temp.swap(4263, $t$where Burnham won a by-election$t$, $t$where Burnham won a byelection$t$);
SELECT pg_temp.swap(4263, $t$called for the two-child benefit limit to be lifted$t$, $t$called for the two child benefit limit to be lifted$t$);
-- member 4264
SELECT pg_temp.swap(4264, $t$He was re-elected in 2024$t$, $t$He was elected again in 2024$t$);
-- member 4267
SELECT pg_temp.swap(4267, $t$since a 2012 by-election$t$, $t$since a 2012 byelection$t$);
SELECT pg_temp.swap(4267, $t$she had a 16-year arts career$t$, $t$she had an arts career of 16 years$t$);
-- member 4268
SELECT pg_temp.swap(4268, $t$a long-term roadmap$t$, $t$a long term roadmap$t$);
SELECT pg_temp.swap(4268, $t$over inheritance-tax changes$t$, $t$over inheritance tax changes$t$);
SELECT pg_temp.swap(4268, $t$and post-Brexit subsidies$t$, $t$and post Brexit subsidies$t$);
-- member 4269
SELECT pg_temp.swap(4269, $t$government's disability-benefit legislation$t$, $t$government's disability benefit legislation$t$);
SELECT pg_temp.swap(4269, $t$It was a worked-out structure$t$, $t$It was a worked out structure$t$);
SELECT pg_temp.swap(4269, $t$His employment-rights work$t$, $t$His employment rights work$t$);
SELECT pg_temp.swap(4269, $t$chaired the trade-union taskforce$t$, $t$chaired the trade union taskforce$t$);
SELECT pg_temp.swap(4269, $t$wider sick-pay eligibility$t$, $t$wider sick pay eligibility$t$);
SELECT pg_temp.swap(4269, $t$removed the sick-pay waiting period$t$, $t$removed the sick pay waiting period$t$);
SELECT pg_temp.swap(4269, $t$a serious policy-maker$t$, $t$a serious policymaker$t$);
-- member 4277
SELECT pg_temp.swap(4277, $t$South Shields by-election$t$, $t$South Shields byelection$t$);
SELECT pg_temp.swap(4277, $t$a reliable UK-wide measure$t$, $t$a reliable UK wide measure$t$);
SELECT pg_temp.swap(4277, $t$assembled cross-party support$t$, $t$assembled cross party support$t$);
SELECT pg_temp.swap(4277, $t$Forty-seven Labour MPs$t$, $t$Forty seven Labour MPs$t$);
SELECT pg_temp.swap(4277, $t$breakfast-club legislation$t$, $t$breakfast club legislation$t$);
SELECT pg_temp.swap(4277, $t$against the two-child benefit limit$t$, $t$against the two child benefit limit$t$);
SELECT pg_temp.swap(4277, $t$The two-child limit was finally$t$, $t$The two child limit was finally$t$);
SELECT pg_temp.swap(4277, $t$abolition of the two-child limit. She$t$, $t$abolition of the two child limit. She$t$);
-- member 4356
SELECT pg_temp.swap(4356, $t$came from the trade-union movement$t$, $t$came from the trade union movement$t$);
SELECT pg_temp.swap(4356, $t$Labour's trade-union and municipal$t$, $t$Labour's trade union and municipal$t$);
SELECT pg_temp.swap(4356, $t$lower-quality$t$, $t$lower quality$t$);
SELECT pg_temp.swap(4356, $t$a ten-year, £39 billion$t$, $t$a ten year, £39 billion$t$);
SELECT pg_temp.swap(4356, $t$"no-fault" eviction$t$, $t$"no fault" eviction$t$);
SELECT pg_temp.swap(4356, $t$Fixed-term assured$t$, $t$Fixed term assured$t$);
SELECT pg_temp.swap(4356, $t$remaining two-tier council$t$, $t$remaining two tier council$t$);
SELECT pg_temp.swap(4356, $t$promised unfair-dismissal protection$t$, $t$promised unfair dismissal protection$t$);
SELECT pg_temp.swap(4356, $t$stronger sick-pay, family-leave and zero-hours provisions$t$, $t$stronger sick pay, family leave and zero hours provisions$t$);
SELECT pg_temp.swap(4356, $t$prominent day-one promise$t$, $t$prominent day one promise$t$);
SELECT pg_temp.swap(4356, $t$separate ministerial-code finding$t$, $t$separate ministerial code finding$t$);
-- member 4359
SELECT pg_temp.swap(4359, $t$pro-European but$t$, $t$pro European but$t$);
SELECT pg_temp.swap(4359, $t$His social-care work$t$, $t$His social care work$t$);
SELECT pg_temp.swap(4359, $t$pragmatic centre-left:$t$, $t$pragmatic centre left:$t$);
SELECT pg_temp.swap(4359, $t$an adult social-care fair pay$t$, $t$an adult social care fair pay$t$);
SELECT pg_temp.swap(4359, $t$Social-care vacancies$t$, $t$Social care vacancies$t$);
SELECT pg_temp.swap(4359, $t$fair-pay policy$t$, $t$fair pay policy$t$);
SELECT pg_temp.swap(4359, $t$a planned care-worker training$t$, $t$a planned care worker training$t$);
SELECT pg_temp.swap(4359, $t$supported electric-arc furnace$t$, $t$supported electric arc furnace$t$);
-- member 4368
SELECT pg_temp.swap(4368, $t$He was re-elected in 2024 with$t$, $t$He was elected again in 2024 with$t$);
SELECT pg_temp.swap(4368, $t$recommended a two-day suspension$t$, $t$recommended a two day suspension$t$);
SELECT pg_temp.swap(4368, $t$of British-Chinese heritage$t$, $t$of British Chinese heritage$t$);
SELECT pg_temp.swap(4368, $t$a further three-day suspension$t$, $t$a further three day suspension$t$);
SELECT pg_temp.swap(4368, $t$reselected and re-elected in 2024$t$, $t$reselected and elected again in 2024$t$);
-- member 4370
SELECT pg_temp.swap(4370, $t$made a short-lived bid$t$, $t$made a short lived bid$t$);
SELECT pg_temp.swap(4370, $t$first domestic-abuse specialists$t$, $t$first domestic abuse specialists$t$);
SELECT pg_temp.swap(4370, $t$with longer-term victim-support funding$t$, $t$with longer term victim support funding$t$);
SELECT pg_temp.swap(4370, $t$effective cross-government response$t$, $t$effective cross government response$t$);
SELECT pg_temp.swap(4370, $t$fragmented, short-term funding$t$, $t$fragmented, short term funding$t$);
SELECT pg_temp.swap(4370, $t$dysfunction pre-dated Phillips$t$, $t$dysfunction predated Phillips$t$);
SELECT pg_temp.swap(4370, $t$of the grooming-gangs inquiry$t$, $t$of the grooming gangs inquiry$t$);
SELECT pg_temp.swap(4370, $t$The chair-selection process$t$, $t$The chair selection process$t$);
-- member 4382
SELECT pg_temp.swap(4382, $t$and farmed-animal welfare$t$, $t$and farmed animal welfare$t$);
SELECT pg_temp.swap(4382, $t$Forty-nine Labour MPs$t$, $t$Forty nine Labour MPs$t$);
SELECT pg_temp.swap(4382, $t$the full-relief threshold$t$, $t$the full relief threshold$t$);
SELECT pg_temp.swap(4382, $t$new pig-purchase agreements$t$, $t$new pig purchase agreements$t$);
SELECT pg_temp.swap(4382, $t$presented the take-up as$t$, $t$presented the takeup as$t$);
SELECT pg_temp.swap(4382, $t$and late decision-making that$t$, $t$and late decision making that$t$);
SELECT pg_temp.swap(4382, $t$promised long-term farming$t$, $t$promised long term farming$t$);
SELECT pg_temp.swap(4382, $t$an election-period mailing$t$, $t$an election period mailing$t$);
SELECT pg_temp.swap(4382, $t$envelopes was party-political$t$, $t$envelopes was party political$t$);
SELECT pg_temp.swap(4382, $t$The pig-contract rules$t$, $t$The pig contract rules$t$);
SELECT pg_temp.swap(4382, $t$flagship farm-payment decision$t$, $t$flagship farm payment decision$t$);
-- member 4389
SELECT pg_temp.swap(4389, $t$Minister (2016-2017)$t$, $t$Minister (2016 to 2017)$t$);
-- member 4391
SELECT pg_temp.swap(4391, $t$a prevention-focused contract$t$, $t$a prevention focused contract$t$);
SELECT pg_temp.swap(4391, $t$worst oral-health outcomes$t$, $t$worst oral health outcomes$t$);
SELECT pg_temp.swap(4391, $t$was a dental-access pilot$t$, $t$was a dental access pilot$t$);
SELECT pg_temp.swap(4391, $t$under the ten-minute rule$t$, $t$under the ten minute rule$t$);
SELECT pg_temp.swap(4391, $t$farming and road-safety organisations$t$, $t$farming and road safety organisations$t$);
SELECT pg_temp.swap(4391, $t$for all-terrain vehicles$t$, $t$for all terrain vehicles$t$);
SELECT pg_temp.swap(4391, $t$put quad-bike theft$t$, $t$put quad bike theft$t$);
SELECT pg_temp.swap(4391, $t$built cross-party partnerships$t$, $t$built cross party partnerships$t$);
SELECT pg_temp.swap(4391, $t$campaign on quad-bike regulation$t$, $t$campaign on quad bike regulation$t$);
SELECT pg_temp.swap(4391, $t$her quad-bikes bill$t$, $t$her quad bikes bill$t$);
SELECT pg_temp.swap(4391, $t$operator, coalition-builder and$t$, $t$operator, coalition builder and$t$);
SELECT pg_temp.swap(4391, $t$build cross-party support$t$, $t$build cross party support$t$);
-- member 4394
SELECT pg_temp.swap(4394, $t$anti-austerity left. Shortly$t$, $t$anti austerity left. Shortly$t$);
SELECT pg_temp.swap(4394, $t$trade-union and anti-austerity left. He has$t$, $t$trade union and anti austerity left. He has$t$);
SELECT pg_temp.swap(4394, $t$shadow employment-rights minister$t$, $t$shadow employment rights minister$t$);
SELECT pg_temp.swap(4394, $t$created day-one rights$t$, $t$created day one rights$t$);
SELECT pg_temp.swap(4394, $t$stronger sick-pay protection$t$, $t$stronger sick pay protection$t$);
SELECT pg_temp.swap(4394, $t$long-term regeneration funding$t$, $t$long term regeneration funding$t$);
SELECT pg_temp.swap(4394, $t$By the cut-off date$t$, $t$By the cutoff date$t$);
SELECT pg_temp.swap(4394, $t$living-wage sick pay$t$, $t$living wage sick pay$t$);
SELECT pg_temp.swap(4394, $t$foreign-policy campaigning$t$, $t$foreign policy campaigning$t$);
SELECT pg_temp.swap(4394, $t$long-serving frontbenchers$t$, $t$long serving frontbenchers$t$);
SELECT pg_temp.swap(4394, $t$employment-rights programme$t$, $t$employment rights programme$t$);
SELECT pg_temp.swap(4394, $t$for the two-child benefit limit to be abolished$t$, $t$for the two child benefit limit to be abolished$t$);
SELECT pg_temp.swap(4394, $t$suspension over the two-child limit$t$, $t$suspension over the two child limit$t$);
-- member 4396
SELECT pg_temp.swap(4396, $t$Treasury (2016-2017)$t$, $t$Treasury (2016 to 2017)$t$);
SELECT pg_temp.swap(4396, $t$Strategy (2017-2020)$t$, $t$Strategy (2017 to 2020)$t$);
-- member 4397
SELECT pg_temp.swap(4397, $t$Bootle, 1955-1979)$t$, $t$Bootle, 1955 to 1979)$t$);
SELECT pg_temp.swap(4397, $t$Preston South, 1964-1970)$t$, $t$Preston South, 1964 to 1970)$t$);
SELECT pg_temp.swap(4397, $t$Treasury (2016-2017)$t$, $t$Treasury (2016 to 2017)$t$);
SELECT pg_temp.swap(4397, $t$Treasury (2017-2020)$t$, $t$Treasury (2017 to 2020)$t$);
SELECT pg_temp.swap(4397, $t$A 35-year social worker who$t$, $t$A social worker for 35 years who$t$);
-- member 4409
SELECT pg_temp.swap(4409, $t$dramatic 2012 by-election. She was re-elected in 2024$t$, $t$dramatic 2012 byelection. She was elected again in 2024$t$);
SELECT pg_temp.swap(4409, $t$The combined non-Labour, non-Conservative vote$t$, $t$The combined non Labour, non Conservative vote$t$);
SELECT pg_temp.swap(4409, $t$Women and Equalities (2018-2020), Community Cohesion (2020-2021), and Crime Reduction (2021-2023)$t$, $t$Women and Equalities (2018 to 2020), Community Cohesion (2020 to 2021), and Crime Reduction (2021 to 2023)$t$);
-- member 4418
SELECT pg_temp.swap(4418, $t$supported guaranteed-hours offers$t$, $t$supported guaranteed hours offers$t$);
SELECT pg_temp.swap(4418, $t$New consumer-protection powers$t$, $t$New consumer protection powers$t$);
SELECT pg_temp.swap(4418, $t$family and trade-union rights$t$, $t$family and trade union rights$t$);
SELECT pg_temp.swap(4418, $t$ordinary unfair-dismissal protection$t$, $t$ordinary unfair dismissal protection$t$);
SELECT pg_temp.swap(4418, $t$stronger consumer-enforcement powers$t$, $t$stronger consumer enforcement powers$t$);
SELECT pg_temp.swap(4418, $t$promise of day-one protection$t$, $t$promise of day one protection$t$);
SELECT pg_temp.swap(4418, $t$effective employment-law minister$t$, $t$effective employment law minister$t$);
-- member 4436
SELECT pg_temp.swap(4436, $t$long-standing supporter$t$, $t$longstanding supporter$t$);
SELECT pg_temp.swap(4436, $t$original disability-benefit reductions$t$, $t$original disability benefit reductions$t$);
SELECT pg_temp.swap(4436, $t$serious long-term illness$t$, $t$serious long term illness$t$);
SELECT pg_temp.swap(4436, $t$at the cut-off date$t$, $t$at the cutoff date$t$);
SELECT pg_temp.swap(4436, $t$The proxy-voting extension$t$, $t$The proxy voting extension$t$);
SELECT pg_temp.swap(4436, $t$welfare and farm-tax retreats$t$, $t$welfare and farm tax retreats$t$);
-- member 4444
SELECT pg_temp.swap(4444, $t$restoring the 18-week elective-care standard$t$, $t$restoring the 18 week elective care standard$t$);
SELECT pg_temp.swap(4444, $t$more stable long-term footing$t$, $t$more stable long term footing$t$);
SELECT pg_temp.swap(4444, $t$secondary-care trusts$t$, $t$secondary care trusts$t$);
SELECT pg_temp.swap(4444, $t$the full 18-week standard$t$, $t$the full 18 week standard$t$);
SELECT pg_temp.swap(4444, $t$that a ten-year NHS workforce plan$t$, $t$that a ten year NHS workforce plan$t$);
SELECT pg_temp.swap(4444, $t$statutory waiting-time standard remained unmet, the hospital-building programme$t$, $t$statutory waiting time standard remained unmet, the hospital building programme$t$);
-- member 4449
SELECT pg_temp.swap(4449, $t$winning working-class communities$t$, $t$winning working class communities$t$);
SELECT pg_temp.swap(4449, $t$was not cost-free$t$, $t$was not cost free$t$);
SELECT pg_temp.swap(4449, $t$towns, co-operative organisation$t$, $t$towns, cooperative organisation$t$);
SELECT pg_temp.swap(4449, $t$firmly pro-European$t$, $t$firmly pro European$t$);
SELECT pg_temp.swap(4449, $t$leadership-loyal Labour government$t$, $t$leadership loyal Labour government$t$);
SELECT pg_temp.swap(4449, $t$civil-service work. During 2025-26,$t$, $t$civil service work. During 2025/26,$t$);
SELECT pg_temp.swap(4449, $t$net-zero measures$t$, $t$net zero measures$t$);
SELECT pg_temp.swap(4449, $t$by the cut-off date$t$, $t$by the cutoff date$t$);
SELECT pg_temp.swap(4449, $t$public-interest defences$t$, $t$public interest defences$t$);
SELECT pg_temp.swap(4449, $t$Her animal-cruelty campaign$t$, $t$Her animal cruelty campaign$t$);
-- member 4456
SELECT pg_temp.swap(4456, $t$consumption and drug-checking facilities$t$, $t$consumption and drug checking facilities$t$);
SELECT pg_temp.swap(4456, $t$stopped drug-taking, he$t$, $t$stopped drug taking, he$t$);
SELECT pg_temp.swap(4456, $t$received a second-reading debate$t$, $t$received a second reading debate$t$);
SELECT pg_temp.swap(4456, $t$resell live-event tickets$t$, $t$resell live event tickets$t$);
SELECT pg_temp.swap(4456, $t$The eventual football-governance legislation$t$, $t$The eventual football governance legislation$t$);
SELECT pg_temp.swap(4456, $t$government’s fan-led review$t$, $t$government’s fan led review$t$);
SELECT pg_temp.swap(4456, $t$Corbyn’s three-line instruction$t$, $t$Corbyn’s three line instruction$t$);
SELECT pg_temp.swap(4456, $t$Labour’s non-Corbynite Manchester$t$, $t$Labour’s non Corbynite Manchester$t$);
SELECT pg_temp.swap(4456, $t$His public-policy record$t$, $t$His public policy record$t$);
SELECT pg_temp.swap(4456, $t$his medical-cannabis bill failed and the ticket-resale ban$t$, $t$his medical cannabis bill failed and the ticket resale ban$t$);
-- member 4457
SELECT pg_temp.swap(4457, $t$Justice Committee (2015-2020)$t$, $t$Justice Committee (2015 to 2020)$t$);
-- member 4464
SELECT pg_temp.swap(4464, $t$strongly pro-Brexit coastal town$t$, $t$strongly pro Brexit coastal town$t$);
SELECT pg_temp.swap(4464, $t$renewable-energy economy$t$, $t$renewable energy economy$t$);
-- member 4471
SELECT pg_temp.swap(4471, $t$Affairs (2016-2017, resigned$t$, $t$Affairs (2016 to 2017, resigned$t$);
-- member 4473
SELECT pg_temp.swap(4473, $t$prominent Corbyn-era frontbenchers$t$, $t$prominent Corbyn era frontbenchers$t$);
SELECT pg_temp.swap(4473, $t$cross-government delivery, civil-service reform$t$, $t$cross government delivery, civil service reform$t$);
SELECT pg_temp.swap(4473, $t$stronger trade-union rights$t$, $t$stronger trade union rights$t$);
SELECT pg_temp.swap(4473, $t$industrial-relations grounds$t$, $t$industrial relations grounds$t$);
SELECT pg_temp.swap(4473, $t$existing passenger-rail contracts$t$, $t$existing passenger rail contracts$t$);
SELECT pg_temp.swap(4473, $t$national train-drivers$t$, $t$national train drivers$t$);
SELECT pg_temp.swap(4473, $t$a two-year confrontation$t$, $t$a two year confrontation$t$);
SELECT pg_temp.swap(4473, $t$no working-practice or$t$, $t$no working practice or$t$);
SELECT pg_temp.swap(4473, $t$below pre-pandemic levels$t$, $t$below prepandemic levels$t$);
SELECT pg_temp.swap(4473, $t$workplace non-disclosure agreements$t$, $t$workplace nondisclosure agreements$t$);
SELECT pg_temp.swap(4473, $t$formal ministerial-code investigation$t$, $t$formal ministerial code investigation$t$);
-- member 4479
SELECT pg_temp.swap(4479, $t$negotiator on the UK-EU Reset$t$, $t$negotiator on the UK and EU Reset$t$);
SELECT pg_temp.swap(4479, $t$Shadow Home Secretary (2020-2021)$t$, $t$Shadow Home Secretary (2020 to 2021)$t$);
SELECT pg_temp.swap(4479, $t$Trade Secretary (2021-2023)$t$, $t$Trade Secretary (2021 to 2023)$t$);
SELECT pg_temp.swap(4479, $t$Without Portfolio (2023-2024)$t$, $t$Without Portfolio (2023 to 2024)$t$);
SELECT pg_temp.swap(4479, $t$easier for off-patent drugs$t$, $t$easier for off patent drugs$t$);
SELECT pg_temp.swap(4479, $t$The UK-EU Strategic Partnership$t$, $t$The UK and EU Strategic Partnership$t$);
SELECT pg_temp.swap(4479, $t$He was re-elected in 2024$t$, $t$He was elected again in 2024$t$);
-- member 4480
SELECT pg_temp.swap(4480, $t$wanted one-member-one-vote.$t$, $t$wanted one member, one vote.$t$);
SELECT pg_temp.swap(4480, $t$She subsequently co-chaired$t$, $t$She was subsequently joint chair of$t$);
SELECT pg_temp.swap(4480, $t$comfortable with cross-party alliances$t$, $t$comfortable with cross party alliances$t$);
SELECT pg_temp.swap(4480, $t$remove local-authority burial$t$, $t$remove local authority burial$t$);
SELECT pg_temp.swap(4480, $t$led the cross-party campaign$t$, $t$led the cross party campaign$t$);
SELECT pg_temp.swap(4480, $t$It is not means-tested$t$, $t$It is not means tested$t$);
SELECT pg_temp.swap(4480, $t$on fixed-odds betting$t$, $t$on fixed odds betting$t$);
SELECT pg_temp.swap(4480, $t$made Harris co-chair of$t$, $t$made Harris joint chair of$t$);
SELECT pg_temp.swap(4480, $t$show higher take-up in$t$, $t$show higher takeup in$t$);
SELECT pg_temp.swap(4480, $t$publicity and cross-party pressure$t$, $t$publicity and cross party pressure$t$);
-- member 4491
SELECT pg_temp.swap(4491, $t$agency workers and zero-hour contracts$t$, $t$agency workers and zero hour contracts$t$);
SELECT pg_temp.swap(4491, $t$than purely a criminal-justice one$t$, $t$than purely a criminal justice one$t$);
SELECT pg_temp.swap(4491, $t$Opposition Whip (2015-2019)$t$, $t$Opposition Whip (2015 to 2019)$t$);
SELECT pg_temp.swap(4491, $t$Disabled People (2020-2024)$t$, $t$Disabled People (2020 to 2024)$t$);
-- member 4500
SELECT pg_temp.swap(4500, $t$The party's post-referendum resignations propelled$t$, $t$The party's resignations after the referendum propelled$t$);
SELECT pg_temp.swap(4500, $t$obey a three-line whip$t$, $t$obey a three line whip$t$);
SELECT pg_temp.swap(4500, $t$an adjourned second-reading debate$t$, $t$an adjourned second reading debate$t$);
SELECT pg_temp.swap(4500, $t$before the 2024-26 session ended$t$, $t$before the 2024 to 2026 session ended$t$);
SELECT pg_temp.swap(4500, $t$He also co-sponsored$t$, $t$He also cosponsored$t$);
SELECT pg_temp.swap(4500, $t$the bill's cross-party sponsors$t$, $t$the bill's cross party sponsors$t$);
SELECT pg_temp.swap(4500, $t$A separate sexual-harassment complaint$t$, $t$A separate sexual harassment complaint$t$);
-- member 4501
SELECT pg_temp.swap(4501, $t$the left-wing MP$t$, $t$the left wing MP$t$);
SELECT pg_temp.swap(4501, $t$an in-person hustings$t$, $t$an in person hustings$t$);
SELECT pg_temp.swap(4501, $t$through coal-tip safety funding$t$, $t$through coal tip safety funding$t$);
SELECT pg_temp.swap(4501, $t$improved mental-health support$t$, $t$improved mental health support$t$);
SELECT pg_temp.swap(4501, $t$nuclear-test veterans. He joined the cross-party pressure$t$, $t$nuclear test veterans. He joined the cross party pressure$t$);
SELECT pg_temp.swap(4501, $t$The coal-tip settlement$t$, $t$The coal tip settlement$t$);
-- member 4504
SELECT pg_temp.swap(4504, $t$to under-18s$t$, $t$to under 18s$t$);
SELECT pg_temp.swap(4504, $t$published a ten-year health plan$t$, $t$published a ten year health plan$t$);
SELECT pg_temp.swap(4504, $t$targets for 2024-25 were$t$, $t$targets for 2024/25 were$t$);
SELECT pg_temp.swap(4504, $t$major public-health legislation$t$, $t$major public health legislation$t$);
SELECT pg_temp.swap(4504, $t$his ten-year plan still$t$, $t$his ten year plan still$t$);
-- member 4510
SELECT pg_temp.swap(4510, $t$occupied Labour's pro-European, socially liberal centre-left.$t$, $t$occupied Labour's pro European, socially liberal centre left.$t$);
SELECT pg_temp.swap(4510, $t$a foster-carer recruitment$t$, $t$a foster carer recruitment$t$);
SELECT pg_temp.swap(4510, $t$to consult care-experienced young$t$, $t$to consult care experienced young$t$);
SELECT pg_temp.swap(4510, $t$broad and evidence-heavy$t$, $t$broad and evidence heavy$t$);
SELECT pg_temp.swap(4510, $t$with Europe, income-linked affordable$t$, $t$with Europe, income linked affordable$t$);
-- member 4511
SELECT pg_temp.swap(4511, $t$influence through cross-party campaigns$t$, $t$influence through cross party campaigns$t$);
SELECT pg_temp.swap(4511, $t$on abortion-clinic harassment$t$, $t$on abortion clinic harassment$t$);
SELECT pg_temp.swap(4511, $t$introduction of safe-access zones$t$, $t$introduction of safe access zones$t$);
SELECT pg_temp.swap(4511, $t$She tabled a cross-party amendment$t$, $t$She tabled a cross party amendment$t$);
SELECT pg_temp.swap(4511, $t$a 150-metre zone$t$, $t$a 150 metre zone$t$);
SELECT pg_temp.swap(4511, $t$2023 created safe-access zones$t$, $t$2023 created safe access zones$t$);
SELECT pg_temp.swap(4511, $t$collective, cross-party work$t$, $t$collective, cross party work$t$);
SELECT pg_temp.swap(4511, $t$her words as ill-judged$t$, $t$her words as ill judged$t$);
SELECT pg_temp.swap(4511, $t$completed anti-racism$t$, $t$completed anti racism$t$);
SELECT pg_temp.swap(4511, $t$building a cross-party campaign$t$, $t$building a cross party campaign$t$);
SELECT pg_temp.swap(4511, $t$The safe-access-zone legislation$t$, $t$The safe access zone legislation$t$);
-- member 4515
SELECT pg_temp.swap(4515, $t$international-development scrutiny$t$, $t$international development scrutiny$t$);
SELECT pg_temp.swap(4515, $t$stronger poverty-reduction tests$t$, $t$stronger poverty reduction tests$t$);
SELECT pg_temp.swap(4515, $t$and fee-charging education$t$, $t$and fee charging education$t$);
SELECT pg_temp.swap(4515, $t$distinctive international-development programme$t$, $t$distinctive international development programme$t$);
-- member 4518
SELECT pg_temp.swap(4518, $t$its longest-serving Prime Minister$t$, $t$its longest serving Prime Minister$t$);
SELECT pg_temp.swap(4518, $t$a dynasty of a nation-state,$t$, $t$a dynasty of a nation state,$t$);
SELECT pg_temp.swap(4518, $t$services and anti-corruption policy$t$, $t$services and anti corruption policy$t$);
SELECT pg_temp.swap(4518, $t$She was re-elected in 2024$t$, $t$She was elected again in 2024$t$);
-- member 4520
SELECT pg_temp.swap(4520, $t$technocratic centre-left$t$, $t$technocratic centre left$t$);
SELECT pg_temp.swap(4520, $t$in high-demand areas and limited development on lower-quality$t$, $t$in high demand areas and limited development on lower quality$t$);
SELECT pg_temp.swap(4520, $t$replaced most fixed-term assured$t$, $t$replaced most fixed term assured$t$);
SELECT pg_temp.swap(4520, $t$a private-rented-sector ombudsman$t$, $t$a private rented sector ombudsman$t$);
SELECT pg_temp.swap(4520, $t$a new local-plan system$t$, $t$a new local plan system$t$);
SELECT pg_temp.swap(4520, $t$in 2025–26, respective$t$, $t$in 2025/26, respective$t$);
SELECT pg_temp.swap(4520, $t$130,170 new-build starts$t$, $t$130,170 new build starts$t$);
SELECT pg_temp.swap(4520, $t$a five-year Parliament$t$, $t$a five year Parliament$t$);
SELECT pg_temp.swap(4520, $t$cheaper right-to-manage claims$t$, $t$cheaper right to manage claims$t$);
SELECT pg_temp.swap(4520, $t$Section 21 "no-fault" evictions$t$, $t$Section 21 "no fault" evictions$t$);
-- member 4523
SELECT pg_temp.swap(4523, $t$severe local-election losses$t$, $t$severe local election losses$t$);
SELECT pg_temp.swap(4523, $t$a pro-European internationalist$t$, $t$a pro European internationalist$t$);
SELECT pg_temp.swap(4523, $t$abandon single-market membership$t$, $t$abandon single market membership$t$);
SELECT pg_temp.swap(4523, $t$interference and human-rights abuses$t$, $t$interference and human rights abuses$t$);
SELECT pg_temp.swap(4523, $t$serious human-rights abuses$t$, $t$serious human rights abuses$t$);
-- member 4569
SELECT pg_temp.swap(4569, $t$negotiate a cross-party recovery plan$t$, $t$negotiate a cross party recovery plan$t$);
SELECT pg_temp.swap(4569, $t$towards district-level bodies$t$, $t$towards district level bodies$t$);
SELECT pg_temp.swap(4569, $t$before the cut-off date$t$, $t$before the cutoff date$t$);
SELECT pg_temp.swap(4569, $t$neighbourhood decision-making$t$, $t$neighbourhood decision making$t$);
SELECT pg_temp.swap(4569, $t$England’s two-tier county$t$, $t$England’s two tier county$t$);
SELECT pg_temp.swap(4569, $t$improved information-sharing$t$, $t$improved information sharing$t$);
SELECT pg_temp.swap(4569, $t$approved one-year delays$t$, $t$approved one year delays$t$);
-- member 4571
SELECT pg_temp.swap(4571, $t$Hillsborough by-election$t$, $t$Hillsborough byelection$t$);
SELECT pg_temp.swap(4571, $t$a senior decision-making position$t$, $t$a senior decision making position$t$);
SELECT pg_temp.swap(4571, $t$Her consumer-protection work$t$, $t$Her consumer protection work$t$);
SELECT pg_temp.swap(4571, $t$response to fire-prone tumble$t$, $t$response to fire prone tumble$t$);
SELECT pg_temp.swap(4571, $t$left under-resourced local$t$, $t$left under resourced local$t$);
SELECT pg_temp.swap(4571, $t$her consumer-safety agenda$t$, $t$her consumer safety agenda$t$);
-- member 4572
SELECT pg_temp.swap(4572, $t$As human-rights minister$t$, $t$As human rights minister$t$);
SELECT pg_temp.swap(4572, $t$for conflict-related sexual$t$, $t$for conflict related sexual$t$);
SELECT pg_temp.swap(4572, $t$Parliament with cross-party support$t$, $t$Parliament with cross party support$t$);
SELECT pg_temp.swap(4572, $t$equivalent day-one entitlement$t$, $t$equivalent day one entitlement$t$);
SELECT pg_temp.swap(4572, $t$build a cross-party coalition$t$, $t$build a cross party coalition$t$);
SELECT pg_temp.swap(4572, $t$turned human-rights priorities$t$, $t$turned human rights priorities$t$);
-- member 4573
SELECT pg_temp.swap(4573, $t$Tooting by-election$t$, $t$Tooting byelection$t$);
SELECT pg_temp.swap(4573, $t$early mental-health intervention$t$, $t$early mental health intervention$t$);
SELECT pg_temp.swap(4573, $t$additional mental-health workers, place$t$, $t$additional mental health workers, place$t$);
SELECT pg_temp.swap(4573, $t$open-access community$t$, $t$open access community$t$);
SELECT pg_temp.swap(4573, $t$one-month treatment$t$, $t$one month treatment$t$);
SELECT pg_temp.swap(4573, $t$private-sector involvement$t$, $t$private sector involvement$t$);
SELECT pg_temp.swap(4573, $t$separate mental-health portfolio$t$, $t$separate mental health portfolio$t$);
SELECT pg_temp.swap(4573, $t$unpaid trade-envoy role$t$, $t$unpaid trade envoy role$t$);
SELECT pg_temp.swap(4573, $t$8,500-worker pledge$t$, $t$8,500 worker pledge$t$);
SELECT pg_temp.swap(4573, $t$that mental-health support teams$t$, $t$that mental health support teams$t$);
SELECT pg_temp.swap(4573, $t$from 2026-27 to 2029-30, for community centres, mental-health emergency$t$, $t$from 2026/27 to 2029/30, for community centres, mental health emergency$t$);
SELECT pg_temp.swap(4573, $t$post-traumatic stress$t$, $t$post traumatic stress$t$);
SELECT pg_temp.swap(4573, $t$NHS mental-health and wellbeing$t$, $t$NHS mental health and wellbeing$t$);
SELECT pg_temp.swap(4573, $t$unrelated non-parliamentary petition$t$, $t$unrelated non parliamentary petition$t$);
SELECT pg_temp.swap(4573, $t$8,500 mental-health workers supports$t$, $t$8,500 mental health workers supports$t$);
SELECT pg_temp.swap(4573, $t$waiting-time results$t$, $t$waiting time results$t$);
-- member 4595
SELECT pg_temp.swap(4595, $t$Central by-election, where$t$, $t$Central byelection, where$t$);
SELECT pg_temp.swap(4595, $t$heavily Leave-voting Labour$t$, $t$heavily Leave voting Labour$t$);
SELECT pg_temp.swap(4595, $t$old social-media post$t$, $t$old social media post$t$);
SELECT pg_temp.swap(4595, $t$working-class heartlands$t$, $t$working class heartlands$t$);
SELECT pg_temp.swap(4595, $t$manufacturing-focused form$t$, $t$manufacturing focused form$t$);
SELECT pg_temp.swap(4595, $t$trade-union involvement$t$, $t$trade union involvement$t$);
SELECT pg_temp.swap(4595, $t$personally pro-European$t$, $t$personally pro European$t$);
SELECT pg_temp.swap(4595, $t$a no-deal Brexit$t$, $t$a no deal Brexit$t$);
SELECT pg_temp.swap(4595, $t$At the cut-off date$t$, $t$At the cutoff date$t$);
SELECT pg_temp.swap(4595, $t$During the 2017 by-election$t$, $t$During the 2017 byelection$t$);
SELECT pg_temp.swap(4595, $t$coalition-building. The ceramics$t$, $t$coalition building. The ceramics$t$);
-- member 4607
SELECT pg_temp.swap(4607, $t$the party's policy-making body$t$, $t$the party's policymaking body$t$);
SELECT pg_temp.swap(4607, $t$the anti-fascist campaign$t$, $t$the anti fascist campaign$t$);
SELECT pg_temp.swap(4607, $t$and co-chairs the APPG for Veterans$t$, $t$and is joint chair of the APPG for Veterans$t$);
-- member 4610
SELECT pg_temp.swap(4610, $t$limited exceptional-case scheme$t$, $t$limited exceptional case scheme$t$);
SELECT pg_temp.swap(4610, $t$the same rights-based approach$t$, $t$the same rights based approach$t$);
SELECT pg_temp.swap(4610, $t$the mediation, legal-aid or$t$, $t$the mediation, legal aid or$t$);
SELECT pg_temp.swap(4610, $t$addressed developing-country debt$t$, $t$addressed developing country debt$t$);
SELECT pg_temp.swap(4610, $t$shadow foreign-affairs role. After a ten-month investigation$t$, $t$shadow foreign affairs role. After a ten month investigation$t$);
SELECT pg_temp.swap(4610, $t$a diligent, rights-focused politician$t$, $t$a diligent, rights focused politician$t$);
-- member 4617
SELECT pg_temp.swap(4617, $t$shadow higher-education minister in 2021$t$, $t$shadow higher education minister in 2021$t$);
SELECT pg_temp.swap(4617, $t$as shadow higher-education minister was$t$, $t$as shadow higher education minister was$t$);
SELECT pg_temp.swap(4617, $t$an affordable-housing allocation$t$, $t$an affordable housing allocation$t$);
SELECT pg_temp.swap(4617, $t$killed seven-year-old Rowan Fitzgerald and 76-year-old Dora Hancox.$t$, $t$killed Rowan Fitzgerald, aged seven, and Dora Hancox, aged 76.$t$);
SELECT pg_temp.swap(4617, $t$local and long-distance drivers$t$, $t$local and long distance drivers$t$);
SELECT pg_temp.swap(4617, $t$national-security strategy$t$, $t$national security strategy$t$);
SELECT pg_temp.swap(4617, $t$government-affairs director$t$, $t$government affairs director$t$);
SELECT pg_temp.swap(4617, $t$electric-vehicle emissions$t$, $t$electric vehicle emissions$t$);
SELECT pg_temp.swap(4617, $t$an anti-electrification argument$t$, $t$an anti electrification argument$t$);
SELECT pg_temp.swap(4617, $t$endorsed industry-backed research$t$, $t$endorsed industry backed research$t$);
SELECT pg_temp.swap(4617, $t$serious cross-party scrutiny. The medicinal-cannabis$t$, $t$serious cross party scrutiny. The medicinal cannabis$t$);
SELECT pg_temp.swap(4617, $t$the council-housing ambition$t$, $t$the council housing ambition$t$);
SELECT pg_temp.swap(4617, $t$his higher-education brief$t$, $t$his higher education brief$t$);
-- member 4618
SELECT pg_temp.swap(4618, $t$beyond mental-health services$t$, $t$beyond mental health services$t$);
SELECT pg_temp.swap(4618, $t$chair of the all-party group on suicide and self-harm prevention$t$, $t$chair of the all party group on suicide and self harm prevention$t$);
SELECT pg_temp.swap(4618, $t$support following self-harm and$t$, $t$support following self harm and$t$);
SELECT pg_temp.swap(4618, $t$Labour's trade-union and public-service tradition$t$, $t$Labour's trade union and public service tradition$t$);
SELECT pg_temp.swap(4618, $t$national suicide-prevention strategy$t$, $t$national suicide prevention strategy$t$);
SELECT pg_temp.swap(4618, $t$published a five-year strategy$t$, $t$published a five year strategy$t$);
SELECT pg_temp.swap(4618, $t$who had self-harmed$t$, $t$who had self harmed$t$);
SELECT pg_temp.swap(4618, $t$the all-party group's inquiry$t$, $t$the all party group's inquiry$t$);
SELECT pg_temp.swap(4618, $t$child to adult mental-health services$t$, $t$child to adult mental health services$t$);
SELECT pg_temp.swap(4618, $t$and suicide-prevention education$t$, $t$and suicide prevention education$t$);
SELECT pg_temp.swap(4618, $t$renew the suicide-prevention grant$t$, $t$renew the suicide prevention grant$t$);
SELECT pg_temp.swap(4618, $t$specified means-tested benefits$t$, $t$specified means tested benefits$t$);
SELECT pg_temp.swap(4618, $t$effective policy-maker.$t$, $t$effective policymaker.$t$);
-- member 4620
SELECT pg_temp.swap(4620, $t$defeated a Momentum-backed rival$t$, $t$defeated a Momentum backed rival$t$);
SELECT pg_temp.swap(4620, $t$strongly pro-European constituency$t$, $t$strongly pro European constituency$t$);
SELECT pg_temp.swap(4620, $t$days old at the cut-off date$t$, $t$days old at the cutoff date$t$);
SELECT pg_temp.swap(4620, $t$Labour's organisation-first tradition$t$, $t$Labour's organisation first tradition$t$);
SELECT pg_temp.swap(4620, $t$socially liberal and pro-European.$t$, $t$socially liberal and pro European.$t$);
SELECT pg_temp.swap(4620, $t$serious sexual-offence cases$t$, $t$serious sexual offence cases$t$);
SELECT pg_temp.swap(4620, $t$clearest public-policy achievement$t$, $t$clearest public policy achievement$t$);
-- member 4621
SELECT pg_temp.swap(4621, $t$television-friendly interrogator$t$, $t$television friendly interrogator$t$);
SELECT pg_temp.swap(4621, $t$Corbyn-era leadership$t$, $t$Corbyn era leadership$t$);
SELECT pg_temp.swap(4621, $t$social-democratic traditions$t$, $t$social democratic traditions$t$);
SELECT pg_temp.swap(4621, $t$rather than anti-state$t$, $t$rather than anti state$t$);
SELECT pg_temp.swap(4621, $t$a long-requested safeguard$t$, $t$a long requested safeguard$t$);
SELECT pg_temp.swap(4621, $t$three-year departmental budgets, five-year capital settlements and a ten-year infrastructure$t$, $t$three year departmental budgets, five year capital settlements and a ten year infrastructure$t$);
SELECT pg_temp.swap(4621, $t$strategy and project-delivery bodies$t$, $t$strategy and project delivery bodies$t$);
SELECT pg_temp.swap(4621, $t$defended disability-benefit reductions$t$, $t$defended disability benefit reductions$t$);
SELECT pg_temp.swap(4621, $t$voluntary public-service tool$t$, $t$voluntary public service tool$t$);
-- member 4623
SELECT pg_temp.swap(4623, $t$a Welsh-Italian linguist$t$, $t$a Welsh Italian linguist$t$);
SELECT pg_temp.swap(4623, $t$that of 12-year-old Billy Caldwell, whose$t$, $t$that of Billy Caldwell, aged 12, whose$t$);
SELECT pg_temp.swap(4623, $t$advocated for sex-based rights$t$, $t$advocated for sex based rights$t$);
SELECT pg_temp.swap(4623, $t$and was re-elected in 2024$t$, $t$and was elected again in 2024$t$);
-- member 4631
SELECT pg_temp.swap(4631, $t$Housing (2018-2020)$t$, $t$Housing (2018 to 2020)$t$);
SELECT pg_temp.swap(4631, $t$Fire Service (2020-2023)$t$, $t$Fire Service (2020 to 2023)$t$);
SELECT pg_temp.swap(4631, $t$Decarbonisation (2023-2024)$t$, $t$Decarbonisation (2023 to 2024)$t$);
-- member 4632
SELECT pg_temp.swap(4632, $t$meeting before the cut-off date$t$, $t$meeting before the cutoff date$t$);
SELECT pg_temp.swap(4632, $t$Cross-border healthcare exposed$t$, $t$Cross border healthcare exposed$t$);
SELECT pg_temp.swap(4632, $t$had halved asylum-hotel use$t$, $t$had halved asylum hotel use$t$);
SELECT pg_temp.swap(4632, $t$a new child-protection authority$t$, $t$a new child protection authority$t$);
-- member 4641
SELECT pg_temp.swap(4641, $t$communitarian centre-left$t$, $t$communitarian centre left$t$);
SELECT pg_temp.swap(4641, $t$first non-lawyer$t$, $t$first non lawyer$t$);
SELECT pg_temp.swap(4641, $t$Labour's trade-union and Co-operative$t$, $t$Labour's trade union and Co-operative$t$);
SELECT pg_temp.swap(4641, $t$dangerous-cladding crisis$t$, $t$dangerous cladding crisis$t$);
SELECT pg_temp.swap(4641, $t$social-housing remediation$t$, $t$social housing remediation$t$);
SELECT pg_temp.swap(4641, $t$town, levelling-up and regeneration$t$, $t$town, levelling up and regeneration$t$);
SELECT pg_temp.swap(4641, $t$asylum-related returns$t$, $t$asylum related returns$t$);
SELECT pg_temp.swap(4641, $t$reduce small-boat arrivals$t$, $t$reduce small boat arrivals$t$);
SELECT pg_temp.swap(4641, $t$the second-highest annual figure$t$, $t$the second highest annual figure$t$);
SELECT pg_temp.swap(4641, $t$Two-thirds of completed appeals$t$, $t$Two thirds of completed appeals$t$);
SELECT pg_temp.swap(4641, $t$credible long-term accommodation$t$, $t$credible long term accommodation$t$);
SELECT pg_temp.swap(4641, $t$the legal-aid shortage$t$, $t$the legal aid shortage$t$);
-- member 4651
SELECT pg_temp.swap(4651, $t$Labour's trade-union left$t$, $t$Labour's trade union left$t$);
SELECT pg_temp.swap(4651, $t$failed working-class victims$t$, $t$failed working class victims$t$);
SELECT pg_temp.swap(4651, $t$The grooming-gangs intervention$t$, $t$The grooming gangs intervention$t$);
SELECT pg_temp.swap(4651, $t$relying on decade-old estimates$t$, $t$relying on decade old estimates$t$);
SELECT pg_temp.swap(4651, $t$published England-wide strategy$t$, $t$published England wide strategy$t$);
SELECT pg_temp.swap(4651, $t$backed a grooming-gangs inquiry$t$, $t$backed a grooming gangs inquiry$t$);
-- member 4653
SELECT pg_temp.swap(4653, $t$runs a walk-in high street$t$, $t$runs a walk in high street$t$);
-- member 4654
SELECT pg_temp.swap(4654, $t$a shadow local-transport minister$t$, $t$a shadow local transport minister$t$);
SELECT pg_temp.swap(4654, $t$Labour's mainstream social-democratic politics$t$, $t$Labour's mainstream social democratic politics$t$);
SELECT pg_temp.swap(4654, $t$to younger and lower-paid workers$t$, $t$to younger and lower paid workers$t$);
SELECT pg_temp.swap(4654, $t$opposing the disability-benefit Bill$t$, $t$opposing the disability benefit Bill$t$);
SELECT pg_temp.swap(4654, $t$while the electric-bus programme$t$, $t$while the electric bus programme$t$);
SELECT pg_temp.swap(4654, $t$support for a council-led project$t$, $t$support for a council led project$t$);
SELECT pg_temp.swap(4654, $t$as a national policy-maker or political$t$, $t$as a national policymaker or political$t$);
-- member 4657
SELECT pg_temp.swap(4657, $t$Hartlepool by-election$t$, $t$Hartlepool byelection$t$);
SELECT pg_temp.swap(4657, $t$economically interventionist, pro-European wing$t$, $t$economically interventionist, pro European wing$t$);
SELECT pg_temp.swap(4657, $t$the party's rebellion-prone left$t$, $t$the party's rebellion prone left$t$);
SELECT pg_temp.swap(4657, $t$supported a trans-inclusive prohibition$t$, $t$supported a trans inclusive prohibition$t$);
SELECT pg_temp.swap(4657, $t$provisions for single-sex services$t$, $t$provisions for single sex services$t$);
SELECT pg_temp.swap(4657, $t$disability pay-gap reporting$t$, $t$disability pay gap reporting$t$);
SELECT pg_temp.swap(4657, $t$stronger equal-pay rights$t$, $t$stronger equal pay rights$t$);
-- member 4658
SELECT pg_temp.swap(4658, $t$unpaid and non-ministerial$t$, $t$unpaid and non ministerial$t$);
SELECT pg_temp.swap(4658, $t$anti-austerity$t$, $t$anti austerity$t$);
SELECT pg_temp.swap(4658, $t$the centre-left network$t$, $t$the centre left network$t$);
SELECT pg_temp.swap(4658, $t$a minister by the cut-off.$t$, $t$a minister by the cutoff.$t$);
SELECT pg_temp.swap(4658, $t$clean-air proposal$t$, $t$clean air proposal$t$);
SELECT pg_temp.swap(4658, $t$This was council-designed and government-funded,$t$, $t$This was designed by the council and funded by the government,$t$);
SELECT pg_temp.swap(4658, $t$joint council-government review$t$, $t$joint council and government review$t$);
SELECT pg_temp.swap(4658, $t$ultra-low-emission licensed taxis and private-hire cars$t$, $t$ultra low emission licensed taxis and private hire cars$t$);
SELECT pg_temp.swap(4658, $t$2025 disability-benefit proposals$t$, $t$2025 disability benefit proposals$t$);
SELECT pg_temp.swap(4658, $t$the 2024–26 session$t$, $t$the 2024 to 2026 session$t$);
SELECT pg_temp.swap(4658, $t$By the cut-off, however$t$, $t$By the cutoff, however$t$);
SELECT pg_temp.swap(4658, $t$coalition-builder$t$, $t$coalition builder$t$);
SELECT pg_temp.swap(4658, $t$His clean-air work$t$, $t$His clean air work$t$);
SELECT pg_temp.swap(4658, $t$trade-envoy activity$t$, $t$trade envoy activity$t$);
-- member 4671
SELECT pg_temp.swap(4671, $t$municipal and trade-union networks$t$, $t$municipal and trade union networks$t$);
SELECT pg_temp.swap(4671, $t$the Momentum-backed Yasmine Dar$t$, $t$the Momentum backed Yasmine Dar$t$);
SELECT pg_temp.swap(4671, $t$which he co-founded$t$, $t$of which he was a founder$t$);
-- member 4673
SELECT pg_temp.swap(4673, $t$local-election performance$t$, $t$local election performance$t$);
SELECT pg_temp.swap(4673, $t$by the cut-off date$t$, $t$by the cutoff date$t$);
SELECT pg_temp.swap(4673, $t$town-focused form$t$, $t$town focused form$t$);
SELECT pg_temp.swap(4673, $t$local-election losses$t$, $t$local election losses$t$);
SELECT pg_temp.swap(4673, $t$neurodiversity and cyber-security$t$, $t$neurodiversity and cybersecurity$t$);
SELECT pg_temp.swap(4673, $t$responsibility for cyber-security$t$, $t$responsibility for cybersecurity$t$);
SELECT pg_temp.swap(4673, $t$post-industrial towns$t$, $t$postindustrial towns$t$);
SELECT pg_temp.swap(4673, $t$edge-of-care service$t$, $t$edge of care service$t$);
SELECT pg_temp.swap(4673, $t$looked-after children$t$, $t$looked after children$t$);
SELECT pg_temp.swap(4673, $t$At the cut-off, construction$t$, $t$At the cutoff, construction$t$);
SELECT pg_temp.swap(4673, $t$adult mental-health services$t$, $t$adult mental health services$t$);
SELECT pg_temp.swap(4673, $t$diagnosis and waiting-time data$t$, $t$diagnosis and waiting time data$t$);
SELECT pg_temp.swap(4673, $t$NHS waiting-time target$t$, $t$NHS waiting time target$t$);
SELECT pg_temp.swap(4673, $t$national waiting-time standard$t$, $t$national waiting time standard$t$);
SELECT pg_temp.swap(4673, $t$her cyber-security proposals$t$, $t$her cybersecurity proposals$t$);
-- member 4676
SELECT pg_temp.swap(4676, $t$most prominent disability-rights advocates$t$, $t$most prominent disability rights advocates$t$);
SELECT pg_temp.swap(4676, $t$founded the sight-loss charity$t$, $t$founded the sight loss charity$t$);
SELECT pg_temp.swap(4676, $t$her proposed race-equality policies$t$, $t$her proposed race equality policies$t$);
SELECT pg_temp.swap(4676, $t$for adequate social-security payments$t$, $t$for adequate social security payments$t$);
SELECT pg_temp.swap(4676, $t$showed a consistent disability-rights position$t$, $t$showed a consistent disability rights position$t$);
SELECT pg_temp.swap(4676, $t$debate on step-free access$t$, $t$debate on step free access$t$);
SELECT pg_temp.swap(4676, $t$subsequently received step-free improvements$t$, $t$subsequently received step free improvements$t$);
SELECT pg_temp.swap(4676, $t$valuable for an under-represented community$t$, $t$valuable for an underrepresented community$t$);
SELECT pg_temp.swap(4676, $t$defending a then-marginal seat$t$, $t$defending a then marginal seat$t$);
SELECT pg_temp.swap(4676, $t$experienced disability-rights advocate$t$, $t$experienced disability rights advocate$t$);
SELECT pg_temp.swap(4676, $t$while her railway-access campaigns$t$, $t$while her railway access campaigns$t$);
-- member 4682
SELECT pg_temp.swap(4682, $t$established south-western MPs$t$, $t$established south western MPs$t$);
SELECT pg_temp.swap(4682, $t$Pollard was re-elected in July 2024$t$, $t$Pollard was elected again in July 2024$t$);
SELECT pg_temp.swap(4682, $t$a pro-defence Labour$t$, $t$a pro defence Labour$t$);
SELECT pg_temp.swap(4682, $t$alone—the council and University of Plymouth were central—but he$t$, $t$alone (the council and University of Plymouth were central), but he$t$);
SELECT pg_temp.swap(4682, $t$dockyard, marine-research base$t$, $t$dockyard, marine research base$t$);
SELECT pg_temp.swap(4682, $t$a five-college national programme$t$, $t$a five college national programme$t$);
SELECT pg_temp.swap(4682, $t$major long-term investment$t$, $t$major long term investment$t$);
SELECT pg_temp.swap(4682, $t$wider city-centre regeneration$t$, $t$wider city centre regeneration$t$);
SELECT pg_temp.swap(4682, $t$effective coalition-builder$t$, $t$effective coalition builder$t$);
-- member 4698
SELECT pg_temp.swap(4698, $t$first-round vote$t$, $t$first round vote$t$);
SELECT pg_temp.swap(4698, $t$objections to same-sex marriage$t$, $t$objections to same sex marriage$t$);
SELECT pg_temp.swap(4698, $t$refuse same-sex couples$t$, $t$refuse same sex couples$t$);
SELECT pg_temp.swap(4698, $t$conduct same-sex marriages$t$, $t$conduct same sex marriages$t$);
SELECT pg_temp.swap(4698, $t$multi-agency teams and better information-sharing$t$, $t$multiagency teams and better information sharing$t$);
SELECT pg_temp.swap(4698, $t$for 2025-26, nearly doubling preventive-services funding$t$, $t$for 2025/26, nearly doubling preventive services funding$t$);
SELECT pg_temp.swap(4698, $t$integrated family-help services$t$, $t$integrated family help services$t$);
SELECT pg_temp.swap(4698, $t$family decision-making and$t$, $t$family decision making and$t$);
SELECT pg_temp.swap(4698, $t$Its social-care provisions placed family group decision-making in law$t$, $t$Its social care provisions placed family group decision making in law$t$);
SELECT pg_temp.swap(4698, $t$original social-care package$t$, $t$original social care package$t$);
SELECT pg_temp.swap(4698, $t$extend foster-care recruitment$t$, $t$extend foster care recruitment$t$);
SELECT pg_temp.swap(4698, $t$200 council-run placements$t$, $t$200 council run placements$t$);
SELECT pg_temp.swap(4698, $t$children’s social-care workforce strategy$t$, $t$children’s social care workforce strategy$t$);
SELECT pg_temp.swap(4698, $t$place family-based care$t$, $t$place family based care$t$);
-- member 4716
SELECT pg_temp.swap(4716, $t$in an April 2019 by-election$t$, $t$in an April 2019 byelection$t$);
SELECT pg_temp.swap(4716, $t$Rural Affairs (2020-2024)$t$, $t$Rural Affairs (2020 to 2024)$t$);
-- member 4747
SELECT pg_temp.swap(4747, $t$Nechells (1999-2003 and 2004-2022)$t$, $t$Nechells (1999 to 2003 and 2004 to 2022)$t$);
SELECT pg_temp.swap(4747, $t$against LGBT-inclusive relationship$t$, $t$against LGBT inclusive relationship$t$);
SELECT pg_temp.swap(4747, $t$In the 2019-2024 Parliament$t$, $t$In the 2019 to 2024 Parliament$t$);
SELECT pg_temp.swap(4747, $t$over £59,000 in 2023-24;$t$, $t$over £59,000 in 2023/24;$t$);
SELECT pg_temp.swap(4747, $t$He was re-elected in 2024 with 12,798$t$, $t$He was elected again in 2024 with 12,798$t$);
-- member 4753
SELECT pg_temp.swap(4753, $t$local left-wing members$t$, $t$local left wing members$t$);
SELECT pg_temp.swap(4753, $t$union-backed socialist$t$, $t$union backed socialist$t$);
SELECT pg_temp.swap(4753, $t$Labour-left base$t$, $t$Labour left base$t$);
SELECT pg_temp.swap(4753, $t$civil-liberties objections$t$, $t$civil liberties objections$t$);
SELECT pg_temp.swap(4753, $t$trade-union left$t$, $t$trade union left$t$);
SELECT pg_temp.swap(4753, $t$As co-chair of the all-party group$t$, $t$As joint chair of the all party group$t$);
SELECT pg_temp.swap(4753, $t$funded post-16 education$t$, $t$funded post 16 education$t$);
SELECT pg_temp.swap(4753, $t$16-to-19 academies, specialist post-16 institutions$t$, $t$16 to 19 academies, specialist post 16 institutions$t$);
SELECT pg_temp.swap(4753, $t$T-level training$t$, $t$T Level training$t$);
SELECT pg_temp.swap(4753, $t$tobacco-purchasing age$t$, $t$tobacco purchasing age$t$);
SELECT pg_temp.swap(4753, $t$fixed-penalty notices$t$, $t$fixed penalty notices$t$);
SELECT pg_temp.swap(4753, $t$towards her re-election$t$, $t$towards her reelection$t$);
SELECT pg_temp.swap(4753, $t$effective left-wing backbencher$t$, $t$effective left wing backbencher$t$);
-- member 4764
SELECT pg_temp.swap(4764, $t$unpaid trade-envoy position$t$, $t$unpaid trade envoy position$t$);
SELECT pg_temp.swap(4764, $t$an NHS anti-discrimination programme$t$, $t$an NHS anti discrimination programme$t$);
-- member 4777
SELECT pg_temp.swap(4777, $t$She co-chairs the APPG$t$, $t$She is joint chair of the APPG$t$);
-- member 4779
SELECT pg_temp.swap(4779, $t$208 votes, and re-elected in 2024$t$, $t$208 votes, and elected again in 2024$t$);
SELECT pg_temp.swap(4779, $t$Women and Equalities (2021-2022)$t$, $t$Women and Equalities (2021 to 2022)$t$);
-- member 4783
SELECT pg_temp.swap(4783, $t$Labour's trade-union left$t$, $t$Labour's trade union left$t$);
SELECT pg_temp.swap(4783, $t$her trade-union commitments$t$, $t$her trade union commitments$t$);
SELECT pg_temp.swap(4783, $t$combine trade-union militancy$t$, $t$combine trade union militancy$t$);
SELECT pg_temp.swap(4783, $t$supported the long-running coalfield$t$, $t$supported the long running coalfield$t$);
SELECT pg_temp.swap(4783, $t$campaigner and independent-minded backbencher$t$, $t$campaigner and independent minded backbencher$t$);
-- member 4788
SELECT pg_temp.swap(4788, $t$openly pro-Remain and pro-second-referendum platform$t$, $t$openly pro Remain and pro second referendum platform$t$);
SELECT pg_temp.swap(4788, $t$of plastic-containing wet wipes$t$, $t$of plastic containing wet wipes$t$);
SELECT pg_temp.swap(4788, $t$Plastic-free wipes can still$t$, $t$Plastic free wipes can still$t$);
SELECT pg_temp.swap(4788, $t$The assessment estimated that wet-wipe producers$t$, $t$The assessment estimated that wet wipe producers$t$);
SELECT pg_temp.swap(4788, $t$switching to plastic-free products$t$, $t$switching to plastic free products$t$);
SELECT pg_temp.swap(4788, $t$The wet-wipes ban$t$, $t$The wet wipes ban$t$);
-- member 4790
SELECT pg_temp.swap(4790, $t$a socialist and anti-imperialist rather$t$, $t$a socialist and anti imperialist rather$t$);
SELECT pg_temp.swap(4790, $t$trade unions, domestic-abuse survivors$t$, $t$trade unions, domestic abuse survivors$t$);
SELECT pg_temp.swap(4790, $t$the few government-side MPs$t$, $t$the few government side MPs$t$);
SELECT pg_temp.swap(4790, $t$employment protection for domestic-abuse survivors$t$, $t$employment protection for domestic abuse survivors$t$);
SELECT pg_temp.swap(4790, $t$were substantive, cross-party proposals$t$, $t$were substantive, cross party proposals$t$);
SELECT pg_temp.swap(4790, $t$pointing to flexible-working provisions$t$, $t$pointing to flexible working provisions$t$);
SELECT pg_temp.swap(4790, $t$convert her domestic-abuse programme$t$, $t$convert her domestic abuse programme$t$);
SELECT pg_temp.swap(4790, $t$her subsequent re-election and$t$, $t$her subsequent reelection and$t$);
SELECT pg_temp.swap(4790, $t$opposing the two-child limit$t$, $t$opposing the two child limit$t$);
-- member 4797
SELECT pg_temp.swap(4797, $t$35 per cent affordable-housing threshold$t$, $t$35 per cent affordable housing threshold$t$);
SELECT pg_temp.swap(4797, $t$about three-quarters of eligible$t$, $t$about three quarters of eligible$t$);
SELECT pg_temp.swap(4797, $t$£4.8 billion affordable-homes programme$t$, $t$£4.8 billion affordable homes programme$t$);
SELECT pg_temp.swap(4797, $t$7,500 mayor-supported affordable$t$, $t$7,500 mayor supported affordable$t$);
SELECT pg_temp.swap(4797, $t$helped abolish non-domiciled tax status and replace it with a residence-based system$t$, $t$helped abolish non domiciled tax status and replace it with a residence based system$t$);
SELECT pg_temp.swap(4797, $t$reached a five-year high$t$, $t$reached a five year high$t$);
SELECT pg_temp.swap(4797, $t$closer to decision-makers.$t$, $t$closer to decision makers.$t$);
SELECT pg_temp.swap(4797, $t$The affordable-housing threshold, improved$t$, $t$The affordable housing threshold, improved$t$);
SELECT pg_temp.swap(4797, $t$and resident-doctor settlement$t$, $t$and resident doctor settlement$t$);
-- member 4799
SELECT pg_temp.swap(4799, $t$a seven-person shortlist$t$, $t$a seven person shortlist$t$);
SELECT pg_temp.swap(4799, $t$Labour's Corbyn-supporting left$t$, $t$Labour's Corbyn supporting left$t$);
SELECT pg_temp.swap(4799, $t$attached to trade-union politics$t$, $t$attached to trade union politics$t$);
SELECT pg_temp.swap(4799, $t$an evidence-based drug policy$t$, $t$an evidence based drug policy$t$);
SELECT pg_temp.swap(4799, $t$The controlled-drugs campaign$t$, $t$The controlled drugs campaign$t$);
SELECT pg_temp.swap(4799, $t$her cross-party campaign$t$, $t$her cross party campaign$t$);
SELECT pg_temp.swap(4799, $t$the drug-research recommendations$t$, $t$the drug research recommendations$t$);
SELECT pg_temp.swap(4799, $t$a cross-government officials' group$t$, $t$a cross government officials' group$t$);
SELECT pg_temp.swap(4799, $t$tighter case-management rules$t$, $t$tighter case management rules$t$);
SELECT pg_temp.swap(4799, $t$accept third-party reports$t$, $t$accept third party reports$t$);
-- member 4811
SELECT pg_temp.swap(4811, $t$He was re-elected in 2024$t$, $t$He was elected again in 2024$t$);
SELECT pg_temp.swap(4811, $t$questions on UK-India relations$t$, $t$questions on relations between the UK and India$t$);
SELECT pg_temp.swap(4811, $t$built on working-class accountability$t$, $t$built on working class accountability$t$);
-- member 4822
SELECT pg_temp.swap(4822, $t$combine public-service reform$t$, $t$combine public service reform$t$);
SELECT pg_temp.swap(4822, $t$first ultra-low-emission street zones$t$, $t$first ultra low emission street zones$t$);
SELECT pg_temp.swap(4822, $t$one road-closure scheme$t$, $t$one road closure scheme$t$);
SELECT pg_temp.swap(4822, $t$that air-quality modelling$t$, $t$that air quality modelling$t$);
SELECT pg_temp.swap(4822, $t$automated minute-taking tool$t$, $t$automated minute taking tool$t$);
SELECT pg_temp.swap(4822, $t$an hour-long meeting$t$, $t$an hour long meeting$t$);
SELECT pg_temp.swap(4822, $t$the digital-government brief$t$, $t$the digital government brief$t$);
SELECT pg_temp.swap(4822, $t$transport and air-quality policies$t$, $t$transport and air quality policies$t$);
SELECT pg_temp.swap(4822, $t$useful cyber-security standards, public-service trials$t$, $t$useful cybersecurity standards, public service trials$t$);
-- member 4824
SELECT pg_temp.swap(4824, $t$shadow-cabinet rank$t$, $t$shadow cabinet rank$t$);
SELECT pg_temp.swap(4824, $t$the trade-union movement$t$, $t$the trade union movement$t$);
SELECT pg_temp.swap(4824, $t$joint-enterprise prosecutions$t$, $t$joint enterprise prosecutions$t$);
SELECT pg_temp.swap(4824, $t$Joint-enterprise reform failed$t$, $t$Joint enterprise reform failed$t$);
SELECT pg_temp.swap(4824, $t$at the cut-off date$t$, $t$at the cutoff date$t$);
SELECT pg_temp.swap(4824, $t$pressure-group backbencher$t$, $t$pressure group backbencher$t$);
SELECT pg_temp.swap(4824, $t$abolition of the two-child benefit limit.$t$, $t$abolition of the two child benefit limit.$t$);
SELECT pg_temp.swap(4824, $t$The abolition of the two-child benefit limit was$t$, $t$The abolition of the two child benefit limit was$t$);
SELECT pg_temp.swap(4824, $t$abolition of the two-child limit and$t$, $t$abolition of the two child limit and$t$);
-- member 4831
SELECT pg_temp.swap(4831, $t$historic social-media posts$t$, $t$historic social media posts$t$);
SELECT pg_temp.swap(4831, $t$achievement at the cut-off date$t$, $t$achievement at the cutoff date$t$);
SELECT pg_temp.swap(4831, $t$it as a one-off breach$t$, $t$it as a one off breach$t$);
SELECT pg_temp.swap(4831, $t$The two-child-limit rebellion$t$, $t$The two child limit rebellion$t$);
SELECT pg_temp.swap(4831, $t$calling for the two-child benefit limit to be abolished$t$, $t$calling for the two child benefit limit to be abolished$t$);
-- member 4849
SELECT pg_temp.swap(4849, $t$whose non-disclosure$t$, $t$whose nondisclosure$t$);
SELECT pg_temp.swap(4849, $t$Sentencing-attendance powers$t$, $t$Sentencing attendance powers$t$);
SELECT pg_temp.swap(4849, $t$The sentencing-attendance provision$t$, $t$The sentencing attendance provision$t$);
SELECT pg_temp.swap(4849, $t$on non-disclosure agreements still$t$, $t$on nondisclosure agreements still$t$);
SELECT pg_temp.swap(4849, $t$its cross-government nature$t$, $t$its cross government nature$t$);
SELECT pg_temp.swap(4849, $t$criminal-injury compensation$t$, $t$criminal injury compensation$t$);
SELECT pg_temp.swap(4849, $t$child sexual-abuse survivors$t$, $t$child sexual abuse survivors$t$);
SELECT pg_temp.swap(4849, $t$the paid-advocacy rule$t$, $t$the paid advocacy rule$t$);
SELECT pg_temp.swap(4849, $t$of pre-recorded cross-examination$t$, $t$of prerecorded cross examination$t$);
SELECT pg_temp.swap(4849, $t$under-counted$t$, $t$undercounted$t$);
SELECT pg_temp.swap(4849, $t$the peer-reviewed$t$, $t$the peer reviewed$t$);
-- member 4853
SELECT pg_temp.swap(4853, $t$He co-chairs the All Party$t$, $t$He is joint chair of the All Party$t$);
-- member 4861
SELECT pg_temp.swap(4861, $t$as a first-time challenger$t$, $t$as a first time challenger$t$);
SELECT pg_temp.swap(4861, $t$Commissioner by-election$t$, $t$Commissioner byelection$t$);
SELECT pg_temp.swap(4861, $t$usual Westminster policy-shop route$t$, $t$usual Westminster policy shop route$t$);
SELECT pg_temp.swap(4861, $t$one fractured right-of-centre vote$t$, $t$one fractured right of centre vote$t$);
-- member 4864
SELECT pg_temp.swap(4864, $t$turning a 712-vote survival$t$, $t$turning a 712 vote survival$t$);
SELECT pg_temp.swap(4864, $t$and co-chairs the APPG$t$, $t$and is joint chair of the APPG$t$);
-- member 4869
SELECT pg_temp.swap(4869, $t$both pro-Remain organisations$t$, $t$both pro Remain organisations$t$);
SELECT pg_temp.swap(4869, $t$back to minimum-wage care work$t$, $t$back to minimum wage care work$t$);
SELECT pg_temp.swap(4869, $t$recover from Post-Traumatic Stress Disorder$t$, $t$recover from Post Traumatic Stress Disorder$t$);
-- member 4870
SELECT pg_temp.swap(4870, $t$defeated Momentum-backed Katy Clark$t$, $t$defeated Momentum backed Katy Clark$t$);
SELECT pg_temp.swap(4870, $t$senior party and trade-union figures$t$, $t$senior party and trade union figures$t$);
SELECT pg_temp.swap(4870, $t$with the anti-Corbyn group Progress$t$, $t$with the anti Corbyn group Progress$t$);
SELECT pg_temp.swap(4870, $t$the retiring pro-Leave MP$t$, $t$the retiring pro Leave MP$t$);
SELECT pg_temp.swap(4870, $t$That emphatic cross-party result$t$, $t$That emphatic cross party result$t$);
SELECT pg_temp.swap(4870, $t$more social-rent housing$t$, $t$more social rent housing$t$);
SELECT pg_temp.swap(4870, $t$limits on above-market increases$t$, $t$limits on above market increases$t$);
SELECT pg_temp.swap(4870, $t$direct price-setting.$t$, $t$direct price setting.$t$);
SELECT pg_temp.swap(4870, $t$reduced affordable-housing target$t$, $t$reduced affordable housing target$t$);
SELECT pg_temp.swap(4870, $t$into council decision-making.$t$, $t$into council decision making.$t$);
SELECT pg_temp.swap(4870, $t$many housing-sector voices$t$, $t$many housing sector voices$t$);
SELECT pg_temp.swap(4870, $t$her temporary-accommodation report$t$, $t$her temporary accommodation report$t$);
SELECT pg_temp.swap(4870, $t$faster ground-rent cap$t$, $t$faster ground rent cap$t$);
-- member 4871
SELECT pg_temp.swap(4871, $t$campaign in north-west England$t$, $t$campaign in north west England$t$);
SELECT pg_temp.swap(4871, $t$whichever centre-ground leadership$t$, $t$whichever centre ground leadership$t$);
SELECT pg_temp.swap(4871, $t$restrict dismissal and re-engagement$t$, $t$restrict dismissal and reengagement$t$);
SELECT pg_temp.swap(4871, $t$Commons second-reading stage$t$, $t$Commons second reading stage$t$);
SELECT pg_temp.swap(4871, $t$The promised 750-place permanent$t$, $t$The promised 750 place permanent$t$);
SELECT pg_temp.swap(4871, $t$Wakeford co-sponsored a Bill$t$, $t$Wakeford cosponsored a Bill$t$);
SELECT pg_temp.swap(4871, $t$he rejected a by-election$t$, $t$he rejected a byelection$t$);
SELECT pg_temp.swap(4871, $t$execute a high-risk defection$t$, $t$execute a high risk defection$t$);
SELECT pg_temp.swap(4871, $t$unfinished at the cut-off date$t$, $t$unfinished at the cutoff date$t$);
-- member 4873
SELECT pg_temp.swap(4873, $t$Cabinet Office (2021-2023)$t$, $t$Cabinet Office (2021 to 2023)$t$);
-- member 4923
SELECT pg_temp.swap(4923, $t$Batley and Spen by-election$t$, $t$Batley and Spen byelection$t$);
SELECT pg_temp.swap(4923, $t$a far-right extremist$t$, $t$a far right extremist$t$);
SELECT pg_temp.swap(4923, $t$supported cross-party work$t$, $t$supported cross party work$t$);
SELECT pg_temp.swap(4923, $t$report-stage scrutiny$t$, $t$report stage scrutiny$t$);
SELECT pg_temp.swap(4923, $t$assembled a cross-party coalition$t$, $t$assembled a cross party coalition$t$);
SELECT pg_temp.swap(4923, $t$no assisted-dying service$t$, $t$no assisted dying service$t$);
SELECT pg_temp.swap(4923, $t$political-literacy education, candidate-safety measures$t$, $t$political literacy education, candidate safety measures$t$);
SELECT pg_temp.swap(4923, $t$the assisted-dying campaign$t$, $t$the assisted dying campaign$t$);
SELECT pg_temp.swap(4923, $t$social-work expertise$t$, $t$social work expertise$t$);
-- member 4938
SELECT pg_temp.swap(4938, $t$2022 Erdington by-election$t$, $t$2022 Erdington byelection$t$);
SELECT pg_temp.swap(4938, $t$before the 2022 by-election should$t$, $t$before the 2022 byelection should$t$);
-- member 4943
SELECT pg_temp.swap(4943, $t$won the Wakefield by-election$t$, $t$won the Wakefield byelection$t$);
SELECT pg_temp.swap(4943, $t$He was re-elected for Wakefield$t$, $t$He was elected again for Wakefield$t$);
-- member 4976
SELECT pg_temp.swap(4976, $t$City of Chester by-election$t$, $t$City of Chester byelection$t$);
-- member 4979
SELECT pg_temp.swap(4979, $t$Urmston by-election$t$, $t$Urmston byelection$t$);
SELECT pg_temp.swap(4979, $t$DWP's information-gathering and$t$, $t$DWP's information gathering and$t$);
SELECT pg_temp.swap(4979, $t$between 2026-27 and 2028-29$t$, $t$between 2026/27 and 2028/29$t$);
SELECT pg_temp.swap(4979, $t$3.3 per cent in 2024-25$t$, $t$3.3 per cent in 2024/25$t$);
SELECT pg_temp.swap(4979, $t$complaints in 2025-26$t$, $t$complaints in 2025/26$t$);
SELECT pg_temp.swap(4979, $t$incorrect earnings-averaging guidance$t$, $t$incorrect earnings averaging guidance$t$);
-- member 4981
SELECT pg_temp.swap(4981, $t$West Lancashire by-election$t$, $t$West Lancashire byelection$t$);
SELECT pg_temp.swap(4981, $t$was in public-health planning$t$, $t$was in public health planning$t$);
SELECT pg_temp.swap(4981, $t$remained a ten-year programme$t$, $t$remained a ten year programme$t$);
SELECT pg_temp.swap(4981, $t$extended opt-out testing$t$, $t$extended opt out testing$t$);
SELECT pg_temp.swap(4981, $t$NHS App home-testing trial$t$, $t$NHS App home testing trial$t$);
SELECT pg_temp.swap(4981, $t$Streeting and public-health director$t$, $t$Streeting and public health director$t$);
SELECT pg_temp.swap(4981, $t$sexual-health clinics$t$, $t$sexual health clinics$t$);
SELECT pg_temp.swap(4981, $t$raise five-year survival$t$, $t$raise five year survival$t$);
SELECT pg_temp.swap(4981, $t$cancer waiting-time standards$t$, $t$cancer waiting time standards$t$);
SELECT pg_temp.swap(4981, $t$better metastatic-cancer data$t$, $t$better metastatic cancer data$t$);
SELECT pg_temp.swap(4981, $t$several neglected public-health issues$t$, $t$several neglected public health issues$t$);
SELECT pg_temp.swap(4981, $t$of junk-food advertising$t$, $t$of junk food advertising$t$);
SELECT pg_temp.swap(4981, $t$force long-term delivery$t$, $t$force long term delivery$t$);
-- member 4993
SELECT pg_temp.swap(4993, $t$Ainsty by-election$t$, $t$Ainsty byelection$t$);
SELECT pg_temp.swap(4993, $t$with government-directed transport$t$, $t$with government directed transport$t$);
SELECT pg_temp.swap(4993, $t$for a revenue-certainty mechanism$t$, $t$for a revenue certainty mechanism$t$);
SELECT pg_temp.swap(4993, $t$for low-carbon fuel$t$, $t$for low carbon fuel$t$);
SELECT pg_temp.swap(4993, $t$The sustainable-fuel legislation$t$, $t$The sustainable fuel legislation$t$);
-- member 5000
SELECT pg_temp.swap(5000, $t$at the October 2023 by-election$t$, $t$at the October 2023 byelection$t$);
SELECT pg_temp.swap(5000, $t$months after the by-election, he$t$, $t$months after the byelection, he$t$);
SELECT pg_temp.swap(5000, $t$£28 billion green-investment pledge$t$, $t$£28 billion green investment pledge$t$);
SELECT pg_temp.swap(5000, $t$owners of new-build homes$t$, $t$owners of new build homes$t$);
SELECT pg_temp.swap(5000, $t$the proposed inheritance-tax treatment$t$, $t$the proposed inheritance tax treatment$t$);
-- member 5001
SELECT pg_temp.swap(5001, $t$Tamworth at the by-election of$t$, $t$Tamworth at the byelection of$t$);
SELECT pg_temp.swap(5001, $t$on a 24-point swing$t$, $t$on a 24 point swing$t$);
-- member 5010
SELECT pg_temp.swap(5010, $t$parliamentary by-election$t$, $t$parliamentary byelection$t$);
SELECT pg_temp.swap(5010, $t$for community-led housing and proposed council-owned homes$t$, $t$for community led housing and proposed council owned homes$t$);
SELECT pg_temp.swap(5010, $t$In foreign-policy politics$t$, $t$In foreign policy politics$t$);
SELECT pg_temp.swap(5010, $t$within pro-Israel Labour$t$, $t$within pro Israel Labour$t$);
SELECT pg_temp.swap(5010, $t$of pro-Palestinian campaigners$t$, $t$of pro Palestinian campaigners$t$);
SELECT pg_temp.swap(5010, $t$between 2018-19 and 2020-21, while 585 council-programme homes$t$, $t$between 2018/19 and 2020/21, while 585 council programme homes$t$);
SELECT pg_temp.swap(5010, $t$tenures in 2021-22, well below its government-assessed$t$, $t$tenures in 2021/22, well below its government assessed$t$);
SELECT pg_temp.swap(5010, $t$5,000 fire-safety actions$t$, $t$5,000 fire safety actions$t$);
SELECT pg_temp.swap(5010, $t$data and fire-safety work$t$, $t$data and fire safety work$t$);
SELECT pg_temp.swap(5010, $t$partnership-builder$t$, $t$partnership builder$t$);
-- member 5011
SELECT pg_temp.swap(5011, $t$Wellingborough by-election$t$, $t$Wellingborough byelection$t$);
SELECT pg_temp.swap(5011, $t$28.5-point swing, the second-largest movement$t$, $t$28.5 point swing, the second largest movement$t$);
SELECT pg_temp.swap(5011, $t$Labour at a by-election since$t$, $t$Labour at a byelection since$t$);
SELECT pg_temp.swap(5011, $t$and community-needs indices$t$, $t$and community needs indices$t$);
-- member 5025
SELECT pg_temp.swap(5025, $t$May 2024 by-election on a 26-point swing$t$, $t$May 2024 byelection on a 26 point swing$t$);
SELECT pg_temp.swap(5025, $t$proposed disability-benefit cuts$t$, $t$proposed disability benefit cuts$t$);
SELECT pg_temp.swap(5025, $t$infant-formula campaign$t$, $t$infant formula campaign$t$);
SELECT pg_temp.swap(5025, $t$collective or formula-based public spending$t$, $t$collective or formula based public spending$t$);
SELECT pg_temp.swap(5025, $t$abolition of the two-child benefit limit$t$, $t$abolition of the two child benefit limit$t$);
-- member 5028
SELECT pg_temp.swap(5028, $t$in the north-east.$t$, $t$in the north east.$t$);
SELECT pg_temp.swap(5028, $t$a pro-regeneration view$t$, $t$a pro regeneration view$t$);
SELECT pg_temp.swap(5028, $t$cancer waiting-list variation, unreported follow-up waits$t$, $t$cancer waiting list variation, unreported follow up waits$t$);
SELECT pg_temp.swap(5028, $t$clear waiting-time standards$t$, $t$clear waiting time standards$t$);
SELECT pg_temp.swap(5028, $t$newborn heel-prick test$t$, $t$newborn heel prick test$t$);
SELECT pg_temp.swap(5028, $t$the planned in-service evaluation$t$, $t$the planned in service evaluation$t$);
SELECT pg_temp.swap(5028, $t$describes an in-service evaluation$t$, $t$describes an in service evaluation$t$);
SELECT pg_temp.swap(5028, $t$Nissan-linked advanced manufacturing$t$, $t$Nissan linked advanced manufacturing$t$);
SELECT pg_temp.swap(5028, $t$Mental health waiting-time standards$t$, $t$Mental health waiting time standards$t$);
SELECT pg_temp.swap(5028, $t$board-building stage$t$, $t$board building stage$t$);
SELECT pg_temp.swap(5028, $t$policy-minded backbencher$t$, $t$policy minded backbencher$t$);
SELECT pg_temp.swap(5028, $t$petition-led scrutiny$t$, $t$petition led scrutiny$t$);
SELECT pg_temp.swap(5028, $t$debate on e-petition 755980$t$, $t$debate on online petition 755980$t$);
-- member 5029
SELECT pg_temp.swap(5029, $t$a constituency-style campaign$t$, $t$a constituency style campaign$t$);
-- member 5030
SELECT pg_temp.swap(5030, $t$hospitals and mental-health settings$t$, $t$hospitals and mental health settings$t$);
SELECT pg_temp.swap(5030, $t$commissioned a county-wide service$t$, $t$commissioned a countywide service$t$);
SELECT pg_temp.swap(5030, $t$reduce disability-related benefits$t$, $t$reduce disability related benefits$t$);
SELECT pg_temp.swap(5030, $t$above Treasury-led attempts$t$, $t$above Treasury led attempts$t$);
SELECT pg_temp.swap(5030, $t$financing home-energy improvements$t$, $t$financing home energy improvements$t$);
SELECT pg_temp.swap(5030, $t$restrict fossil-fuel advertising$t$, $t$restrict fossil fuel advertising$t$);
SELECT pg_temp.swap(5030, $t$wider preventive-health programme$t$, $t$wider preventive health programme$t$);
-- member 5031
SELECT pg_temp.swap(5031, $t$the Labour-supporting website$t$, $t$the Labour supporting website$t$);
SELECT pg_temp.swap(5031, $t$officials and trade-union representatives$t$, $t$officials and trade union representatives$t$);
SELECT pg_temp.swap(5031, $t$a mainstream trade-union Labour politician$t$, $t$a mainstream trade union Labour politician$t$);
SELECT pg_temp.swap(5031, $t$economic and public-service concerns$t$, $t$economic and public service concerns$t$);
SELECT pg_temp.swap(5031, $t$leadership and trade-union network$t$, $t$leadership and trade union network$t$);
SELECT pg_temp.swap(5031, $t$he has supported—including employment-rights legislation and wider investment in the North East—were manifesto$t$, $t$he has supported, including employment rights legislation and wider investment in the North East, were manifesto$t$);
SELECT pg_temp.swap(5031, $t$with his trade-union and social-justice credentials$t$, $t$with his trade union and social justice credentials$t$);
SELECT pg_temp.swap(5031, $t$Labour and trade-union experience$t$, $t$Labour and trade union experience$t$);
-- member 5033
SELECT pg_temp.swap(5033, $t$the government-commissioned Independent$t$, $t$the government commissioned Independent$t$);
SELECT pg_temp.swap(5033, $t$a new family-help service$t$, $t$a new family help service$t$);
SELECT pg_temp.swap(5033, $t$a residential-care market$t$, $t$a residential care market$t$);
SELECT pg_temp.swap(5033, $t$lacked a market-oversight function$t$, $t$lacked a market oversight function$t$);
SELECT pg_temp.swap(5033, $t$public and not-for-profit provision$t$, $t$public and not for profit provision$t$);
SELECT pg_temp.swap(5033, $t$wider child-protection and social-care reforms$t$, $t$wider child protection and social care reforms$t$);
SELECT pg_temp.swap(5033, $t$funding for social-care reform$t$, $t$funding for social care reform$t$);
SELECT pg_temp.swap(5033, $t$new market-oversight powers$t$, $t$new market oversight powers$t$);
SELECT pg_temp.swap(5033, $t$The digital-safety bill was$t$, $t$The digital safety bill was$t$);
SELECT pg_temp.swap(5033, $t$his digital-safety bill to be diluted$t$, $t$his digital safety bill to be diluted$t$);
SELECT pg_temp.swap(5033, $t$Few first-term MPs$t$, $t$Few first term MPs$t$);
-- member 5034
SELECT pg_temp.swap(5034, $t$In his gas-grid debate$t$, $t$In his gas grid debate$t$);
SELECT pg_temp.swap(5034, $t$other lower-carbon gases$t$, $t$other lower carbon gases$t$);
SELECT pg_temp.swap(5034, $t$the government-held investment reserve$t$, $t$the government held investment reserve$t$);
SELECT pg_temp.swap(5034, $t$backed by long-running campaigning$t$, $t$backed by long running campaigning$t$);
SELECT pg_temp.swap(5034, $t$a one-off average payment$t$, $t$a one off average payment$t$);
SELECT pg_temp.swap(5034, $t$Staffordshire urgent-care debate$t$, $t$Staffordshire urgent care debate$t$);
SELECT pg_temp.swap(5034, $t$restoration of urgent-care provision$t$, $t$restoration of urgent care provision$t$);
-- member 5035
SELECT pg_temp.swap(5035, $t$Harry Parker was a 14-year-old killed in 2022$t$, $t$Harry Parker was killed aged 14 in 2022$t$);
SELECT pg_temp.swap(5035, $t$people for defence-industry careers$t$, $t$people for defence industry careers$t$);
-- member 5036
SELECT pg_temp.swap(5036, $t$seek a high-profile factional$t$, $t$seek a high profile factional$t$);
SELECT pg_temp.swap(5036, $t$of children's social-care reform$t$, $t$of children's social care reform$t$);
SELECT pg_temp.swap(5036, $t$before the July 2026 cut-off that$t$, $t$before the July 2026 cutoff that$t$);
SELECT pg_temp.swap(5036, $t$available to a first-term backbench$t$, $t$available to a first term backbench$t$);
SELECT pg_temp.swap(5036, $t$competence as a constituency-focused$t$, $t$competence as a constituency focused$t$);
SELECT pg_temp.swap(5036, $t$by the July 2026 cut-off there$t$, $t$by the July 2026 cutoff there$t$);
-- member 5037
SELECT pg_temp.swap(5037, $t$through trade-union and living-wage campaigns$t$, $t$through trade union and living wage campaigns$t$);
SELECT pg_temp.swap(5037, $t$trade-union wing$t$, $t$trade union wing$t$);
SELECT pg_temp.swap(5037, $t$She co-founded and co-chaired the$t$, $t$She was a founder and joint chair of the$t$);
SELECT pg_temp.swap(5037, $t$restricting advance-rent demands$t$, $t$restricting advance rent demands$t$);
SELECT pg_temp.swap(5037, $t$targeted for 2028–29.$t$, $t$targeted for 2028/29.$t$);
SELECT pg_temp.swap(5037, $t$but it pre-dated her election$t$, $t$but it predated her election$t$);
SELECT pg_temp.swap(5037, $t$a local online-safety forum$t$, $t$a local online safety forum$t$);
SELECT pg_temp.swap(5037, $t$access to decision-makers$t$, $t$access to decision makers$t$);
SELECT pg_temp.swap(5037, $t$her pro-worker reputation$t$, $t$her pro worker reputation$t$);
SELECT pg_temp.swap(5037, $t$not begun by the cut-off date$t$, $t$not begun by the cutoff date$t$);
SELECT pg_temp.swap(5037, $t$her online-safety work$t$, $t$her online safety work$t$);
-- member 5038
SELECT pg_temp.swap(5038, $t$Makerfield by-election$t$, $t$Makerfield byelection$t$);
SELECT pg_temp.swap(5038, $t$Labour's trade-union tradition$t$, $t$Labour's trade union tradition$t$);
SELECT pg_temp.swap(5038, $t$disability-benefit reforms$t$, $t$disability benefit reforms$t$);
SELECT pg_temp.swap(5038, $t$review co-produced with$t$, $t$review coproduced with$t$);
SELECT pg_temp.swap(5038, $t$murdering Korbel's nine-year-old daughter, Olivia Pratt-Korbel, refused$t$, $t$murdering Korbel's daughter, Olivia Pratt-Korbel, aged nine, refused$t$);
SELECT pg_temp.swap(5038, $t$Korbel's victim-impact statement$t$, $t$Korbel's victim impact statement$t$);
SELECT pg_temp.swap(5038, $t$a family-led campaign$t$, $t$a family led campaign$t$);
SELECT pg_temp.swap(5038, $t$organiser, alliance-builder and$t$, $t$organiser, alliance builder and$t$);
SELECT pg_temp.swap(5038, $t$by the cut-off, run$t$, $t$by the cutoff, run$t$);
-- member 5039
SELECT pg_temp.swap(5039, $t$public-sector productivity$t$, $t$public sector productivity$t$);
SELECT pg_temp.swap(5039, $t$Cabinet-level discussions$t$, $t$Cabinet level discussions$t$);
SELECT pg_temp.swap(5039, $t$open-source developers$t$, $t$open source developers$t$);
SELECT pg_temp.swap(5039, $t$data-centre design work$t$, $t$data centre design work$t$);
SELECT pg_temp.swap(5039, $t$backed an under-16 social-media ban$t$, $t$backed a social media ban for under 16s$t$);
SELECT pg_temp.swap(5039, $t$excluding under-16s$t$, $t$excluding under 16s$t$);
SELECT pg_temp.swap(5039, $t$existing online-safety regime$t$, $t$existing online safety regime$t$);
SELECT pg_temp.swap(5039, $t$reduced public-service waiting times$t$, $t$reduced public service waiting times$t$);
SELECT pg_temp.swap(5039, $t$dedicated frontier-AI legislation$t$, $t$dedicated frontier AI legislation$t$);
SELECT pg_temp.swap(5039, $t$a sector-led and use-based approach$t$, $t$a sector led and use based approach$t$);
SELECT pg_temp.swap(5039, $t$children's social-media use$t$, $t$children's social media use$t$);
SELECT pg_temp.swap(5039, $t$inherited online-safety powers$t$, $t$inherited online safety powers$t$);
-- member 5041
SELECT pg_temp.swap(5041, $t$into a co-operative council$t$, $t$into a cooperative council$t$);
SELECT pg_temp.swap(5041, $t$a generic Labour-Conservative fight$t$, $t$a generic Labour and Conservative fight$t$);
-- member 5043
SELECT pg_temp.swap(5043, $t$visible public-service pressure$t$, $t$visible public service pressure$t$);
SELECT pg_temp.swap(5043, $t$earlier levelling-up bid$t$, $t$earlier levelling up bid$t$);
SELECT pg_temp.swap(5043, $t$full stroke-care bundle$t$, $t$full stroke care bundle$t$);
SELECT pg_temp.swap(5043, $t$Government housing-budget decisions$t$, $t$Government housing budget decisions$t$);
SELECT pg_temp.swap(5043, $t$concrete constituency-linked outcomes$t$, $t$concrete constituency linked outcomes$t$);
SELECT pg_temp.swap(5043, $t$local under-delivery$t$, $t$local under delivery$t$);
SELECT pg_temp.swap(5043, $t$endowment-style fund$t$, $t$endowment style fund$t$);
SELECT pg_temp.swap(5043, $t$and council-led,$t$, $t$and council led,$t$);
SELECT pg_temp.swap(5043, $t$supply-chain pressures and missed tree-planting targets$t$, $t$supply chain pressures and missed tree planting targets$t$);
SELECT pg_temp.swap(5043, $t$The stroke-care figures$t$, $t$The stroke care figures$t$);
SELECT pg_temp.swap(5043, $t$a constituency-focused Scottish$t$, $t$a constituency focused Scottish$t$);
SELECT pg_temp.swap(5043, $t$economic and public-service pressure$t$, $t$economic and public service pressure$t$);
SELECT pg_temp.swap(5043, $t$and wood-sector issues$t$, $t$and wood sector issues$t$);
-- member 5044
SELECT pg_temp.swap(5044, $t$free-market view$t$, $t$free market view$t$);
SELECT pg_temp.swap(5044, $t$emergency bleed-control equipment$t$, $t$emergency bleed control equipment$t$);
SELECT pg_temp.swap(5044, $t$council, and — with such directions taking effect only after a year's notice — it had$t$, $t$council, and (with such directions taking effect only after a year's notice) it had$t$);
SELECT pg_temp.swap(5044, $t$at the cut-off date$t$, $t$at the cutoff date$t$);
SELECT pg_temp.swap(5044, $t$community-need data$t$, $t$community need data$t$);
-- member 5046
SELECT pg_temp.swap(5046, $t$important general-election target$t$, $t$important general election target$t$);
SELECT pg_temp.swap(5046, $t$and devolved-election results$t$, $t$and devolved election results$t$);
SELECT pg_temp.swap(5046, $t$temporarily extend alcohol-licensing hours$t$, $t$temporarily extend alcohol licensing hours$t$);
SELECT pg_temp.swap(5046, $t$secured government and cross-party support$t$, $t$secured government and cross party support$t$);
SELECT pg_temp.swap(5046, $t$increase alcohol-related violence$t$, $t$increase alcohol related violence$t$);
-- member 5047
SELECT pg_temp.swap(5047, $t$non-factional, anti-Corbyn wing$t$, $t$non factional, anti Corbyn wing$t$);
SELECT pg_temp.swap(5047, $t$more left-wing candidate$t$, $t$more left wing candidate$t$);
SELECT pg_temp.swap(5047, $t$a coal-fired power station$t$, $t$a coal fired power station$t$);
SELECT pg_temp.swap(5047, $t$experimental clean-energy industry$t$, $t$experimental clean energy industry$t$);
SELECT pg_temp.swap(5047, $t$more pro-European$t$, $t$more pro European$t$);
SELECT pg_temp.swap(5047, $t$on a UK-EU customs union$t$, $t$on a UK and EU customs union$t$);
SELECT pg_temp.swap(5047, $t$an up-to-date legal$t$, $t$an up to date legal$t$);
SELECT pg_temp.swap(5047, $t$town-centre and regeneration$t$, $t$town centre and regeneration$t$);
SELECT pg_temp.swap(5047, $t$the 2023-24 net budget$t$, $t$the 2023/24 net budget$t$);
SELECT pg_temp.swap(5047, $t$construction-partner contract$t$, $t$construction partner contract$t$);
SELECT pg_temp.swap(5047, $t$over inheritance-tax relief$t$, $t$over inheritance tax relief$t$);
SELECT pg_temp.swap(5047, $t$the qualifying-assets threshold$t$, $t$the qualifying assets threshold$t$);
SELECT pg_temp.swap(5047, $t$effective council-level political$t$, $t$effective council level political$t$);
SELECT pg_temp.swap(5047, $t$national policy-maker$t$, $t$national policymaker$t$);
-- member 5048
SELECT pg_temp.swap(5048, $t$trade-union network but$t$, $t$trade union network but$t$);
SELECT pg_temp.swap(5048, $t$employment-rights programme$t$, $t$employment rights programme$t$);
SELECT pg_temp.swap(5048, $t$of a well-connected policy$t$, $t$of a well connected policy$t$);
SELECT pg_temp.swap(5048, $t$leave became day-one rights$t$, $t$leave became day one rights$t$);
SELECT pg_temp.swap(5048, $t$Labour abandoned day-one protection$t$, $t$Labour abandoned day one protection$t$);
SELECT pg_temp.swap(5048, $t$of a six-month qualifying period$t$, $t$of a six month qualifying period$t$);
SELECT pg_temp.swap(5048, $t$reduce bogus self-employment$t$, $t$reduce bogus self employment$t$);
SELECT pg_temp.swap(5048, $t$the reform by the cut-off.$t$, $t$the reform by the cutoff.$t$);
SELECT pg_temp.swap(5048, $t$disability-benefit proposals$t$, $t$disability benefit proposals$t$);
SELECT pg_temp.swap(5048, $t$backbencher and trade-union advocate$t$, $t$backbencher and trade union advocate$t$);
-- member 5051
SELECT pg_temp.swap(5051, $t$are local-government minded$t$, $t$are local government minded$t$);
SELECT pg_temp.swap(5051, $t$He raised fly-tipping in Bedwell$t$, $t$He raised flytipping in Bedwell$t$);
SELECT pg_temp.swap(5051, $t$a debate on fly-tipping in residential$t$, $t$a debate on flytipping in residential$t$);
SELECT pg_temp.swap(5051, $t$or later-life security$t$, $t$or later life security$t$);
SELECT pg_temp.swap(5051, $t$that working-class young people$t$, $t$that working class young people$t$);
SELECT pg_temp.swap(5051, $t$His work on fly-tipping$t$, $t$His work on flytipping$t$);
SELECT pg_temp.swap(5051, $t$a funded clean-up programme$t$, $t$a funded cleanup programme$t$);
SELECT pg_temp.swap(5051, $t$a wider cross-party debate$t$, $t$a wider cross party debate$t$);
SELECT pg_temp.swap(5051, $t$loyal, constituency-focused Labour$t$, $t$loyal, constituency focused Labour$t$);
SELECT pg_temp.swap(5051, $t$measurable public-service change$t$, $t$measurable public service change$t$);
-- member 5052
SELECT pg_temp.swap(5052, $t$Mossley Hill (2011-2023)$t$, $t$Mossley Hill (2011 to 2023)$t$);
-- member 5056
SELECT pg_temp.swap(5056, $t$parallel anti-BNP work$t$, $t$parallel anti BNP work$t$);
SELECT pg_temp.swap(5056, $t$obsessive-compulsive disorder$t$, $t$obsessive compulsive disorder$t$);
SELECT pg_temp.swap(5056, $t$specialist mental-health units$t$, $t$specialist mental health units$t$);
SELECT pg_temp.swap(5056, $t$special-school expansion$t$, $t$special school expansion$t$);
SELECT pg_temp.swap(5056, $t$in-principle commitment$t$, $t$in principle commitment$t$);
SELECT pg_temp.swap(5056, $t$debt in 2026-27$t$, $t$debt in 2026/27$t$);
SELECT pg_temp.swap(5056, $t$part of local-government reorganisation$t$, $t$part of local government reorganisation$t$);
SELECT pg_temp.swap(5056, $t$commissioner-led recovery$t$, $t$commissioner led recovery$t$);
SELECT pg_temp.swap(5056, $t$long-delayed lifts$t$, $t$long delayed lifts$t$);
SELECT pg_temp.swap(5056, $t$the restraint-reporting clause$t$, $t$the restraint reporting clause$t$);
SELECT pg_temp.swap(5056, $t$disciplined, union-backed Labour$t$, $t$disciplined, union backed Labour$t$);
SELECT pg_temp.swap(5056, $t$an above-average first-term backbencher$t$, $t$an above average first term backbencher$t$);
-- member 5057
SELECT pg_temp.swap(5057, $t$£1.5 million for 2025-27$t$, $t$£1.5 million for 2025 to 2027$t$);
SELECT pg_temp.swap(5057, $t$of longer-term Pride in Place$t$, $t$of longer term Pride in Place$t$);
SELECT pg_temp.swap(5057, $t$July 2026 cut-off$t$, $t$July 2026 cutoff$t$);
SELECT pg_temp.swap(5057, $t$and town-centre connections$t$, $t$and town centre connections$t$);
-- member 5058
SELECT pg_temp.swap(5058, $t$established a not-for-profit organisation$t$, $t$established a not for profit organisation$t$);
SELECT pg_temp.swap(5058, $t$three years of evidence-based training$t$, $t$three years of evidence based training$t$);
SELECT pg_temp.swap(5058, $t$Her human-rights work$t$, $t$Her human rights work$t$);
SELECT pg_temp.swap(5058, $t$renewed hate-crime pledge$t$, $t$renewed hate crime pledge$t$);
SELECT pg_temp.swap(5058, $t$committee work, cross-party debates$t$, $t$committee work, cross party debates$t$);
SELECT pg_temp.swap(5058, $t$detailed human-rights scrutiny$t$, $t$detailed human rights scrutiny$t$);
-- member 5059
SELECT pg_temp.swap(5059, $t$her social-media activity$t$, $t$her social media activity$t$);
SELECT pg_temp.swap(5059, $t$Gorton and Denton by-election$t$, $t$Gorton and Denton byelection$t$);
SELECT pg_temp.swap(5059, $t$contest a different by-election$t$, $t$contest a different byelection$t$);
SELECT pg_temp.swap(5059, $t$contributed to a by-election defeat$t$, $t$contributed to a byelection defeat$t$);
-- member 5061
SELECT pg_temp.swap(5061, $t$the pro-European campaign$t$, $t$the pro European campaign$t$);
SELECT pg_temp.swap(5061, $t$Labour's pro-European argument$t$, $t$Labour's pro European argument$t$);
SELECT pg_temp.swap(5061, $t$time-limited youth visa$t$, $t$time limited youth visa$t$);
SELECT pg_temp.swap(5061, $t$Swiss-style economic ties$t$, $t$Swiss style economic ties$t$);
SELECT pg_temp.swap(5061, $t$closer food-trade alignment$t$, $t$closer food trade alignment$t$);
SELECT pg_temp.swap(5061, $t$entered formal UK-EU negotiations$t$, $t$entered formal negotiations between the UK and the EU$t$);
SELECT pg_temp.swap(5061, $t$private waste-enforcement contractor$t$, $t$private waste enforcement contractor$t$);
SELECT pg_temp.swap(5061, $t$unjustified fly-tipping cases$t$, $t$unjustified flytipping cases$t$);
SELECT pg_temp.swap(5061, $t$a decade-long, multi-billion-pound infrastructure$t$, $t$a decade long, multibillion pound infrastructure$t$);
SELECT pg_temp.swap(5061, $t$no UK-EU youth experience scheme had been agreed$t$, $t$no youth experience scheme between the UK and the EU had been agreed$t$);
-- member 5063
SELECT pg_temp.swap(5063, $t$Labour’s anti-Corbyn institutional wing$t$, $t$Labour’s anti Corbyn institutional wing$t$);
SELECT pg_temp.swap(5063, $t$party structures, trade-union organisation$t$, $t$party structures, trade union organisation$t$);
SELECT pg_temp.swap(5063, $t$public faction-building$t$, $t$public faction building$t$);
SELECT pg_temp.swap(5063, $t$description of a trade-union Labour politician$t$, $t$description of a trade union Labour politician$t$);
SELECT pg_temp.swap(5063, $t$distinctive foreign-policy cause$t$, $t$distinctive foreign policy cause$t$);
SELECT pg_temp.swap(5063, $t$As co-chair$t$, $t$As joint chair$t$);
SELECT pg_temp.swap(5063, $t$assembled cross-party support$t$, $t$assembled cross party support$t$);
SELECT pg_temp.swap(5063, $t$infected-blood compensation$t$, $t$infected blood compensation$t$);
SELECT pg_temp.swap(5063, $t$committees, cross-party campaigns$t$, $t$committees, cross party campaigns$t$);
SELECT pg_temp.swap(5063, $t$public-affairs company$t$, $t$public affairs company$t$);
SELECT pg_temp.swap(5063, $t$third-party lobbying$t$, $t$third party lobbying$t$);
SELECT pg_temp.swap(5063, $t$up to the cut-off.$t$, $t$up to the cutoff.$t$);
SELECT pg_temp.swap(5063, $t$policy-delivery minister$t$, $t$policy delivery minister$t$);
-- member 5067
SELECT pg_temp.swap(5067, $t$Petitions Committee, co-chairs the APPG$t$, $t$Petitions Committee, is joint chair of the APPG$t$);
SELECT pg_temp.swap(5067, $t$China and co-chairs the Refugees$t$, $t$China and is joint chair of the Refugees$t$);
-- member 5068
SELECT pg_temp.swap(5068, $t$had self-destructed in the seat$t$, $t$had self destructed in the seat$t$);
SELECT pg_temp.swap(5068, $t$and a first-time candidate$t$, $t$and a first time candidate$t$);
-- member 5071
SELECT pg_temp.swap(5071, $t$The Rochdale by-election$t$, $t$The Rochdale byelection$t$);
-- member 5075
SELECT pg_temp.swap(5075, $t$that of a trade-union Labour politician$t$, $t$that of a trade union Labour politician$t$);
SELECT pg_temp.swap(5075, $t$the borough's net-zero programme$t$, $t$the borough's net zero programme$t$);
SELECT pg_temp.swap(5075, $t$the council-owned Greener Ealing$t$, $t$the council owned Greener Ealing$t$);
SELECT pg_temp.swap(5075, $t$and cycle-lane parking$t$, $t$and cycle lane parking$t$);
SELECT pg_temp.swap(5075, $t$matched Costigan's trade-union politics$t$, $t$matched Costigan's trade union politics$t$);
SELECT pg_temp.swap(5075, $t$Ealing's 2022-27 air-quality plan$t$, $t$Ealing's 2022 to 2027 air quality plan$t$);
SELECT pg_temp.swap(5075, $t$That long-term reduction$t$, $t$That long term reduction$t$);
SELECT pg_temp.swap(5075, $t$Seven low-traffic neighbourhoods$t$, $t$Seven low traffic neighbourhoods$t$);
SELECT pg_temp.swap(5075, $t$endorsed a two-week response$t$, $t$endorsed a two week response$t$);
SELECT pg_temp.swap(5075, $t$union and local-government tradition$t$, $t$union and local government tradition$t$);
SELECT pg_temp.swap(5075, $t$enforcement in-house was$t$, $t$enforcement in house was$t$);
-- member 5076
SELECT pg_temp.swap(5076, $t$Together, the cross-party campaign$t$, $t$Together, the cross party campaign$t$);
SELECT pg_temp.swap(5076, $t$Its data-led strategy$t$, $t$Its data led strategy$t$);
SELECT pg_temp.swap(5076, $t$by the cut-off date$t$, $t$by the cutoff date$t$);
SELECT pg_temp.swap(5076, $t$form of pro-business Labour$t$, $t$form of pro business Labour$t$);
SELECT pg_temp.swap(5076, $t$constitutional or free-market idealism$t$, $t$constitutional or free market idealism$t$);
SELECT pg_temp.swap(5076, $t$By mid-2026 the department$t$, $t$By mid 2026 the department$t$);
SELECT pg_temp.swap(5076, $t$separate family-members scheme$t$, $t$separate family members scheme$t$);
SELECT pg_temp.swap(5076, $t$proposed a 60-day ceiling$t$, $t$proposed a 60 day ceiling$t$);
SELECT pg_temp.swap(5076, $t$its processing-time target$t$, $t$its processing time target$t$);
-- member 5077
SELECT pg_temp.swap(5077, $t$pragmatic, leadership-supporting mainstream$t$, $t$pragmatic, leadership supporting mainstream$t$);
SELECT pg_temp.swap(5077, $t$motivated by anti-LGBT hostility$t$, $t$motivated by anti LGBT hostility$t$);
SELECT pg_temp.swap(5077, $t$business and cross-party support$t$, $t$business and cross party support$t$);
SELECT pg_temp.swap(5077, $t$third road-investment strategy. Hansard records a well-organised$t$, $t$third road investment strategy. Hansard records a well organised$t$);
SELECT pg_temp.swap(5077, $t$towards the 2031–36 programme$t$, $t$towards the 2031 to 2036 programme$t$);
SELECT pg_temp.swap(5077, $t$by the reporting cut-off.$t$, $t$by the reporting cutoff.$t$);
-- member 5079
SELECT pg_temp.swap(5079, $t$31 July cut-off amounted$t$, $t$31 July cutoff amounted$t$);
SELECT pg_temp.swap(5079, $t$investment and civil-service employment$t$, $t$investment and civil service employment$t$);
SELECT pg_temp.swap(5079, $t$that sex-based rights$t$, $t$that sex based rights$t$);
SELECT pg_temp.swap(5079, $t$the gender-critical side$t$, $t$the gender critical side$t$);
SELECT pg_temp.swap(5079, $t$as a public-order and national-security concern$t$, $t$as a public order and national security concern$t$);
SELECT pg_temp.swap(5079, $t$in low-paid employment$t$, $t$in low paid employment$t$);
SELECT pg_temp.swap(5079, $t$defence work and civil-service jobs$t$, $t$defence work and civil service jobs$t$);
SELECT pg_temp.swap(5079, $t$By the cut-off, these$t$, $t$By the cutoff, these$t$);
SELECT pg_temp.swap(5079, $t$The China-espionage investigation$t$, $t$The China espionage investigation$t$);
SELECT pg_temp.swap(5079, $t$create a national-security controversy$t$, $t$create a national security controversy$t$);
SELECT pg_temp.swap(5079, $t$and independent-minded backbencher$t$, $t$and independent minded backbencher$t$);
-- member 5080
SELECT pg_temp.swap(5080, $t$a proposed 50-50 partnership$t$, $t$a proposed 50/50 partnership$t$);
SELECT pg_temp.swap(5080, $t$school-based nurseries$t$, $t$school based nurseries$t$);
SELECT pg_temp.swap(5080, $t$him as the decision-maker$t$, $t$him as the decision maker$t$);
SELECT pg_temp.swap(5080, $t$departmental national-security decision$t$, $t$departmental national security decision$t$);
SELECT pg_temp.swap(5080, $t$nine battery-hybrid trains$t$, $t$nine battery hybrid trains$t$);
SELECT pg_temp.swap(5080, $t$the factory's long-term position$t$, $t$the factory's long term position$t$);
SELECT pg_temp.swap(5080, $t$spreading high-quality jobs$t$, $t$spreading high quality jobs$t$);
-- member 5081
SELECT pg_temp.swap(5081, $t$poor local-election results$t$, $t$poor local election results$t$);
SELECT pg_temp.swap(5081, $t$government’s land-use framework$t$, $t$government’s land use framework$t$);
SELECT pg_temp.swap(5081, $t$continuing select-committee position$t$, $t$continuing select committee position$t$);
-- member 5082
SELECT pg_temp.swap(5082, $t$his brother-in-law Gregor$t$, $t$his brother in law Gregor$t$);
SELECT pg_temp.swap(5082, $t$after one-third of their term$t$, $t$after one third of their term$t$);
SELECT pg_temp.swap(5082, $t$offence-level details$t$, $t$offence level details$t$);
SELECT pg_temp.swap(5082, $t$serious and evidence-based$t$, $t$serious and evidence based$t$);
SELECT pg_temp.swap(5082, $t$the assessment cut-off$t$, $t$the assessment cutoff$t$);
SELECT pg_temp.swap(5082, $t$Palestine Action-linked remand$t$, $t$Palestine Action linked remand$t$);
-- member 5092
SELECT pg_temp.swap(5092, $t$heavy local-election defeats$t$, $t$heavy local election defeats$t$);
SELECT pg_temp.swap(5092, $t$the Makerfield by-election$t$, $t$the Makerfield byelection$t$);
SELECT pg_temp.swap(5092, $t$That was a well-timed political$t$, $t$That was a well timed political$t$);
SELECT pg_temp.swap(5092, $t$rooted in Labour-run local government$t$, $t$rooted in Labour run local government$t$);
SELECT pg_temp.swap(5092, $t$stability of the social-work workforce$t$, $t$stability of the social work workforce$t$);
SELECT pg_temp.swap(5092, $t$entered a 20-year partnership$t$, $t$entered a 20 year partnership$t$);
SELECT pg_temp.swap(5092, $t$opened, a full-fibre network$t$, $t$opened, a full fibre network$t$);
SELECT pg_temp.swap(5092, $t$weak mental-health pathways$t$, $t$weak mental health pathways$t$);
-- member 5093
SELECT pg_temp.swap(5093, $t$attacked the decades-long timescale$t$, $t$attacked the decades long timescale$t$);
SELECT pg_temp.swap(5093, $t$consistent unionist, pro-infrastructure case$t$, $t$consistent unionist, pro infrastructure case$t$);
-- member 5095
SELECT pg_temp.swap(5095, $t$original disability-benefit reforms$t$, $t$original disability benefit reforms$t$);
SELECT pg_temp.swap(5095, $t$technology-enabled sexual abuse$t$, $t$technology enabled sexual abuse$t$);
SELECT pg_temp.swap(5095, $t$concerns intimate-image abuse$t$, $t$concerns intimate image abuse$t$);
SELECT pg_temp.swap(5095, $t$created a day-one right$t$, $t$created a day one right$t$);
SELECT pg_temp.swap(5095, $t$six weeks of well-paid leave$t$, $t$six weeks of well paid leave$t$);
SELECT pg_temp.swap(5095, $t$s-health funding$t$, $t$s health funding$t$);
SELECT pg_temp.swap(5095, $t$an elective-care centre$t$, $t$an elective care centre$t$);
SELECT pg_temp.swap(5095, $t$maternity-unit work$t$, $t$maternity unit work$t$);
SELECT pg_temp.swap(5095, $t$work on image-based abuse$t$, $t$work on image based abuse$t$);
SELECT pg_temp.swap(5095, $t$useful first-term MP$t$, $t$useful first term MP$t$);
SELECT pg_temp.swap(5095, $t$abolition of the two-child benefit limit$t$, $t$abolition of the two child benefit limit$t$);
SELECT pg_temp.swap(5095, $t$abolition of the two-child limit personally$t$, $t$abolition of the two child limit personally$t$);
-- member 5098
SELECT pg_temp.swap(5098, $t$In 2018-19, while$t$, $t$In 2018/19, while$t$);
SELECT pg_temp.swap(5098, $t$In 2019-20, 85 per cent$t$, $t$In 2019/20, 85 per cent$t$);
SELECT pg_temp.swap(5098, $t$free post-16 SEND transport$t$, $t$free post 16 SEND transport$t$);
SELECT pg_temp.swap(5098, $t$not the decision-maker$t$, $t$not the decision maker$t$);
SELECT pg_temp.swap(5098, $t$to be co-produced with$t$, $t$to be coproduced with$t$);
SELECT pg_temp.swap(5098, $t$co-chaired by disabled representatives$t$, $t$with disabled representatives as joint chairs$t$);
SELECT pg_temp.swap(5098, $t$severe-condition criteria$t$, $t$severe condition criteria$t$);
SELECT pg_temp.swap(5098, $t$the assisted-dying bill$t$, $t$the assisted dying bill$t$);
-- member 5099
SELECT pg_temp.swap(5099, $t$failed smart-meter appointments$t$, $t$failed smart meter appointments$t$);
SELECT pg_temp.swap(5099, $t$commissions and mis-selling$t$, $t$commissions and misselling$t$);
SELECT pg_temp.swap(5099, $t$wider home-upgrade programme and plans to tighten energy-efficiency standards$t$, $t$wider home upgrade programme and plans to tighten energy efficiency standards$t$);
SELECT pg_temp.swap(5099, $t$statutory fuel-poverty target$t$, $t$statutory fuel poverty target$t$);
SELECT pg_temp.swap(5099, $t$influence over long-term spending$t$, $t$influence over long term spending$t$);
SELECT pg_temp.swap(5099, $t$entire clean-energy programme$t$, $t$entire clean energy programme$t$);
SELECT pg_temp.swap(5099, $t$opposed new fossil-fuel developments$t$, $t$opposed new fossil fuel developments$t$);
SELECT pg_temp.swap(5099, $t$The public-interest question$t$, $t$The public interest question$t$);
-- member 5101
SELECT pg_temp.swap(5101, $t$under the UK-EU Withdrawal Agreement to$t$, $t$under the Withdrawal Agreement between the UK and the EU to$t$);
SELECT pg_temp.swap(5101, $t$in a public-facing policy brief$t$, $t$in a public facing policy brief$t$);
-- member 5104
SELECT pg_temp.swap(5104, $t$into a purpose-built school$t$, $t$into a purpose built school$t$);
SELECT pg_temp.swap(5104, $t$design and business-case work$t$, $t$design and business case work$t$);
SELECT pg_temp.swap(5104, $t$ambitious school-building decision$t$, $t$ambitious school building decision$t$);
-- member 5105
SELECT pg_temp.swap(5105, $t$poor local-election results$t$, $t$poor local election results$t$);
SELECT pg_temp.swap(5105, $t$with post-industrial communities$t$, $t$with postindustrial communities$t$);
SELECT pg_temp.swap(5105, $t$to lower- and middle-income pensioners$t$, $t$to lower and middle income pensioners$t$);
SELECT pg_temp.swap(5105, $t$mandatory digital right-to-work identification$t$, $t$mandatory digital right to work identification$t$);
SELECT pg_temp.swap(5105, $t$general digital-ID scheme$t$, $t$general digital ID scheme$t$);
SELECT pg_temp.swap(5105, $t$disability-benefit reform$t$, $t$disability benefit reform$t$);
SELECT pg_temp.swap(5105, $t$and the local-election defeat$t$, $t$and the local election defeat$t$);
SELECT pg_temp.swap(5105, $t$to grooming-gang abuse$t$, $t$to grooming gang abuse$t$);
SELECT pg_temp.swap(5105, $t$31 July 2026 cut-off.$t$, $t$31 July 2026 cutoff.$t$);
SELECT pg_temp.swap(5105, $t$in working-class constituencies$t$, $t$in working class constituencies$t$);
SELECT pg_temp.swap(5105, $t$a first-term backbench$t$, $t$a first term backbench$t$);
SELECT pg_temp.swap(5105, $t$the grooming-gangs inquiry or digital right-to-work checks$t$, $t$the grooming gangs inquiry or digital right to work checks$t$);
SELECT pg_temp.swap(5105, $t$mandatory digital-ID system$t$, $t$mandatory digital ID system$t$);
-- member 5106
SELECT pg_temp.swap(5106, $t$anti-LGBT literature$t$, $t$anti LGBT literature$t$);
SELECT pg_temp.swap(5106, $t$a mini-Pride within$t$, $t$a mini Pride within$t$);
SELECT pg_temp.swap(5106, $t$a year-round support programme$t$, $t$an all year round support programme$t$);
SELECT pg_temp.swap(5106, $t$vacant health-department parliamentary$t$, $t$vacant health department parliamentary$t$);
SELECT pg_temp.swap(5106, $t$stronger hate-crime protection and pressed for a trans-inclusive ban$t$, $t$stronger hate crime protection and pressed for a trans inclusive ban$t$);
SELECT pg_temp.swap(5106, $t$campaigned for a trans-inclusive ban$t$, $t$campaigned for a trans inclusive ban$t$);
SELECT pg_temp.swap(5106, $t$awaiting pre-legislative scrutiny$t$, $t$awaiting prelegislative scrutiny$t$);
SELECT pg_temp.swap(5106, $t$Labour public-service politics$t$, $t$Labour public service politics$t$);
SELECT pg_temp.swap(5106, $t$emergency-department extension$t$, $t$emergency department extension$t$);
SELECT pg_temp.swap(5106, $t$successful self-promotion$t$, $t$successful self promotion$t$);
SELECT pg_temp.swap(5106, $t$measurable public-service improvement$t$, $t$measurable public service improvement$t$);
-- member 5107
SELECT pg_temp.swap(5107, $t$in a three-way contest$t$, $t$in a three way contest$t$);
SELECT pg_temp.swap(5107, $t$legal and justice-related:$t$, $t$legal and justice related:$t$);
SELECT pg_temp.swap(5107, $t$notes non-monetary alphabet$t$, $t$notes nonmonetary alphabet$t$);
SELECT pg_temp.swap(5107, $t$government, cross-party, FA$t$, $t$government, cross party, FA$t$);
SELECT pg_temp.swap(5107, $t$a government-sponsored private$t$, $t$a government sponsored private$t$);
SELECT pg_temp.swap(5107, $t$the football-entry Act$t$, $t$the football entry Act$t$);
SELECT pg_temp.swap(5107, $t$detail, public-safety legislation$t$, $t$detail, public safety legislation$t$);
SELECT pg_temp.swap(5107, $t$capable legal-policy backbencher$t$, $t$capable legal policy backbencher$t$);
SELECT pg_temp.swap(5107, $t$a still-developing record$t$, $t$a still developing record$t$);
-- member 5108
SELECT pg_temp.swap(5108, $t$he co-founded African Dreams$t$, $t$he was a founder of African Dreams$t$);
-- member 5109
SELECT pg_temp.swap(5109, $t$spare adrenaline auto-injectors$t$, $t$spare adrenaline autoinjectors$t$);
SELECT pg_temp.swap(5109, $t$publish allergy-safety policies$t$, $t$publish allergy safety policies$t$);
SELECT pg_temp.swap(5109, $t$build cross-party support$t$, $t$build cross party support$t$);
SELECT pg_temp.swap(5109, $t$measured by the cut-off date$t$, $t$measured by the cutoff date$t$);
-- member 5110
SELECT pg_temp.swap(5110, $t$grant and government-backed loan$t$, $t$grant and government backed loan$t$);
SELECT pg_temp.swap(5110, $t$subsidies for zero-emission buses$t$, $t$subsidies for zero emission buses$t$);
SELECT pg_temp.swap(5110, $t$Labour's disability-benefit legislation$t$, $t$Labour's disability benefit legislation$t$);
SELECT pg_temp.swap(5110, $t$The ethylene-plant rescue$t$, $t$The ethylene plant rescue$t$);
SELECT pg_temp.swap(5110, $t$his bus-manufacturing campaign$t$, $t$his bus manufacturing campaign$t$);
-- member 5112
SELECT pg_temp.swap(5112, $t$moderate and right-wing members$t$, $t$moderate and right wing members$t$);
SELECT pg_temp.swap(5112, $t$Atlanticist and anti-Corbynite right$t$, $t$Atlanticist and anti Corbynite right$t$);
SELECT pg_temp.swap(5112, $t$he favours public-service investment$t$, $t$he favours public service investment$t$);
SELECT pg_temp.swap(5112, $t$His defining foreign-policy commitment$t$, $t$His defining foreign policy commitment$t$);
SELECT pg_temp.swap(5112, $t$restoration of UK-Israel free-trade negotiations$t$, $t$restoration of UK and Israel free trade negotiations$t$);
SELECT pg_temp.swap(5112, $t$proposed disability-benefit changes$t$, $t$proposed disability benefit changes$t$);
SELECT pg_temp.swap(5112, $t$occupation, fire-service funding$t$, $t$occupation, fire service funding$t$);
SELECT pg_temp.swap(5112, $t$less extensive social-media activity$t$, $t$less extensive social media activity$t$);
SELECT pg_temp.swap(5112, $t$constituency representative—particularly on$t$, $t$constituency representative, particularly on$t$);
SELECT pg_temp.swap(5112, $t$a valuable long-term funding$t$, $t$a valuable long term funding$t$);
-- member 5113
SELECT pg_temp.swap(5113, $t$in a three-way contest$t$, $t$in a three way contest$t$);
SELECT pg_temp.swap(5113, $t$a lower health-related Universal$t$, $t$a lower health related Universal$t$);
SELECT pg_temp.swap(5113, $t$signed a technology-development contract$t$, $t$signed a technology development contract$t$);
SELECT pg_temp.swap(5113, $t$delivered by the cut-off date.$t$, $t$delivered by the cutoff date.$t$);
-- member 5114
SELECT pg_temp.swap(5114, $t$social-democratic tradition$t$, $t$social democratic tradition$t$);
SELECT pg_temp.swap(5114, $t$pro-Union case$t$, $t$pro Union case$t$);
SELECT pg_temp.swap(5114, $t$civil society, co-operative organisation$t$, $t$civil society, cooperative organisation$t$);
SELECT pg_temp.swap(5114, $t$economic-development money$t$, $t$economic development money$t$);
SELECT pg_temp.swap(5114, $t$household-income data$t$, $t$household income data$t$);
SELECT pg_temp.swap(5114, $t$voluntary-sector programmes$t$, $t$voluntary sector programmes$t$);
SELECT pg_temp.swap(5114, $t$from 2026-27$t$, $t$from 2026/27$t$);
SELECT pg_temp.swap(5114, $t$three-year programme$t$, $t$three year programme$t$);
SELECT pg_temp.swap(5114, $t$first-year order$t$, $t$first year order$t$);
SELECT pg_temp.swap(5114, $t$A UK Export Finance-backed deal$t$, $t$A deal backed by UK Export Finance$t$);
SELECT pg_temp.swap(5114, $t$31 Scottish-built fire engines$t$, $t$31 Scottish built fire engines$t$);
SELECT pg_temp.swap(5114, $t$towards a Scotland-France ferry link$t$, $t$towards a ferry link between Scotland and France$t$);
SELECT pg_temp.swap(5114, $t$creative-technology sector$t$, $t$creative technology sector$t$);
SELECT pg_temp.swap(5114, $t$by 2027-28$t$, $t$by 2027/28$t$);
SELECT pg_temp.swap(5114, $t$day-to-day implementation$t$, $t$day to day implementation$t$);
SELECT pg_temp.swap(5114, $t$well-connected$t$, $t$well connected$t$);
-- member 5115
SELECT pg_temp.swap(5115, $t$rapid for a first-term MP$t$, $t$rapid for a first term MP$t$);
SELECT pg_temp.swap(5115, $t$a negotiated two-state settlement$t$, $t$a negotiated two state settlement$t$);
SELECT pg_temp.swap(5115, $t$committed to a two-state solution$t$, $t$committed to a two state solution$t$);
SELECT pg_temp.swap(5115, $t$and civil-society peacebuilding$t$, $t$and civil society peacebuilding$t$);
SELECT pg_temp.swap(5115, $t$supporting Israeli-Palestinian peace projects$t$, $t$supporting Israeli and Palestinian peace projects$t$);
SELECT pg_temp.swap(5115, $t$His select-committee work also$t$, $t$His select committee work also$t$);
SELECT pg_temp.swap(5115, $t$from select-committee work and$t$, $t$from select committee work and$t$);
-- member 5116
SELECT pg_temp.swap(5116, $t$production, state-backed industrial$t$, $t$production, state backed industrial$t$);
SELECT pg_temp.swap(5116, $t$towards lower-carbon manufacturing$t$, $t$towards lower carbon manufacturing$t$);
SELECT pg_temp.swap(5116, $t$neither free-market nor simply pro-spending$t$, $t$neither free market nor simply pro spending$t$);
SELECT pg_temp.swap(5116, $t$new steel-import protections$t$, $t$new steel import protections$t$);
SELECT pg_temp.swap(5116, $t$2026, tariff-free quotas$t$, $t$2026, tariff free quotas$t$);
SELECT pg_temp.swap(5116, $t$By mid-May 2026$t$, $t$By mid May 2026$t$);
SELECT pg_temp.swap(5116, $t$critical-minerals funding$t$, $t$critical minerals funding$t$);
-- member 5117
SELECT pg_temp.swap(5117, $t$October 2024 by-election$t$, $t$October 2024 byelection$t$);
-- member 5118
SELECT pg_temp.swap(5118, $t$giving a first-term backbencher$t$, $t$giving a first term backbencher$t$);
SELECT pg_temp.swap(5118, $t$He worked with pro-business and pro-development MPs, then allied with soft-left critics$t$, $t$He worked with pro business and pro development MPs, then allied with soft left critics$t$);
SELECT pg_temp.swap(5118, $t$headroom by 2029-30.$t$, $t$headroom by 2029/30.$t$);
-- member 5119
SELECT pg_temp.swap(5119, $t$then re-elected in 2022$t$, $t$then elected again in 2022$t$);
SELECT pg_temp.swap(5119, $t$an executive-level council role$t$, $t$an executive level council role$t$);
SELECT pg_temp.swap(5119, $t$her 13-year Channel 4 career$t$, $t$her 13 year Channel 4 career$t$);
SELECT pg_temp.swap(5119, $t$in a four-way fight$t$, $t$in a four way fight$t$);
-- member 5121
SELECT pg_temp.swap(5121, $t$20 per cent inheritance-tax rate$t$, $t$20 per cent inheritance tax rate$t$);
SELECT pg_temp.swap(5121, $t$estates in 2026–27 from$t$, $t$estates in 2026/27 from$t$);
SELECT pg_temp.swap(5121, $t$other low-carbon industries$t$, $t$other low carbon industries$t$);
SELECT pg_temp.swap(5121, $t$workers from carbon-intensive industries$t$, $t$workers from carbon intensive industries$t$);
-- member 5123
SELECT pg_temp.swap(5123, $t$a blank-sheet first-termer$t$, $t$a blank sheet first termer$t$);
SELECT pg_temp.swap(5123, $t$more pre-parliamentary institutional$t$, $t$more pre parliamentary institutional$t$);
-- member 5124
SELECT pg_temp.swap(5124, $t$public-service investment$t$, $t$public service investment$t$);
SELECT pg_temp.swap(5124, $t$inheritance-tax proposals$t$, $t$inheritance tax proposals$t$);
SELECT pg_temp.swap(5124, $t$change agricultural-property relief$t$, $t$change agricultural property relief$t$);
SELECT pg_temp.swap(5124, $t$reduced inheritance-tax rate$t$, $t$reduced inheritance tax rate$t$);
SELECT pg_temp.swap(5124, $t$business-property relief$t$, $t$business property relief$t$);
SELECT pg_temp.swap(5124, $t$land-rich but cash-poor$t$, $t$land rich but cash poor$t$);
SELECT pg_temp.swap(5124, $t$oppose the farm-tax proposal$t$, $t$oppose the farm tax proposal$t$);
SELECT pg_temp.swap(5124, $t$explanation—"I said that is what I would do. I keep my word"—was$t$, $t$explanation, "I said that is what I would do. I keep my word", was$t$);
SELECT pg_temp.swap(5124, $t$severe local-election losses$t$, $t$severe local election losses$t$);
SELECT pg_temp.swap(5124, $t$opposing the farm-tax measure$t$, $t$opposing the farm tax measure$t$);
SELECT pg_temp.swap(5124, $t$his local-government and construction$t$, $t$his local government and construction$t$);
-- member 5126
SELECT pg_temp.swap(5126, $t$the long-serving Conservative MP$t$, $t$the long serving Conservative MP$t$);
SELECT pg_temp.swap(5126, $t$demands for a five-year halt$t$, $t$demands for a five year halt$t$);
SELECT pg_temp.swap(5126, $t$The living-wage decision$t$, $t$The living wage decision$t$);
SELECT pg_temp.swap(5126, $t$floor for city-council staff$t$, $t$floor for city council staff$t$);
SELECT pg_temp.swap(5126, $t$determined by the cut-off date$t$, $t$determined by the cutoff date$t$);
SELECT pg_temp.swap(5126, $t$build cross-party campaigns$t$, $t$build cross party campaigns$t$);
SELECT pg_temp.swap(5126, $t$campaigner and coalition-builder$t$, $t$campaigner and coalition builder$t$);
-- member 5127
SELECT pg_temp.swap(5127, $t$benefits of a UK-EU customs agreement$t$, $t$benefits of a customs agreement between the UK and the EU$t$);
SELECT pg_temp.swap(5127, $t$Labour’s pro-growth and$t$, $t$Labour’s pro growth and$t$);
SELECT pg_temp.swap(5127, $t$identified by the cut-off. The debate$t$, $t$identified by the cutoff. The debate$t$);
SELECT pg_temp.swap(5127, $t$hospital’s ten-year plan$t$, $t$hospital’s ten year plan$t$);
SELECT pg_temp.swap(5127, $t$a new urgent-care facility$t$, $t$a new urgent care facility$t$);
SELECT pg_temp.swap(5127, $t$identified by the cut-off. His register$t$, $t$identified by the cutoff. His register$t$);
-- member 5128
SELECT pg_temp.swap(5128, $t$for Baguley ward (2023-2024)$t$, $t$for Baguley ward (2023 to 2024)$t$);
-- member 5129
SELECT pg_temp.swap(5129, $t$His pre-parliamentary career combined$t$, $t$His career before Parliament combined$t$);
SELECT pg_temp.swap(5129, $t$policy-oriented tradition$t$, $t$policy oriented tradition$t$);
SELECT pg_temp.swap(5129, $t$home-energy efficiency$t$, $t$home energy efficiency$t$);
SELECT pg_temp.swap(5129, $t$direct energy-bill support$t$, $t$direct energy bill support$t$);
SELECT pg_temp.swap(5129, $t$made low-energy users$t$, $t$made low energy users$t$);
SELECT pg_temp.swap(5129, $t$wider cost-of-living programme$t$, $t$wider cost of living programme$t$);
SELECT pg_temp.swap(5129, $t$low-carbon heating$t$, $t$low carbon heating$t$);
SELECT pg_temp.swap(5129, $t$long-term order book$t$, $t$long term order book$t$);
SELECT pg_temp.swap(5129, $t$Fuel-poverty campaigners$t$, $t$Fuel poverty campaigners$t$);
SELECT pg_temp.swap(5129, $t$far above pre-crisis levels$t$, $t$far above levels before the crisis$t$);
SELECT pg_temp.swap(5129, $t$clean-power strategy$t$, $t$clean power strategy$t$);
SELECT pg_temp.swap(5129, $t$decisions made by the SNP-led Scottish Government$t$, $t$decisions made by the Scottish Government led by the SNP$t$);
-- member 5130
SELECT pg_temp.swap(5130, $t$the resulting by-election could$t$, $t$the resulting byelection could$t$);
SELECT pg_temp.swap(5130, $t$supplied during 2025-26$t$, $t$supplied during 2025/26$t$);
SELECT pg_temp.swap(5130, $t$a council-designed regeneration$t$, $t$a council designed regeneration$t$);
SELECT pg_temp.swap(5130, $t$Liberal Democrat-run council$t$, $t$Liberal Democrat run council$t$);
SELECT pg_temp.swap(5130, $t$amending the controlled-drugs schedule$t$, $t$amending the controlled drugs schedule$t$);
SELECT pg_temp.swap(5130, $t$a three-way marginal seat$t$, $t$a three way marginal seat$t$);
SELECT pg_temp.swap(5130, $t$disciplined first-term constituency MP$t$, $t$disciplined first term constituency MP$t$);
SELECT pg_temp.swap(5130, $t$national policy-maker$t$, $t$national policymaker$t$);
-- member 5131
SELECT pg_temp.swap(5131, $t$represents a pro-growth, institutionally$t$, $t$represents a pro growth, institutionally$t$);
SELECT pg_temp.swap(5131, $t$presenting town-centre regeneration$t$, $t$presenting town centre regeneration$t$);
SELECT pg_temp.swap(5131, $t$most consistent public-service concern$t$, $t$most consistent public service concern$t$);
SELECT pg_temp.swap(5131, $t$He is strongly pro-nuclear$t$, $t$He is strongly pro nuclear$t$);
SELECT pg_temp.swap(5131, $t$either side of a free-vote argument$t$, $t$either side of a free vote argument$t$);
SELECT pg_temp.swap(5131, $t$a huge, government-backed infrastructure$t$, $t$a huge, government backed infrastructure$t$);
SELECT pg_temp.swap(5131, $t$through resident-led boards$t$, $t$through boards led by residents$t$);
SELECT pg_temp.swap(5131, $t$evidence of alliance-building$t$, $t$evidence of alliance building$t$);
-- member 5132
SELECT pg_temp.swap(5132, $t$in a new south-east London constituency$t$, $t$in a new south east London constituency$t$);
SELECT pg_temp.swap(5132, $t$disability rights, Irish-community issues$t$, $t$disability rights, Irish community issues$t$);
SELECT pg_temp.swap(5132, $t$to stop UK-based survivors$t$, $t$to stop UK based survivors$t$);
SELECT pg_temp.swap(5132, $t$homes losing means-tested benefits$t$, $t$homes losing means tested benefits$t$);
SELECT pg_temp.swap(5132, $t$disregarded for means-tested benefits$t$, $t$disregarded for means tested benefits$t$);
SELECT pg_temp.swap(5132, $t$his longer-term profile$t$, $t$his longer term profile$t$);
SELECT pg_temp.swap(5132, $t$a loyal party-management figure$t$, $t$a loyal party management figure$t$);
-- member 5133
SELECT pg_temp.swap(5133, $t$is a first-term Labour$t$, $t$is a first term Labour$t$);
SELECT pg_temp.swap(5133, $t$of an equality-focused Labour$t$, $t$of an equality focused Labour$t$);
SELECT pg_temp.swap(5133, $t$Norwich's NHS walk-in centre$t$, $t$Norwich's NHS walk in centre$t$);
SELECT pg_temp.swap(5133, $t$places for 2027–28.$t$, $t$places for 2027/28.$t$);
SELECT pg_temp.swap(5133, $t$a defensible cross-party success$t$, $t$a defensible cross party success$t$);
SELECT pg_temp.swap(5133, $t$qualified by the cut-off date$t$, $t$qualified by the cutoff date$t$);
SELECT pg_temp.swap(5133, $t$and community-needs formula$t$, $t$and community needs formula$t$);
SELECT pg_temp.swap(5133, $t$sustain cross-party pressure$t$, $t$sustain cross party pressure$t$);
SELECT pg_temp.swap(5133, $t$The walk-in centre and dental-school allocation$t$, $t$The walk in centre and dental school allocation$t$);
-- member 5134
SELECT pg_temp.swap(5134, $t$attention to post-industrial towns$t$, $t$attention to postindustrial towns$t$);
SELECT pg_temp.swap(5134, $t$governments into short-term tax$t$, $t$governments into short term tax$t$);
SELECT pg_temp.swap(5134, $t$The five-year scheme$t$, $t$The five year scheme$t$);
SELECT pg_temp.swap(5134, $t$published its road-safety strategy$t$, $t$published its road safety strategy$t$);
SELECT pg_temp.swap(5134, $t$The proposed Rossendale-to-Manchester rail$t$, $t$The proposed Rossendale to Manchester rail$t$);
SELECT pg_temp.swap(5134, $t$construction funding by mid-2026$t$, $t$construction funding by mid 2026$t$);
-- member 5136
SELECT pg_temp.swap(5136, $t$Labour’s Starmer-era mainstream$t$, $t$Labour’s Starmer era mainstream$t$);
SELECT pg_temp.swap(5136, $t$support town-centre renewal$t$, $t$support town centre renewal$t$);
SELECT pg_temp.swap(5136, $t$and social-infrastructure data$t$, $t$and social infrastructure data$t$);
-- member 5137
SELECT pg_temp.swap(5137, $t$receiving means-tested benefits$t$, $t$receiving means tested benefits$t$);
SELECT pg_temp.swap(5137, $t$government's disability-benefit legislation$t$, $t$government's disability benefit legislation$t$);
SELECT pg_temp.swap(5137, $t$a constituency-minded objection$t$, $t$a constituency minded objection$t$);
SELECT pg_temp.swap(5137, $t$Leadbeater's assisted-dying bill$t$, $t$Leadbeater's assisted dying bill$t$);
SELECT pg_temp.swap(5137, $t$Parliament by the cut-off date$t$, $t$Parliament by the cutoff date$t$);
SELECT pg_temp.swap(5137, $t$record as a policy-maker$t$, $t$record as a policymaker$t$);
SELECT pg_temp.swap(5137, $t$calling for the two-child benefit limit to be abolished$t$, $t$calling for the two child benefit limit to be abolished$t$);
-- member 5139
SELECT pg_temp.swap(5139, $t$won a council by-election$t$, $t$won a council byelection$t$);
SELECT pg_temp.swap(5139, $t$placed in bed-and-breakfast accommodation. Eighteen energy-efficient$t$, $t$placed in bed and breakfast accommodation. Eighteen energy efficient$t$);
SELECT pg_temp.swap(5139, $t$The council opened year-round emergency accommodation for rough sleepers at Milton Keynes' former bus station.$t$, $t$The council opened emergency accommodation for rough sleepers, open all year round, at Milton Keynes' former bus station.$t$);
SELECT pg_temp.swap(5139, $t$labels on AI-generated election$t$, $t$labels on AI generated election$t$);
SELECT pg_temp.swap(5139, $t$is practical centre-left municipalism$t$, $t$is practical centre left municipalism$t$);
SELECT pg_temp.swap(5139, $t$than that of many first-term backbenchers$t$, $t$than that of many first term backbenchers$t$);
SELECT pg_temp.swap(5139, $t$built, a rough-sleeping service$t$, $t$built, a rough sleeping service$t$);
-- member 5141
SELECT pg_temp.swap(5141, $t$closed-list system$t$, $t$closed list system$t$);
SELECT pg_temp.swap(5141, $t$European co-operation$t$, $t$European cooperation$t$);
SELECT pg_temp.swap(5141, $t$Her animal-welfare work$t$, $t$Her animal welfare work$t$);
SELECT pg_temp.swap(5141, $t$an eight-million-signature petition$t$, $t$an eight million signature petition$t$);
SELECT pg_temp.swap(5141, $t$British print-on-demand books$t$, $t$British print on demand books$t$);
SELECT pg_temp.swap(5141, $t$Her cruelty-free Commons$t$, $t$Her cruelty free Commons$t$);
SELECT pg_temp.swap(5141, $t$not confirmed as cruelty-free$t$, $t$not confirmed as cruelty free$t$);
SELECT pg_temp.swap(5141, $t$substantial cross-party investigation$t$, $t$substantial cross party investigation$t$);
SELECT pg_temp.swap(5141, $t$longer-term funding$t$, $t$longer term funding$t$);
SELECT pg_temp.swap(5141, $t$for under-22s$t$, $t$for under 22s$t$);
SELECT pg_temp.swap(5141, $t$the spending-review period$t$, $t$the spending review period$t$);
SELECT pg_temp.swap(5141, $t$energy and road-safety benefits$t$, $t$energy and road safety benefits$t$);
SELECT pg_temp.swap(5141, $t$with the pro-Starmer Labour$t$, $t$with the pro Starmer Labour$t$);
SELECT pg_temp.swap(5141, $t$signed the counter-letter$t$, $t$signed the counter letter$t$);
-- member 5142
SELECT pg_temp.swap(5142, $t$much better-known Eddie Izzard$t$, $t$much better known Eddie Izzard$t$);
SELECT pg_temp.swap(5142, $t$Starmer's disability-benefit reforms$t$, $t$Starmer's disability benefit reforms$t$);
SELECT pg_temp.swap(5142, $t$civil-libertarian side$t$, $t$civil libertarian side$t$);
SELECT pg_temp.swap(5142, $t$foreign-policy cause$t$, $t$foreign policy cause$t$);
SELECT pg_temp.swap(5142, $t$70 cross-party MPs$t$, $t$70 cross party MPs$t$);
SELECT pg_temp.swap(5142, $t$by the cut-off date$t$, $t$by the cutoff date$t$);
SELECT pg_temp.swap(5142, $t$spread anti-Israel hatred$t$, $t$spread anti Israel hatred$t$);
SELECT pg_temp.swap(5142, $t$contentious disability-benefit proposal$t$, $t$contentious disability benefit proposal$t$);
SELECT pg_temp.swap(5142, $t$pressure, coalition-building and$t$, $t$pressure, coalition building and$t$);
-- member 5143
SELECT pg_temp.swap(5143, $t$the new misleading-the-public and misconduct$t$, $t$the new misleading the public and misconduct$t$);
SELECT pg_temp.swap(5143, $t$enabled non-means-tested legal aid$t$, $t$enabled non means tested legal aid$t$);
SELECT pg_temp.swap(5143, $t$an updated guest-safety protocol$t$, $t$an updated guest safety protocol$t$);
SELECT pg_temp.swap(5143, $t$The accompanying victim-support commitments$t$, $t$The accompanying victim support commitments$t$);
-- member 5144
SELECT pg_temp.swap(5144, $t$first non-Conservative on the Island$t$, $t$first non Conservative on the Island$t$);
SELECT pg_temp.swap(5144, $t$a chip-shop owner$t$, $t$a chip shop owner$t$);
-- member 5145
SELECT pg_temp.swap(5145, $t$Labour fell to a record-low 17 seats$t$, $t$Labour fell to a record low 17 seats$t$);
SELECT pg_temp.swap(5145, $t$moved towards human-based research methods, including organ-on-chip technology$t$, $t$moved towards human based research methods, including organ on chip technology$t$);
SELECT pg_temp.swap(5145, $t$recorded as forced-swim tests$t$, $t$recorded as forced swim tests$t$);
SELECT pg_temp.swap(5145, $t$a focused animal-welfare campaigner$t$, $t$a focused animal welfare campaigner$t$);
-- member 5147
SELECT pg_temp.swap(5147, $t$higher-education policy$t$, $t$higher education policy$t$);
SELECT pg_temp.swap(5147, $t$child-poverty strategy$t$, $t$child poverty strategy$t$);
SELECT pg_temp.swap(5147, $t$council-wide programmes$t$, $t$council wide programmes$t$);
SELECT pg_temp.swap(5147, $t$low-carbon industry$t$, $t$low carbon industry$t$);
SELECT pg_temp.swap(5147, $t$As co-chair of the All-Party$t$, $t$As joint chair of the All-Party$t$);
SELECT pg_temp.swap(5147, $t$stronger trade-union rights$t$, $t$stronger trade union rights$t$);
SELECT pg_temp.swap(5147, $t$Tees Valley-wide structure$t$, $t$Tees Valley wide structure$t$);
SELECT pg_temp.swap(5147, $t$disability-benefit reductions$t$, $t$disability benefit reductions$t$);
SELECT pg_temp.swap(5147, $t$substantially pre-dated$t$, $t$substantially predated$t$);
SELECT pg_temp.swap(5147, $t$social-value requirements$t$, $t$social value requirements$t$);
SELECT pg_temp.swap(5147, $t$select-committee position$t$, $t$select committee position$t$);
SELECT pg_temp.swap(5147, $t$carbon-capture chairmanship$t$, $t$carbon capture chairmanship$t$);
SELECT pg_temp.swap(5147, $t$centre and soft-left network$t$, $t$centre and soft left network$t$);
SELECT pg_temp.swap(5147, $t$many first-term MPs$t$, $t$many first term MPs$t$);
SELECT pg_temp.swap(5147, $t$political risk-taking$t$, $t$political risk taking$t$);
SELECT pg_temp.swap(5147, $t$his long-term reputation$t$, $t$his long term reputation$t$);
-- member 5149
SELECT pg_temp.swap(5149, $t$quick for a first-term MP$t$, $t$quick for a first term MP$t$);
SELECT pg_temp.swap(5149, $t$junior government-support position$t$, $t$junior government support position$t$);
SELECT pg_temp.swap(5149, $t$reducing long-term benefit$t$, $t$reducing long term benefit$t$);
SELECT pg_temp.swap(5149, $t$must be evidence-based and$t$, $t$must be evidence based and$t$);
SELECT pg_temp.swap(5149, $t$its proposed disability-benefit changes$t$, $t$its proposed disability benefit changes$t$);
SELECT pg_temp.swap(5149, $t$a gap in face-to-face services$t$, $t$a gap in face to face services$t$);
SELECT pg_temp.swap(5149, $t$further business-case development$t$, $t$further business case development$t$);
SELECT pg_temp.swap(5149, $t$major policy-maker.$t$, $t$major policymaker.$t$);
-- member 5151
SELECT pg_temp.swap(5151, $t$for sector-specific assistance$t$, $t$for sector specific assistance$t$);
SELECT pg_temp.swap(5151, $t$A council-commissioned ceramics$t$, $t$A council commissioned ceramics$t$);
SELECT pg_temp.swap(5151, $t$important electricity-cost support$t$, $t$important electricity cost support$t$);
SELECT pg_temp.swap(5151, $t$protected-job total$t$, $t$protected job total$t$);
-- member 5152
SELECT pg_temp.swap(5152, $t$a self-described$t$, $t$a self described$t$);
SELECT pg_temp.swap(5152, $t$Wolverhampton in 2021-22,$t$, $t$Wolverhampton in 2021/22,$t$);
-- member 5154
SELECT pg_temp.swap(5154, $t$co-founded a local school$t$, $t$was a founder of a local school$t$);
-- member 5155
SELECT pg_temp.swap(5155, $t$political deal-making rather$t$, $t$political dealmaking rather$t$);
SELECT pg_temp.swap(5155, $t$council-tax rise$t$, $t$council tax rise$t$);
SELECT pg_temp.swap(5155, $t$garden-waste charges$t$, $t$garden waste charges$t$);
SELECT pg_temp.swap(5155, $t$for primary-five pupils$t$, $t$for primary five pupils$t$);
SELECT pg_temp.swap(5155, $t$not an anti-cuts record$t$, $t$not an anti cuts record$t$);
SELECT pg_temp.swap(5155, $t$gap in 2023-24$t$, $t$gap in 2023/24$t$);
SELECT pg_temp.swap(5155, $t$after ring-fenced money$t$, $t$after ringfenced money$t$);
SELECT pg_temp.swap(5155, $t$million in 2024-25$t$, $t$million in 2024/25$t$);
SELECT pg_temp.swap(5155, $t$or one-off reserves$t$, $t$or one off reserves$t$);
SELECT pg_temp.swap(5155, $t$million in 2025-26 and £7.8 million in 2026-27$t$, $t$million in 2025/26 and £7.8 million in 2026/27$t$);
SELECT pg_temp.swap(5155, $t$Villages full-fibre network$t$, $t$Villages full fibre network$t$);
SELECT pg_temp.swap(5155, $t$the eight-month build$t$, $t$the eight month build$t$);
SELECT pg_temp.swap(5155, $t$of creative-industry jobs$t$, $t$of creative industry jobs$t$);
SELECT pg_temp.swap(5155, $t$remained a long-term estimate$t$, $t$remained a long term estimate$t$);
SELECT pg_temp.swap(5155, $t$capable local-government operator$t$, $t$capable local government operator$t$);
-- member 5156
SELECT pg_temp.swap(5156, $t$Labour’s policy-making circles$t$, $t$Labour’s policymaking circles$t$);
SELECT pg_temp.swap(5156, $t$modernising, policy-led tradition rather than its trade-union left$t$, $t$modernising, policy led tradition rather than its trade union left$t$);
SELECT pg_temp.swap(5156, $t$a proportional-representation bill$t$, $t$a proportional representation bill$t$);
SELECT pg_temp.swap(5156, $t$above a four-year sentencing$t$, $t$above a four year sentencing$t$);
SELECT pg_temp.swap(5156, $t$turn a long-running campaign$t$, $t$turn a long running campaign$t$);
SELECT pg_temp.swap(5156, $t$the parental-responsibility reform$t$, $t$the parental responsibility reform$t$);
SELECT pg_temp.swap(5156, $t$her victim-support duties$t$, $t$her victim support duties$t$);
-- member 5160
SELECT pg_temp.swap(5160, $t$a pro-development rural$t$, $t$a pro development rural$t$);
SELECT pg_temp.swap(5160, $t$community-benefit guidance also remained non-binding$t$, $t$community benefit guidance also remained nonbinding$t$);
SELECT pg_temp.swap(5160, $t$a 126-place Unity$t$, $t$a 126 place Unity$t$);
SELECT pg_temp.swap(5160, $t$existing county-wide commitment$t$, $t$existing countywide commitment$t$);
SELECT pg_temp.swap(5160, $t$compulsory road-safety assessments$t$, $t$compulsory road safety assessments$t$);
SELECT pg_temp.swap(5160, $t$with a rural-affairs focus$t$, $t$with a rural affairs focus$t$);
-- member 5162
SELECT pg_temp.swap(5162, $t$is a first-term Labour MP$t$, $t$is a first term Labour MP$t$);
SELECT pg_temp.swap(5162, $t$23,156 votes—46.4% of those cast—and a majority$t$, $t$23,156 votes (46.4% of those cast) and a majority$t$);
SELECT pg_temp.swap(5162, $t$priorities include public-service investment$t$, $t$priorities include public service investment$t$);
SELECT pg_temp.swap(5162, $t$stability, cross-community relationships$t$, $t$stability, cross community relationships$t$);
SELECT pg_temp.swap(5162, $t$million public-service transformation fund$t$, $t$million public service transformation fund$t$);
SELECT pg_temp.swap(5162, $t$£2,400 fact-finding visit$t$, $t$£2,400 fact finding visit$t$);
-- member 5166
SELECT pg_temp.swap(5166, $t$former secondary-school mathematics$t$, $t$former secondary school mathematics$t$);
SELECT pg_temp.swap(5166, $t$in Conservative-held Harrogate$t$, $t$in Conservative held Harrogate$t$);
SELECT pg_temp.swap(5166, $t$a baby-loss support service$t$, $t$a baby loss support service$t$);
SELECT pg_temp.swap(5166, $t$the all-party group on funerals$t$, $t$the all party group on funerals$t$);
SELECT pg_temp.swap(5166, $t$The funeral-industry campaign$t$, $t$The funeral industry campaign$t$);
SELECT pg_temp.swap(5166, $t$an artificial-intelligence version$t$, $t$an artificial intelligence version$t$);
SELECT pg_temp.swap(5166, $t$His funeral-regulation work$t$, $t$His funeral regulation work$t$);
-- member 5167
SELECT pg_temp.swap(5167, $t$recovered from its near-collapse$t$, $t$recovered from its near collapse$t$);
SELECT pg_temp.swap(5167, $t$for an Australian-style ban$t$, $t$for an Australian style ban$t$);
SELECT pg_temp.swap(5167, $t$the most dangerous social-media platforms$t$, $t$the most dangerous social media platforms$t$);
SELECT pg_temp.swap(5167, $t$barred from high-risk social-media services$t$, $t$barred from high risk social media services$t$);
SELECT pg_temp.swap(5167, $t$deprivation and social-infrastructure criteria$t$, $t$deprivation and social infrastructure criteria$t$);
SELECT pg_temp.swap(5167, $t$the original disability-benefit reforms$t$, $t$the original disability benefit reforms$t$);
SELECT pg_temp.swap(5167, $t$modernising, leadership-loyal wing$t$, $t$modernising, leadership loyal wing$t$);
-- member 5168
SELECT pg_temp.swap(5168, $t$At the cut-off date$t$, $t$At the cutoff date$t$);
SELECT pg_temp.swap(5168, $t$rise to a government-support role$t$, $t$rise to a government support role$t$);
-- member 5170
SELECT pg_temp.swap(5170, $t$By the cut-off, there was$t$, $t$By the cutoff, there was$t$);
-- member 5172
SELECT pg_temp.swap(5172, $t$defeated the long-serving Conservative$t$, $t$defeated the long serving Conservative$t$);
SELECT pg_temp.swap(5172, $t$recommended cross-government coordination$t$, $t$recommended cross government coordination$t$);
-- member 5173
SELECT pg_temp.swap(5173, $t$Her defence-finance campaign also$t$, $t$Her defence finance campaign also$t$);
SELECT pg_temp.swap(5173, $t$Labour's pro-growth, pro-business wing$t$, $t$Labour's pro growth, pro business wing$t$);
SELECT pg_temp.swap(5173, $t$rather than an MP-delivered building$t$, $t$rather than a building delivered by an MP$t$);
SELECT pg_temp.swap(5173, $t$how force-family concerns$t$, $t$how force family concerns$t$);
SELECT pg_temp.swap(5173, $t$allocating them to a ten-year programme$t$, $t$allocating them to a ten year programme$t$);
SELECT pg_temp.swap(5173, $t$built by the cut-off date$t$, $t$built by the cutoff date$t$);
SELECT pg_temp.swap(5173, $t$discussions with anti-migrant campaigners$t$, $t$discussions with anti migrant campaigners$t$);
SELECT pg_temp.swap(5173, $t$military-family issues. Her second defence-finance report$t$, $t$military family issues. Her second defence finance report$t$);
SELECT pg_temp.swap(5173, $t$largely a ten-year commitment$t$, $t$largely a ten year commitment$t$);
SELECT pg_temp.swap(5173, $t$response to anti-migrant agitation$t$, $t$response to anti migrant agitation$t$);
-- member 5174
SELECT pg_temp.swap(5174, $t$Labour's pro-growth wing$t$, $t$Labour's pro growth wing$t$);
SELECT pg_temp.swap(5174, $t$new emergency-care building$t$, $t$new emergency care building$t$);
SELECT pg_temp.swap(5174, $t$expanded marine-autonomy facilities$t$, $t$expanded marine autonomy facilities$t$);
SELECT pg_temp.swap(5174, $t$60 defence-related courses$t$, $t$60 defence related courses$t$);
SELECT pg_temp.swap(5174, $t$results by the cut-off date$t$, $t$results by the cutoff date$t$);
SELECT pg_temp.swap(5174, $t$at the cut-off it remained$t$, $t$at the cutoff it remained$t$);
-- member 5176
SELECT pg_temp.swap(5176, $t$Westminster faction-fighting$t$, $t$Westminster faction fighting$t$);
SELECT pg_temp.swap(5176, $t$local workers and co-operatives$t$, $t$local workers and cooperatives$t$);
SELECT pg_temp.swap(5176, $t$attached one-year deadlines$t$, $t$attached one year deadlines$t$);
SELECT pg_temp.swap(5176, $t$free bulky-waste collection, creating a city-centre taskforce$t$, $t$free bulky waste collection, creating a city centre taskforce$t$);
SELECT pg_temp.swap(5176, $t$bookable bulky-waste collection$t$, $t$bookable bulky waste collection$t$);
SELECT pg_temp.swap(5176, $t$council-tax increase$t$, $t$council tax increase$t$);
SELECT pg_temp.swap(5176, $t$competent short-term containment$t$, $t$competent short term containment$t$);
SELECT pg_temp.swap(5176, $t$during budget-setting$t$, $t$during budget setting$t$);
SELECT pg_temp.swap(5176, $t$The no-confidence vote tied 25-25$t$, $t$The no confidence vote tied 25 to 25$t$);
SELECT pg_temp.swap(5176, $t$by the cut-off date$t$, $t$by the cutoff date$t$);
SELECT pg_temp.swap(5176, $t$practical, service-protecting Labour$t$, $t$practical, service protecting Labour$t$);
SELECT pg_temp.swap(5176, $t$difficult, high-value projects$t$, $t$difficult, high value projects$t$);
-- member 5179
SELECT pg_temp.swap(5179, $t$inside a Labour-led administration$t$, $t$inside a Labour led administration$t$);
SELECT pg_temp.swap(5179, $t$administration's 2024-25 budget$t$, $t$administration's 2024/25 budget$t$);
SELECT pg_temp.swap(5179, $t$charge for garden-waste collection$t$, $t$charge for garden waste collection$t$);
SELECT pg_temp.swap(5179, $t$free instrumental-music provision$t$, $t$free instrumental music provision$t$);
SELECT pg_temp.swap(5179, $t$workplaces ill-equipped for$t$, $t$workplaces ill equipped for$t$);
SELECT pg_temp.swap(5179, $t$gynaecology 18-week waits$t$, $t$gynaecology 18 week waits$t$);
SELECT pg_temp.swap(5179, $t$and community-energy projects$t$, $t$and community energy projects$t$);
SELECT pg_temp.swap(5179, $t$organise cross-party campaigning$t$, $t$organise cross party campaigning$t$);
SELECT pg_temp.swap(5179, $t$her seven-year period$t$, $t$her seven year period$t$);
-- member 5181
SELECT pg_temp.swap(5181, $t$loyal first-term government$t$, $t$loyal first term government$t$);
SELECT pg_temp.swap(5181, $t$before the 2024–26 session ended$t$, $t$before the 2024/26 session ended$t$);
SELECT pg_temp.swap(5181, $t$over inheritance-tax relief$t$, $t$over inheritance tax relief$t$);
SELECT pg_temp.swap(5181, $t$used by non-farmers$t$, $t$used by non farmers$t$);
SELECT pg_temp.swap(5181, $t$than constituency-driven independence$t$, $t$than constituency driven independence$t$);
-- member 5183
SELECT pg_temp.swap(5183, $t$an unpaid, non-ministerial job$t$, $t$an unpaid, non ministerial job$t$);
SELECT pg_temp.swap(5183, $t$turn an anti-poverty idea$t$, $t$turn an anti poverty idea$t$);
SELECT pg_temp.swap(5183, $t$schools with early-years places$t$, $t$schools with early years places$t$);
SELECT pg_temp.swap(5183, $t$The primary-school change$t$, $t$The primary school change$t$);
SELECT pg_temp.swap(5183, $t$depended on data-centre capacity$t$, $t$depended on data centre capacity$t$);
-- member 5184
SELECT pg_temp.swap(5184, $t$Sidcup parliamentary by-election$t$, $t$Sidcup parliamentary byelection$t$);
SELECT pg_temp.swap(5184, $t$original disability-benefit reforms$t$, $t$original disability benefit reforms$t$);
SELECT pg_temp.swap(5184, $t$he co-sponsored Marie$t$, $t$he cosponsored Marie$t$);
SELECT pg_temp.swap(5184, $t$led by three co-chairs$t$, $t$led by three joint chairs$t$);
SELECT pg_temp.swap(5184, $t$disability or long-term illness$t$, $t$disability or long term illness$t$);
SELECT pg_temp.swap(5184, $t$influence on the assisted-dying legislation$t$, $t$influence on the assisted dying legislation$t$);
SELECT pg_temp.swap(5184, $t$palliative and end-of-life services$t$, $t$palliative and end of life services$t$);
SELECT pg_temp.swap(5184, $t$but no assisted-dying law$t$, $t$but no assisted dying law$t$);
SELECT pg_temp.swap(5184, $t$inserting a learning-disability safeguard$t$, $t$inserting a learning disability safeguard$t$);
SELECT pg_temp.swap(5184, $t$a focused disability-rights advocate$t$, $t$a focused disability rights advocate$t$);
-- member 5185
SELECT pg_temp.swap(5185, $t$£15 billion artificial-intelligence development$t$, $t$£15 billion artificial intelligence development$t$);
SELECT pg_temp.swap(5185, $t$from his self-funded trip$t$, $t$from his self funded trip$t$);
SELECT pg_temp.swap(5185, $t$energetic and well-connected advocate$t$, $t$energetic and well connected advocate$t$);
-- member 5187
SELECT pg_temp.swap(5187, $t$opportunities in semi-rural areas$t$, $t$opportunities in semirural areas$t$);
SELECT pg_temp.swap(5187, $t$in a semi-rural constituency$t$, $t$in a semirural constituency$t$);
SELECT pg_temp.swap(5187, $t$improved mental-health, employment$t$, $t$improved mental health, employment$t$);
SELECT pg_temp.swap(5187, $t$debates on semi-rural education$t$, $t$debates on semirural education$t$);
SELECT pg_temp.swap(5187, $t$loyal, constituency-focused Labour$t$, $t$loyal, constituency focused Labour$t$);
SELECT pg_temp.swap(5187, $t$experience in semi-rural communities$t$, $t$experience in semirural communities$t$);
-- member 5188
SELECT pg_temp.swap(5188, $t$a full-time lay officer$t$, $t$a full time lay officer$t$);
SELECT pg_temp.swap(5188, $t$gender self-identification$t$, $t$gender self identification$t$);
-- member 5189
SELECT pg_temp.swap(5189, $t$on Labour's pro-development right$t$, $t$on Labour's pro development right$t$);
SELECT pg_temp.swap(5189, $t$Labour's attempted disability-benefit reforms$t$, $t$Labour's attempted disability benefit reforms$t$);
SELECT pg_temp.swap(5189, $t$reductions to the health-related Universal$t$, $t$reductions to the health related Universal$t$);
SELECT pg_temp.swap(5189, $t$conflicting with his anti-poverty message$t$, $t$conflicting with his anti poverty message$t$);
SELECT pg_temp.swap(5189, $t$McKee is a pro-growth unionist$t$, $t$McKee is a pro growth unionist$t$);
SELECT pg_temp.swap(5189, $t$remove the two-child benefit limit$t$, $t$remove the two child benefit limit$t$);
-- member 5190
SELECT pg_temp.swap(5190, $t$Officer (1999-2001)$t$, $t$Officer (1999 to 2001)$t$);
-- member 5192
SELECT pg_temp.swap(5192, $t$including a five-day outage$t$, $t$including a five day outage$t$);
SELECT pg_temp.swap(5192, $t$a co-founder of the business$t$, $t$one of the founders of the business$t$);
-- member 5193
SELECT pg_temp.swap(5193, $t$outside the Oxford-Cambridge-London "golden triangle"$t$, $t$outside the Oxford, Cambridge and London "golden triangle"$t$);
SELECT pg_temp.swap(5193, $t$Labour's pro-business modernising$t$, $t$Labour's pro business modernising$t$);
SELECT pg_temp.swap(5193, $t$pension-fund consolidation$t$, $t$pension fund consolidation$t$);
SELECT pg_temp.swap(5193, $t$recognisably Starmer-era Labour$t$, $t$recognisably Starmer era Labour$t$);
SELECT pg_temp.swap(5193, $t$backed the industry-led Invest$t$, $t$backed the industry led Invest$t$);
SELECT pg_temp.swap(5193, $t$for the long-delayed Lace Hill$t$, $t$for the long delayed Lace Hill$t$);
SELECT pg_temp.swap(5193, $t$translating financial-sector ideas$t$, $t$translating financial sector ideas$t$);
SELECT pg_temp.swap(5193, $t$disciplined, business-facing Labour$t$, $t$disciplined, business facing Labour$t$);
-- member 5194
SELECT pg_temp.swap(5194, $t$most first-preference votes$t$, $t$most first preference votes$t$);
SELECT pg_temp.swap(5194, $t$one of the highest-profile Conservatives$t$, $t$one of the highest profile Conservatives$t$);
-- member 5195
SELECT pg_temp.swap(5195, $t$a five-year project$t$, $t$a five year project$t$);
SELECT pg_temp.swap(5195, $t$an industry-backed policy$t$, $t$an industry backed policy$t$);
SELECT pg_temp.swap(5195, $t$neighbourhood-planning work$t$, $t$neighbourhood planning work$t$);
SELECT pg_temp.swap(5195, $t$proposed disability-benefit reductions$t$, $t$proposed disability benefit reductions$t$);
SELECT pg_temp.swap(5195, $t$lacked step-free access to its Chester-bound platform$t$, $t$lacked step free access to its Chester bound platform$t$);
-- member 5196
SELECT pg_temp.swap(5196, $t$the government's disability-benefit reforms$t$, $t$the government's disability benefit reforms$t$);
SELECT pg_temp.swap(5196, $t$and private co-investment$t$, $t$and private coinvestment$t$);
SELECT pg_temp.swap(5196, $t$that a first-term backbencher$t$, $t$that a first term backbencher$t$);
SELECT pg_temp.swap(5196, $t$protected 500 chemical-plant jobs$t$, $t$protected 500 chemical plant jobs$t$);
-- member 5200
SELECT pg_temp.swap(5200, $t$politics are pro-Union, pro-industry and$t$, $t$politics are pro Union, pro industry and$t$);
SELECT pg_temp.swap(5200, $t$No new credit-union law$t$, $t$No new credit union law$t$);
SELECT pg_temp.swap(5200, $t$measures on trade-union ballots$t$, $t$measures on trade union ballots$t$);
SELECT pg_temp.swap(5200, $t$defend Labour's pro-Union argument$t$, $t$defend Labour's pro Union argument$t$);
-- member 5202
SELECT pg_temp.swap(5202, $t$almost two-thirds of voters$t$, $t$almost two thirds of voters$t$);
SELECT pg_temp.swap(5202, $t$came from foreign-policy expertise$t$, $t$came from foreign policy expertise$t$);
SELECT pg_temp.swap(5202, $t$ministerial or select-committee position$t$, $t$ministerial or select committee position$t$);
SELECT pg_temp.swap(5202, $t$pressed for year-round testing at bathing sites$t$, $t$pressed for testing at bathing sites all year round$t$);
SELECT pg_temp.swap(5202, $t$long-term and intergenerational harm$t$, $t$long term and intergenerational harm$t$);
SELECT pg_temp.swap(5202, $t$By the cut-off date$t$, $t$By the cutoff date$t$);
SELECT pg_temp.swap(5202, $t$the judge-led statutory inquiry$t$, $t$the judge led statutory inquiry$t$);
SELECT pg_temp.swap(5202, $t$obtain the year-round bathing-water testing sought by Dorset MPs$t$, $t$obtain the bathing water testing all year round sought by Dorset MPs$t$);
SELECT pg_temp.swap(5202, $t$Existing water-treatment investments$t$, $t$Existing water treatment investments$t$);
SELECT pg_temp.swap(5202, $t$organise cross-party pressure$t$, $t$organise cross party pressure$t$);
-- member 5204
SELECT pg_temp.swap(5204, $t$She is Jewish and vice-chair of$t$, $t$She is Jewish and vice chair of$t$);
-- member 5205
SELECT pg_temp.swap(5205, $t$national policy-maker.$t$, $t$national policymaker.$t$);
SELECT pg_temp.swap(5205, $t$for the final go-ahead$t$, $t$for the final go ahead$t$);
SELECT pg_temp.swap(5205, $t$absence of step-free access$t$, $t$absence of step free access$t$);
SELECT pg_temp.swap(5205, $t$remained a design-stage commitment$t$, $t$remained a design stage commitment$t$);
SELECT pg_temp.swap(5205, $t$that asset-rich but low-profit family$t$, $t$that asset rich but low profit family$t$);
SELECT pg_temp.swap(5205, $t$stopping wealthy non-farmers$t$, $t$stopping wealthy non farmers$t$);
SELECT pg_temp.swap(5205, $t$raised the full-relief threshold$t$, $t$raised the full relief threshold$t$);
SELECT pg_temp.swap(5205, $t$the proposed Norwich-to-Tilbury electricity$t$, $t$the proposed Norwich to Tilbury electricity$t$);
SELECT pg_temp.swap(5205, $t$in the farm-tax concession$t$, $t$in the farm tax concession$t$);
-- member 5210
SELECT pg_temp.swap(5210, $t$a public-private partnership$t$, $t$a public private partnership$t$);
SELECT pg_temp.swap(5210, $t$with wheelchair-accessible swings$t$, $t$with wheelchair accessible swings$t$);
-- member 5211
SELECT pg_temp.swap(5211, $t$one of six pro-leadership NEC members$t$, $t$one of six pro leadership NEC members$t$);
SELECT pg_temp.swap(5211, $t$services back in-house, emissions-based parking permits, low-traffic neighbourhoods$t$, $t$services back in house, emissions based parking permits, low traffic neighbourhoods$t$);
SELECT pg_temp.swap(5211, $t$measurable improvements on fly-tipping$t$, $t$measurable improvements on flytipping$t$);
SELECT pg_temp.swap(5211, $t$targeted waste-storage schemes$t$, $t$targeted waste storage schemes$t$);
SELECT pg_temp.swap(5211, $t$first cross-borough low-traffic neighbourhood$t$, $t$first cross borough low traffic neighbourhood$t$);
SELECT pg_temp.swap(5211, $t$reduced fly-tipping and completed$t$, $t$reduced flytipping and completed$t$);
-- member 5212
SELECT pg_temp.swap(5212, $t$Edinburgh's low-emission zone$t$, $t$Edinburgh's low emission zone$t$);
SELECT pg_temp.swap(5212, $t$substantial fleet-replacement budget$t$, $t$substantial fleet replacement budget$t$);
SELECT pg_temp.swap(5212, $t$Edinburgh's pavement-parking prohibition$t$, $t$Edinburgh's pavement parking prohibition$t$);
SELECT pg_temp.swap(5212, $t$choosing city-wide enforcement$t$, $t$choosing citywide enforcement$t$);
SELECT pg_temp.swap(5212, $t$and clinical-trial participation$t$, $t$and clinical trial participation$t$);
SELECT pg_temp.swap(5212, $t$for a first-term backbencher$t$, $t$for a first term backbencher$t$);
SELECT pg_temp.swap(5212, $t$for a north-south tram extension$t$, $t$for a north south tram extension$t$);
SELECT pg_temp.swap(5212, $t$with some over-promising$t$, $t$with some overpromising$t$);
SELECT pg_temp.swap(5212, $t$build cross-party and charitable$t$, $t$build cross party and charitable$t$);
SELECT pg_temp.swap(5212, $t$many longer-serving backbenchers$t$, $t$many longer serving backbenchers$t$);
-- member 5213
SELECT pg_temp.swap(5213, $t$government's 150-day target$t$, $t$government's 150 day target$t$);
SELECT pg_temp.swap(5213, $t$route for lower-risk trial$t$, $t$route for lower risk trial$t$);
SELECT pg_temp.swap(5213, $t$A UK-US pharmaceutical agreement$t$, $t$A UK and US pharmaceutical agreement$t$);
SELECT pg_temp.swap(5213, $t$could regard as cost-effective$t$, $t$could regard as cost effective$t$);
SELECT pg_temp.swap(5213, $t$during the spending-review period$t$, $t$during the spending review period$t$);
SELECT pg_temp.swap(5213, $t$confront that trade-off.$t$, $t$confront that tradeoff.$t$);
SELECT pg_temp.swap(5213, $t$The data-driven model$t$, $t$The data driven model$t$);
SELECT pg_temp.swap(5213, $t$fall to a record-low 17 MSPs$t$, $t$fall to a record low 17 MSPs$t$);
SELECT pg_temp.swap(5213, $t$turn a clinical-trials target$t$, $t$turn a clinical trials target$t$);
-- member 5215
SELECT pg_temp.swap(5215, $t$born in the now-defunct All Saints'$t$, $t$born in the now defunct All Saints'$t$);
SELECT pg_temp.swap(5215, $t$A first-term MP resigning$t$, $t$A first term MP resigning$t$);
-- member 5217
SELECT pg_temp.swap(5217, $t$campaigned for year-round testing of bathing water$t$, $t$campaigned for testing of bathing water all year round$t$);
SELECT pg_temp.swap(5217, $t$reduce asylum-accommodation costs$t$, $t$reduce asylum accommodation costs$t$);
SELECT pg_temp.swap(5217, $t$transport improvements and public-service projects$t$, $t$transport improvements and public service projects$t$);
SELECT pg_temp.swap(5217, $t$as an offshore-wind construction port$t$, $t$as an offshore wind construction port$t$);
SELECT pg_temp.swap(5217, $t$a confirmed clean-energy industry$t$, $t$a confirmed clean energy industry$t$);
SELECT pg_temp.swap(5217, $t$secure the year-round local testing system$t$, $t$secure the all year round local testing system$t$);
SELECT pg_temp.swap(5217, $t$evidence by the cut-off date$t$, $t$evidence by the cutoff date$t$);
SELECT pg_temp.swap(5217, $t$and near-total alignment$t$, $t$and near total alignment$t$);
SELECT pg_temp.swap(5217, $t$year-round water testing was not secured and the offshore-wind proposal$t$, $t$water testing all year round was not secured and the offshore wind proposal$t$);
-- member 5218
SELECT pg_temp.swap(5218, $t$by a first-term MP$t$, $t$by a first term MP$t$);
SELECT pg_temp.swap(5218, $t$that asset-rich but cash-poor family$t$, $t$that asset rich but cash poor family$t$);
SELECT pg_temp.swap(5218, $t$relief in 2026-27$t$, $t$relief in 2026/27$t$);
SELECT pg_temp.swap(5218, $t$As religious-freedom envoy$t$, $t$As religious freedom envoy$t$);
SELECT pg_temp.swap(5218, $t$produced country-level targets$t$, $t$produced country level targets$t$);
SELECT pg_temp.swap(5218, $t$The farm-tax retreat$t$, $t$The farm tax retreat$t$);
SELECT pg_temp.swap(5218, $t$His religious-freedom work$t$, $t$His religious freedom work$t$);
SELECT pg_temp.swap(5218, $t$an independent-minded constituency$t$, $t$an independent minded constituency$t$);
-- member 5220
SELECT pg_temp.swap(5220, $t$His pre-politics career was$t$, $t$His career before politics was$t$);
SELECT pg_temp.swap(5220, $t$for a banking start-up$t$, $t$for a banking startup$t$);
-- member 5221
SELECT pg_temp.swap(5221, $t$the pre-Marxist socialist$t$, $t$the pre Marxist socialist$t$);
-- member 5222
SELECT pg_temp.swap(5222, $t$Union in 2013-14$t$, $t$Union in 2013/14$t$);
-- member 5223
SELECT pg_temp.swap(5223, $t$Labour’s managerial, pro-government wing$t$, $t$Labour’s managerial, pro government wing$t$);
SELECT pg_temp.swap(5223, $t$council, NHS and voluntary-sector partnership$t$, $t$council, NHS and voluntary sector partnership$t$);
SELECT pg_temp.swap(5223, $t$collective public-health measures$t$, $t$collective public health measures$t$);
SELECT pg_temp.swap(5223, $t$By the cut-off date, the road$t$, $t$By the cutoff date, the road$t$);
SELECT pg_temp.swap(5223, $t$reliable local-government operator$t$, $t$reliable local government operator$t$);
-- member 5224
SELECT pg_temp.swap(5224, $t$labour-market enforcement$t$, $t$labour market enforcement$t$);
SELECT pg_temp.swap(5224, $t$employment-rights programme$t$, $t$employment rights programme$t$);
SELECT pg_temp.swap(5224, $t$guaranteed-hours rights$t$, $t$guaranteed hours rights$t$);
SELECT pg_temp.swap(5224, $t$non-disclosure agreements$t$, $t$nondisclosure agreements$t$);
SELECT pg_temp.swap(5224, $t$unfair-dismissal rights$t$, $t$unfair dismissal rights$t$);
SELECT pg_temp.swap(5224, $t$business and trade-union representatives$t$, $t$business and trade union representatives$t$);
SELECT pg_temp.swap(5224, $t$a six-month qualifying$t$, $t$a six month qualifying$t$);
SELECT pg_temp.swap(5224, $t$stronger sick-pay and family-leave rights$t$, $t$stronger sick pay and family leave rights$t$);
SELECT pg_temp.swap(5224, $t$exploitative zero-hours practices$t$, $t$exploitative zero hours practices$t$);
SELECT pg_temp.swap(5224, $t$greater trade-union access$t$, $t$greater trade union access$t$);
SELECT pg_temp.swap(5224, $t$day-one rights$t$, $t$day one rights$t$);
SELECT pg_temp.swap(5224, $t$short-notice shift payments, stronger flexible-working procedures$t$, $t$short notice shift payments, stronger flexible working procedures$t$);
SELECT pg_temp.swap(5224, $t$product-safety law$t$, $t$product safety law$t$);
SELECT pg_temp.swap(5224, $t$AI-enabled toys$t$, $t$AI enabled toys$t$);
SELECT pg_temp.swap(5224, $t$rights and trade-union access brought$t$, $t$rights and trade union access brought$t$);
SELECT pg_temp.swap(5224, $t$substantial employment-law package$t$, $t$substantial employment law package$t$);
-- member 5225
SELECT pg_temp.swap(5225, $t$holiday and after-school provision$t$, $t$holiday and after school provision$t$);
SELECT pg_temp.swap(5225, $t$public-service and environmental$t$, $t$public service and environmental$t$);
SELECT pg_temp.swap(5225, $t$that first-team operations$t$, $t$that first team operations$t$);
SELECT pg_temp.swap(5225, $t$Rayner campaign-bus visit$t$, $t$Rayner campaign bus visit$t$);
SELECT pg_temp.swap(5225, $t$shows a constituency-focused MP$t$, $t$shows a constituency focused MP$t$);
SELECT pg_temp.swap(5225, $t$national policy-maker.$t$, $t$national policymaker.$t$);
-- member 5227
SELECT pg_temp.swap(5227, $t$a Conservative-Liberal Democrat administration$t$, $t$a Conservative and Liberal Democrat administration$t$);
SELECT pg_temp.swap(5227, $t$a sexual-harassment allegation$t$, $t$a sexual harassment allegation$t$);
SELECT pg_temp.swap(5227, $t$Corbyn-era factional warfare$t$, $t$Corbyn era factional warfare$t$);
SELECT pg_temp.swap(5227, $t$resumed council-house construction$t$, $t$resumed council house construction$t$);
SELECT pg_temp.swap(5227, $t$first 33-home phase$t$, $t$first 33 home phase$t$);
SELECT pg_temp.swap(5227, $t$the 600-home commitment$t$, $t$the 600 home commitment$t$);
SELECT pg_temp.swap(5227, $t$the 103-home Little Gearies$t$, $t$the 103 home Little Gearies$t$);
SELECT pg_temp.swap(5227, $t$local-government finance$t$, $t$local government finance$t$);
SELECT pg_temp.swap(5227, $t$fly-tipping and youth$t$, $t$flytipping and youth$t$);
SELECT pg_temp.swap(5227, $t$pragmatic, council-rooted mainstream$t$, $t$pragmatic, council rooted mainstream$t$);
SELECT pg_temp.swap(5227, $t$children’s-services record$t$, $t$children’s services record$t$);
SELECT pg_temp.swap(5227, $t$weak follow-through$t$, $t$weak follow through$t$);
-- member 5228
SELECT pg_temp.swap(5228, $t$capital-gains taxes, VAT on private-school fees$t$, $t$capital gains taxes, VAT on private school fees$t$);
SELECT pg_temp.swap(5228, $t$receiving means-tested benefits$t$, $t$receiving means tested benefits$t$);
SELECT pg_temp.swap(5228, $t$tighter disability-benefit rules$t$, $t$tighter disability benefit rules$t$);
SELECT pg_temp.swap(5228, $t$the long-delayed A582$t$, $t$the long delayed A582$t$);
SELECT pg_temp.swap(5228, $t$By the cut-off date$t$, $t$By the cutoff date$t$);
SELECT pg_temp.swap(5228, $t$her family-policy work$t$, $t$her family policy work$t$);
SELECT pg_temp.swap(5228, $t$calling for the two-child benefit limit$t$, $t$calling for the two child benefit limit$t$);
-- member 5229
SELECT pg_temp.swap(5229, $t$faction-building$t$, $t$faction building$t$);
SELECT pg_temp.swap(5229, $t$the all-party group on anti-corruption and$t$, $t$the all party group on anti corruption and$t$);
SELECT pg_temp.swap(5229, $t$and cross-party allies$t$, $t$and cross party allies$t$);
SELECT pg_temp.swap(5229, $t$high-value property$t$, $t$high value property$t$);
SELECT pg_temp.swap(5229, $t$limited company-register proposals$t$, $t$limited company register proposals$t$);
SELECT pg_temp.swap(5229, $t$day-to-day complaints$t$, $t$day to day complaints$t$);
SELECT pg_temp.swap(5229, $t$agenda-setting more clearly$t$, $t$agenda setting more clearly$t$);
SELECT pg_temp.swap(5229, $t$tax-haven secrecy$t$, $t$tax haven secrecy$t$);
SELECT pg_temp.swap(5229, $t$through British Overseas Territories-linked companies since$t$, $t$through companies linked to British Overseas Territories since$t$);
SELECT pg_temp.swap(5229, $t$led a cross-party group$t$, $t$led a cross party group$t$);
SELECT pg_temp.swap(5229, $t$public beneficial-ownership registers$t$, $t$public beneficial ownership registers$t$);
SELECT pg_temp.swap(5229, $t$business-rate abuse$t$, $t$business rate abuse$t$);
SELECT pg_temp.swap(5229, $t$by the cut-off.$t$, $t$by the cutoff.$t$);
SELECT pg_temp.swap(5229, $t$wider building-safety reform$t$, $t$wider building safety reform$t$);
SELECT pg_temp.swap(5229, $t$on anti-corruption were cross-party,$t$, $t$on anti corruption were cross party,$t$);
SELECT pg_temp.swap(5229, $t$regime, building-safety settlement$t$, $t$regime, building safety settlement$t$);
-- member 5230
SELECT pg_temp.swap(5230, $t$Britain's best-known trade union$t$, $t$Britain's best known trade union$t$);
-- member 5232
SELECT pg_temp.swap(5232, $t$working-class coastal communities$t$, $t$working class coastal communities$t$);
SELECT pg_temp.swap(5232, $t$football-governance legislation$t$, $t$football governance legislation$t$);
SELECT pg_temp.swap(5232, $t$to be co-produced meaningfully$t$, $t$to be coproduced meaningfully$t$);
SELECT pg_temp.swap(5232, $t$over ten years—£2 million annually—for locally$t$, $t$over ten years (£2 million annually) for locally$t$);
SELECT pg_temp.swap(5232, $t$landfill-gas management$t$, $t$landfill gas management$t$);
SELECT pg_temp.swap(5232, $t$significant long-term funding$t$, $t$significant long term funding$t$);
-- member 5233
SELECT pg_temp.swap(5233, $t$of a non-operational environmental$t$, $t$of a non operational environmental$t$);
SELECT pg_temp.swap(5233, $t$institutional decision-makers$t$, $t$institutional decision makers$t$);
SELECT pg_temp.swap(5233, $t$visible constituency-service operation$t$, $t$visible constituency service operation$t$);
SELECT pg_temp.swap(5233, $t$Those are self-reported figures$t$, $t$Those are self reported figures$t$);
SELECT pg_temp.swap(5233, $t$a high-volume local casework MP$t$, $t$a high volume local casework MP$t$);
SELECT pg_temp.swap(5233, $t$vandalism and water-safety education$t$, $t$vandalism and water safety education$t$);
-- member 5234
SELECT pg_temp.swap(5234, $t$through Labour's trade-union wing$t$, $t$through Labour's trade union wing$t$);
SELECT pg_temp.swap(5234, $t$identifiable trade-union Labour MP$t$, $t$identifiable trade union Labour MP$t$);
SELECT pg_temp.swap(5234, $t$proposed disability-benefit changes$t$, $t$proposed disability benefit changes$t$);
SELECT pg_temp.swap(5234, $t$than the 2027-28 financial year$t$, $t$than the 2027/28 financial year$t$);
SELECT pg_temp.swap(5234, $t$large equal-pay liabilities$t$, $t$large equal pay liabilities$t$);
SELECT pg_temp.swap(5234, $t$connect trade-union organisation$t$, $t$connect trade union organisation$t$);
SELECT pg_temp.swap(5234, $t$on the school-support negotiating body$t$, $t$on the school support negotiating body$t$);
SELECT pg_temp.swap(5234, $t$effective labour-movement advocate$t$, $t$effective labour movement advocate$t$);
-- member 5235
SELECT pg_temp.swap(5235, $t$removed the five-year limit on the exemption from local-connection rules$t$, $t$removed the five year limit on the exemption from local connection rules$t$);
SELECT pg_temp.swap(5235, $t$residency or local-connection tests$t$, $t$residency or local connection tests$t$);
SELECT pg_temp.swap(5235, $t$under the pre-2000 ban$t$, $t$under the pre 2000 ban$t$);
SELECT pg_temp.swap(5235, $t$alongside non-financial measures$t$, $t$alongside non financial measures$t$);
SELECT pg_temp.swap(5235, $t$during the 1952–67 nuclear$t$, $t$during the 1952 to 1967 nuclear$t$);
SELECT pg_temp.swap(5235, $t$fees for non-UK personnel$t$, $t$fees for non UK personnel$t$);
SELECT pg_temp.swap(5235, $t$At the cut-off date$t$, $t$At the cutoff date$t$);
SELECT pg_temp.swap(5235, $t$forced out — for example by being pushed to resign rather than formally dismissed — and who$t$, $t$forced out (for example by being pushed to resign rather than formally dismissed) and who$t$);
SELECT pg_temp.swap(5235, $t$the visa-fee promise$t$, $t$the visa fee promise$t$);
-- member 5236
SELECT pg_temp.swap(5236, $t$promised half-hourly service$t$, $t$promised half hourly service$t$);
SELECT pg_temp.swap(5236, $t$the Labour-run authority$t$, $t$the Labour run authority$t$);
SELECT pg_temp.swap(5236, $t$and water-industry background$t$, $t$and water industry background$t$);
-- member 5237
SELECT pg_temp.swap(5237, $t$opposed disability-benefit reforms$t$, $t$opposed disability benefit reforms$t$);
SELECT pg_temp.swap(5237, $t$The project pre-dated his election$t$, $t$The project predated his election$t$);
SELECT pg_temp.swap(5237, $t$The young-carers inquiry$t$, $t$The young carers inquiry$t$);
SELECT pg_temp.swap(5237, $t$causing a by-election$t$, $t$causing a byelection$t$);
-- member 5238
SELECT pg_temp.swap(5238, $t$His foreign-policy experience$t$, $t$His foreign policy experience$t$);
SELECT pg_temp.swap(5238, $t$through coalition-building on$t$, $t$through coalition building on$t$);
SELECT pg_temp.swap(5238, $t$a year by 2029-30$t$, $t$a year by 2029/30$t$);
SELECT pg_temp.swap(5238, $t$part of town-centre regeneration. By the cut-off date$t$, $t$part of town centre regeneration. By the cutoff date$t$);
SELECT pg_temp.swap(5238, $t$His road-safety campaign$t$, $t$His road safety campaign$t$);
SELECT pg_temp.swap(5238, $t$councils and road-safety bodies$t$, $t$councils and road safety bodies$t$);
SELECT pg_temp.swap(5238, $t$demonstrated foreign-policy confidence and one effective welfare-and-tax coalition$t$, $t$demonstrated foreign policy confidence and one effective welfare and tax coalition$t$);
SELECT pg_temp.swap(5238, $t$scrutiniser and alliance-builder$t$, $t$scrutiniser and alliance builder$t$);
SELECT pg_temp.swap(5238, $t$removal of the two-child benefit limit$t$, $t$removal of the two child benefit limit$t$);
SELECT pg_temp.swap(5238, $t$removed the two-child limit from April 2026$t$, $t$removed the two child limit from April 2026$t$);
-- member 5243
SELECT pg_temp.swap(5243, $t$ahead of market-led provision$t$, $t$ahead of market led provision$t$);
SELECT pg_temp.swap(5243, $t$By mid-2026,$t$, $t$By mid 2026,$t$);
SELECT pg_temp.swap(5243, $t$came from coalition-building,$t$, $t$came from coalition building,$t$);
-- member 5244
SELECT pg_temp.swap(5244, $t$Labour's proposed disability-benefit cuts$t$, $t$Labour's proposed disability benefit cuts$t$);
SELECT pg_temp.swap(5244, $t$reduction in health-related Universal$t$, $t$reduction in health related Universal$t$);
SELECT pg_temp.swap(5244, $t$less a year by 2029-30 than$t$, $t$less a year by 2029/30 than$t$);
-- member 5245
SELECT pg_temp.swap(5245, $t$Scottish Labour's pro-devolution, pro-European mainstream$t$, $t$Scottish Labour's pro devolution, pro European mainstream$t$);
SELECT pg_temp.swap(5245, $t$an independent policy-maker$t$, $t$an independent policymaker$t$);
SELECT pg_temp.swap(5245, $t$By the cut-off date$t$, $t$By the cutoff date$t$);
SELECT pg_temp.swap(5245, $t$was not sewage-related$t$, $t$was not sewage related$t$);
SELECT pg_temp.swap(5245, $t$administrator or policy-maker$t$, $t$administrator or policymaker$t$);
-- member 5247
SELECT pg_temp.swap(5247, $t$elected a non-Conservative since$t$, $t$elected a non Conservative since$t$);
-- member 5248
SELECT pg_temp.swap(5248, $t$climate and energy-policy specialist$t$, $t$climate and energy policy specialist$t$);
SELECT pg_temp.swap(5248, $t$directed the cross-party Environmental$t$, $t$directed the cross party Environmental$t$);
SELECT pg_temp.swap(5248, $t$to a low-carbon economy$t$, $t$to a low carbon economy$t$);
SELECT pg_temp.swap(5248, $t$for government-led green$t$, $t$for government led green$t$);
SELECT pg_temp.swap(5248, $t$stronger economic-growth duty$t$, $t$stronger economic growth duty$t$);
SELECT pg_temp.swap(5248, $t$a ten-minute rule bill$t$, $t$a ten minute rule bill$t$);
SELECT pg_temp.swap(5248, $t$wider neighbourhood-health investment$t$, $t$wider neighbourhood health investment$t$);
SELECT pg_temp.swap(5248, $t$the larger neighbourhood-health proposal$t$, $t$the larger neighbourhood health proposal$t$);
SELECT pg_temp.swap(5248, $t$demonstrated agenda-setting ability$t$, $t$demonstrated agenda setting ability$t$);
SELECT pg_temp.swap(5248, $t$the average first-term MP$t$, $t$the average first term MP$t$);
-- member 5251
SELECT pg_temp.swap(5251, $t$sustainable-development objectives$t$, $t$sustainable development objectives$t$);
SELECT pg_temp.swap(5251, $t$social-democratic Labour politician$t$, $t$social democratic Labour politician$t$);
SELECT pg_temp.swap(5251, $t$His fair-trade background$t$, $t$His fair trade background$t$);
SELECT pg_temp.swap(5251, $t$make fair-trade certification$t$, $t$make fair trade certification$t$);
SELECT pg_temp.swap(5251, $t$high-cost lending and buy-now-pay-later debt$t$, $t$high cost lending and buy now pay later debt$t$);
SELECT pg_temp.swap(5251, $t$The long-term effects$t$, $t$The long term effects$t$);
SELECT pg_temp.swap(5251, $t$public-service pressures$t$, $t$public service pressures$t$);
SELECT pg_temp.swap(5251, $t$incompatible—one can defend Palestinian rights while opposing a particular organisation—but they$t$, $t$incompatible (one can defend Palestinian rights while opposing a particular organisation), but they$t$);
SELECT pg_temp.swap(5251, $t$committee-minded$t$, $t$committee minded$t$);
-- member 5254
SELECT pg_temp.swap(5254, $t$disability-rights activism$t$, $t$disability rights activism$t$);
SELECT pg_temp.swap(5254, $t$social-democratic left$t$, $t$social democratic left$t$);
SELECT pg_temp.swap(5254, $t$co-production$t$, $t$coproduction$t$);
SELECT pg_temp.swap(5254, $t$existing long-range radio$t$, $t$existing long range radio$t$);
SELECT pg_temp.swap(5254, $t$4G or long-range radio$t$, $t$4G or long range radio$t$);
SELECT pg_temp.swap(5254, $t$4G smart-meter communications$t$, $t$4G smart meter communications$t$);
SELECT pg_temp.swap(5254, $t$the small-scale fracking loophole$t$, $t$the small scale fracking loophole$t$);
SELECT pg_temp.swap(5254, $t$ban on low-volume hydraulic$t$, $t$ban on low volume hydraulic$t$);
SELECT pg_temp.swap(5254, $t$treat low-volume operations$t$, $t$treat low volume operations$t$);
SELECT pg_temp.swap(5254, $t$shale-gas fracking$t$, $t$shale gas fracking$t$);
SELECT pg_temp.swap(5254, $t$by the cut-off date$t$, $t$by the cutoff date$t$);
SELECT pg_temp.swap(5254, $t$round-the-clock thrombectomy$t$, $t$round the clock thrombectomy$t$);
SELECT pg_temp.swap(5254, $t$technical smart-meter failure$t$, $t$technical smart meter failure$t$);
-- member 5257
SELECT pg_temp.swap(5257, $t$She was vice-chair of$t$, $t$She was vice chair of$t$);
SELECT pg_temp.swap(5257, $t$regulation of short-term lets$t$, $t$regulation of short term lets$t$);
SELECT pg_temp.swap(5257, $t$rules for Buy-Now, Pay-Later lending$t$, $t$rules for Buy Now, Pay Later lending$t$);
-- member 5258
SELECT pg_temp.swap(5258, $t$first government-funded centres$t$, $t$first government funded centres$t$);
SELECT pg_temp.swap(5258, $t$parish-council records$t$, $t$parish council records$t$);
SELECT pg_temp.swap(5258, $t$of nuclear-test veterans$t$, $t$of nuclear test veterans$t$);
SELECT pg_temp.swap(5258, $t$the long-term effectiveness$t$, $t$the long term effectiveness$t$);
SELECT pg_temp.swap(5258, $t$ordinary first-term backbencher$t$, $t$ordinary first term backbencher$t$);
SELECT pg_temp.swap(5258, $t$unusually well-qualified junior$t$, $t$unusually well qualified junior$t$);
SELECT pg_temp.swap(5258, $t$tests—including armed-forces recruitment, retention, readiness and personnel welfare—were$t$, $t$tests, including armed forces recruitment, retention, readiness and personnel welfare, were$t$);
-- member 5259
SELECT pg_temp.swap(5259, $t$policy-making wing$t$, $t$policymaking wing$t$);
SELECT pg_temp.swap(5259, $t$create well-paid work$t$, $t$create well paid work$t$);
SELECT pg_temp.swap(5259, $t$reforming developing-country debt$t$, $t$reforming developing country debt$t$);
SELECT pg_temp.swap(5259, $t$charities, anti-poverty organisations$t$, $t$charities, anti poverty organisations$t$);
SELECT pg_temp.swap(5259, $t$issued by low-income states$t$, $t$issued by low income states$t$);
SELECT pg_temp.swap(5259, $t$and co-sponsor of the Terminally$t$, $t$and cosponsor of the Terminally$t$);
SELECT pg_temp.swap(5259, $t$2024-26 session$t$, $t$2024 to 2026 session$t$);
SELECT pg_temp.swap(5259, $t$combined soft-left economics$t$, $t$combined soft left economics$t$);
SELECT pg_temp.swap(5259, $t$abolition of the two-child limit in Universal Credit$t$, $t$abolition of the two child limit in Universal Credit$t$);
SELECT pg_temp.swap(5259, $t$The abolition of the two-child limit was a genuine success$t$, $t$The abolition of the two child limit was a genuine success$t$);
-- member 5260
SELECT pg_temp.swap(5260, $t$the net-zero strategy$t$, $t$the net zero strategy$t$);
SELECT pg_temp.swap(5260, $t$and energy-security policy$t$, $t$and energy security policy$t$);
SELECT pg_temp.swap(5260, $t$volatile fossil-fuel prices$t$, $t$volatile fossil fuel prices$t$);
SELECT pg_temp.swap(5260, $t$to low-carbon technologies$t$, $t$to low carbon technologies$t$);
SELECT pg_temp.swap(5260, $t$and co-signed a commitment$t$, $t$and cosigned a commitment$t$);
SELECT pg_temp.swap(5260, $t$that British-funded projects$t$, $t$that British funded projects$t$);
SELECT pg_temp.swap(5260, $t$White co-chaired a new climate-security taskforce$t$, $t$White was joint chair of a new climate security taskforce$t$);
SELECT pg_temp.swap(5260, $t$Her community-engagement programme$t$, $t$Her community engagement programme$t$);
SELECT pg_temp.swap(5260, $t$turning a long-term emissions$t$, $t$turning a long term emissions$t$);
SELECT pg_temp.swap(5260, $t$effective climate-policy legislator$t$, $t$effective climate policy legislator$t$);
-- member 5264
SELECT pg_temp.swap(5264, $t$patriotism and working-class belonging$t$, $t$patriotism and working class belonging$t$);
SELECT pg_temp.swap(5264, $t$many working-class voters$t$, $t$many working class voters$t$);
SELECT pg_temp.swap(5264, $t$most first-term backbenchers$t$, $t$most first term backbenchers$t$);
SELECT pg_temp.swap(5264, $t$economically left-wing$t$, $t$economically left wing$t$);
SELECT pg_temp.swap(5264, $t$regain working-class trust$t$, $t$regain working class trust$t$);
SELECT pg_temp.swap(5264, $t$defended intelligence-led stop$t$, $t$defended intelligence led stop$t$);
SELECT pg_temp.swap(5264, $t$uncomplicated law-and-order position$t$, $t$uncomplicated law and order position$t$);
SELECT pg_temp.swap(5264, $t$available to rank-and-file officers$t$, $t$available to rank and file officers$t$);
SELECT pg_temp.swap(5264, $t$drew cross-party support$t$, $t$drew cross party support$t$);
SELECT pg_temp.swap(5264, $t$form to working-class discontent$t$, $t$form to working class discontent$t$);
-- member 5267
SELECT pg_temp.swap(5267, $t$she co-founded Rethinking$t$, $t$she was a founder of Rethinking$t$);
SELECT pg_temp.swap(5267, $t$first ever Europe-China correspondent$t$, $t$first ever Europe China correspondent$t$);
SELECT pg_temp.swap(5267, $t$in reform-era China$t$, $t$in reform era China$t$);
-- member 5269
SELECT pg_temp.swap(5269, $t$That role was short-lived:$t$, $t$That role was short lived:$t$);
SELECT pg_temp.swap(5269, $t$combine evidence-led government$t$, $t$combine evidence led government$t$);
SELECT pg_temp.swap(5269, $t$in 2022-23 and 1,952 tonnes in 2023-24$t$, $t$in 2022/23 and 1,952 tonnes in 2023/24$t$);
SELECT pg_temp.swap(5269, $t$million post-pandemic support$t$, $t$million postpandemic support$t$);
SELECT pg_temp.swap(5269, $t$a Gravesend-Tilbury river crossing$t$, $t$a river crossing between Gravesend and Tilbury$t$);
SELECT pg_temp.swap(5269, $t$by the cut-off date there$t$, $t$by the cutoff date there$t$);
SELECT pg_temp.swap(5269, $t$administrative and evidence-oriented$t$, $t$administrative and evidence oriented$t$);
-- member 5270
SELECT pg_temp.swap(5270, $t$leadership on social-work practice$t$, $t$leadership on social work practice$t$);
SELECT pg_temp.swap(5270, $t$for classroom-based water safety$t$, $t$for classroom based water safety$t$);
SELECT pg_temp.swap(5270, $t$led a cross-party parliamentary group$t$, $t$led a cross party parliamentary group$t$);
SELECT pg_temp.swap(5270, $t$lifesaving and water-safety organisations$t$, $t$lifesaving and water safety organisations$t$);
SELECT pg_temp.swap(5270, $t$insufficient long-term decision-making$t$, $t$insufficient long term decision making$t$);
SELECT pg_temp.swap(5270, $t$build a focused cross-party campaign$t$, $t$build a focused cross party campaign$t$);
SELECT pg_temp.swap(5270, $t$s-services judgement$t$, $t$s services judgement$t$);
SELECT pg_temp.swap(5270, $t$capable education-focused local$t$, $t$capable education focused local$t$);
-- member 5272
SELECT pg_temp.swap(5272, $t$she worked for long-serving Labour MP$t$, $t$she worked for long serving Labour MP$t$);
SELECT pg_temp.swap(5272, $t$herself as a working-class, community-based Labour$t$, $t$herself as a working class, community based Labour$t$);
SELECT pg_temp.swap(5272, $t$reduce housing-benefit expenditure$t$, $t$reduce housing benefit expenditure$t$);
SELECT pg_temp.swap(5272, $t$reducing the health-related Universal$t$, $t$reducing the health related Universal$t$);
SELECT pg_temp.swap(5272, $t$and a food-training school$t$, $t$and a food training school$t$);
SELECT pg_temp.swap(5272, $t$called for a multi-agency wildfire$t$, $t$called for a multiagency wildfire$t$);
SELECT pg_temp.swap(5272, $t$recorded 47 fire-related incidents$t$, $t$recorded 47 fire related incidents$t$);
SELECT pg_temp.swap(5272, $t$secured a major long-term regeneration$t$, $t$secured a major long term regeneration$t$);
-- member 5273
SELECT pg_temp.swap(5273, $t$an unpaid political-assistant post$t$, $t$an unpaid political assistant post$t$);
SELECT pg_temp.swap(5273, $t$Labour loses working-class support$t$, $t$Labour loses working class support$t$);
SELECT pg_temp.swap(5273, $t$for the two-child benefit limit to be abolished$t$, $t$for the two child benefit limit to be abolished$t$);
-- member 5275
SELECT pg_temp.swap(5275, $t$Babcock and long-established submarine-disposal requirements$t$, $t$Babcock and long established submarine disposal requirements$t$);
SELECT pg_temp.swap(5275, $t$The government's major-projects data$t$, $t$The government's major projects data$t$);
SELECT pg_temp.swap(5275, $t$to national fuel-market reforms and a proposed price-data scheme$t$, $t$to national fuel market reforms and a proposed price data scheme$t$);
SELECT pg_temp.swap(5275, $t$argued that better-off pensioners$t$, $t$argued that better off pensioners$t$);
-- member 5276
SELECT pg_temp.swap(5276, $t$Hartlepool by-election defeat$t$, $t$Hartlepool byelection defeat$t$);
SELECT pg_temp.swap(5276, $t$Burnham's clear-out of$t$, $t$Burnham's clearout of$t$);
SELECT pg_temp.swap(5276, $t$offered better long-term value$t$, $t$offered better long term value$t$);
SELECT pg_temp.swap(5276, $t$with the local-government department$t$, $t$with the local government department$t$);
SELECT pg_temp.swap(5276, $t$reserving lower-value competitions$t$, $t$reserving lower value competitions$t$);
SELECT pg_temp.swap(5276, $t$could be delivered in-house.$t$, $t$could be delivered in house.$t$);
SELECT pg_temp.swap(5276, $t$prepare five-year insourcing$t$, $t$prepare five year insourcing$t$);
SELECT pg_temp.swap(5276, $t$been brought in-house because$t$, $t$been brought in house because$t$);
SELECT pg_temp.swap(5276, $t$year of central-government spending$t$, $t$year of central government spending$t$);
SELECT pg_temp.swap(5276, $t$The local-contract reform$t$, $t$The local contract reform$t$);
-- member 5279
SELECT pg_temp.swap(5279, $t$strengthened a cross-party motion$t$, $t$strengthened a cross party motion$t$);
SELECT pg_temp.swap(5279, $t$becoming carbon-neutral$t$, $t$becoming carbon neutral$t$);
SELECT pg_temp.swap(5279, $t$additional mental-health and nursery$t$, $t$additional mental health and nursery$t$);
SELECT pg_temp.swap(5279, $t$practical, council-rooted form$t$, $t$practical, council rooted form$t$);
SELECT pg_temp.swap(5279, $t$control over short-term letting$t$, $t$control over short term letting$t$);
SELECT pg_temp.swap(5279, $t$formal housing-emergency declaration$t$, $t$formal housing emergency declaration$t$);
SELECT pg_temp.swap(5279, $t$participate in water-quality testing$t$, $t$participate in water quality testing$t$);
SELECT pg_temp.swap(5279, $t$by the cut-off date$t$, $t$by the cutoff date$t$);
SELECT pg_temp.swap(5279, $t$introduced a ten-minute rule bill$t$, $t$introduced a ten minute rule bill$t$);
SELECT pg_temp.swap(5279, $t$civilian status or trade-union rights$t$, $t$civilian status or trade union rights$t$);
SELECT pg_temp.swap(5279, $t$For a first-term backbencher$t$, $t$For a first term backbencher$t$);
SELECT pg_temp.swap(5279, $t$second homes and short-term lets$t$, $t$second homes and short term lets$t$);
-- member 5281
SELECT pg_temp.swap(5281, $t$million in 2023-24$t$, $t$million in 2023/24$t$);
SELECT pg_temp.swap(5281, $t$obtained for 2025-26 recorded 32,559 earnings-related overpayments$t$, $t$obtained for 2025/26 recorded 32,559 earnings related overpayments$t$);
SELECT pg_temp.swap(5281, $t$Seventy-eight carers$t$, $t$Seventy eight carers$t$);
SELECT pg_temp.swap(5281, $t$scrutiny and cross-party policy$t$, $t$scrutiny and cross party policy$t$);
-- member 5282
SELECT pg_temp.swap(5282, $t$Labour's pro-building wing$t$, $t$Labour's pro building wing$t$);
SELECT pg_temp.swap(5282, $t$added a cross-government growth$t$, $t$added a cross government growth$t$);
SELECT pg_temp.swap(5282, $t$by credible long-term government$t$, $t$by credible long term government$t$);
SELECT pg_temp.swap(5282, $t$fees. Late-payment interest$t$, $t$fees. Late payment interest$t$);
SELECT pg_temp.swap(5282, $t$In 2025-26 it handled$t$, $t$In 2025/26 it handled$t$);
SELECT pg_temp.swap(5282, $t$first time since 2017-18,$t$, $t$first time since 2017/18,$t$);
SELECT pg_temp.swap(5282, $t$and a two-year real-terms freeze$t$, $t$and a two year real terms freeze$t$);
SELECT pg_temp.swap(5282, $t$a typical first-year saving$t$, $t$a typical first year saving$t$);
SELECT pg_temp.swap(5282, $t$most visible business-rates intervention$t$, $t$most visible business rates intervention$t$);
-- member 5287
SELECT pg_temp.swap(5287, $t$developed foreign-affairs engagement$t$, $t$developed foreign affairs engagement$t$);
-- member 5289
SELECT pg_temp.swap(5289, $t$loss of council-funded youth$t$, $t$loss of council funded youth$t$);
SELECT pg_temp.swap(5289, $t$ministers for long-term funding, a properly trained youth-work profession$t$, $t$ministers for long term funding, a properly trained youth work profession$t$);
SELECT pg_temp.swap(5289, $t$block the disability-benefit legislation$t$, $t$block the disability benefit legislation$t$);
SELECT pg_temp.swap(5289, $t$rail investment pre-dated her$t$, $t$rail investment predated her$t$);
-- member 5290
SELECT pg_temp.swap(5290, $t$flood-prevention investment$t$, $t$flood prevention investment$t$);
SELECT pg_temp.swap(5290, $t$a non-return valve$t$, $t$a non return valve$t$);
SELECT pg_temp.swap(5290, $t$warned that a long-term fix$t$, $t$warned that a long term fix$t$);
SELECT pg_temp.swap(5290, $t$a pro-building but infrastructure-first line$t$, $t$a pro building but infrastructure first line$t$);
SELECT pg_temp.swap(5290, $t$Council's local-plan work$t$, $t$Council's local plan work$t$);
SELECT pg_temp.swap(5290, $t$That is self-reported$t$, $t$That is self reported$t$);
SELECT pg_temp.swap(5290, $t$told ministers that a long-term fix$t$, $t$told ministers that a long term fix$t$);
SELECT pg_temp.swap(5290, $t$£110,000 local-plan support$t$, $t$£110,000 local plan support$t$);
-- member 5291
SELECT pg_temp.swap(5291, $t$Welsh Government cost-of-living money$t$, $t$Welsh Government cost of living money$t$);
SELECT pg_temp.swap(5291, $t$against water-company executives$t$, $t$against water company executives$t$);
SELECT pg_temp.swap(5291, $t$the Ministry of Defence-owned pedestrian route closed$t$, $t$the pedestrian route owned by the Ministry of Defence closed$t$);
SELECT pg_temp.swap(5291, $t$for cross-border research$t$, $t$for cross border research$t$);
SELECT pg_temp.swap(5291, $t$five south-east Wales stations$t$, $t$five south east Wales stations$t$);
SELECT pg_temp.swap(5291, $t$supported a long-running community$t$, $t$supported a long running community$t$);
SELECT pg_temp.swap(5291, $t$agricultural inheritance-tax reform$t$, $t$agricultural inheritance tax reform$t$);
SELECT pg_temp.swap(5291, $t$raised the full-relief threshold$t$, $t$raised the full relief threshold$t$);
-- member 5293
SELECT pg_temp.swap(5293, $t$reducing social-security spending$t$, $t$reducing social security spending$t$);
SELECT pg_temp.swap(5293, $t$a costly by-election$t$, $t$a costly byelection$t$);
SELECT pg_temp.swap(5293, $t$A Labour Friends of Israel-funded visit in May had been registered after the 28-day deadline.$t$, $t$A visit in May funded by Labour Friends of Israel had been registered after the 28 day deadline.$t$);
SELECT pg_temp.swap(5293, $t$assisted-dying legislation$t$, $t$assisted dying legislation$t$);
-- member 5294
SELECT pg_temp.swap(5294, $t$education and trade-union movement$t$, $t$education and trade union movement$t$);
SELECT pg_temp.swap(5294, $t$recognisable trade-union Labour tradition: pro-worker, strongly$t$, $t$recognisable trade union Labour tradition: pro worker, strongly$t$);
SELECT pg_temp.swap(5294, $t$practical law-and-order edge$t$, $t$practical law and order edge$t$);
SELECT pg_temp.swap(5294, $t$a ten-minute rule Bill$t$, $t$a ten minute rule Bill$t$);
SELECT pg_temp.swap(5294, $t$impact of offending — including$t$, $t$impact of offending, including$t$);
SELECT pg_temp.swap(5294, $t$School-building grants$t$, $t$School building grants$t$);
SELECT pg_temp.swap(5294, $t$departmental or city-wide political$t$, $t$departmental or citywide political$t$);
-- member 5295
SELECT pg_temp.swap(5295, $t$public-service delivery$t$, $t$public service delivery$t$);
SELECT pg_temp.swap(5295, $t$over disability-benefit reform$t$, $t$over disability benefit reform$t$);
SELECT pg_temp.swap(5295, $t$examine mental-health waiting lists$t$, $t$examine mental health waiting lists$t$);
SELECT pg_temp.swap(5295, $t$The longer-term outcome$t$, $t$The longer term outcome$t$);
SELECT pg_temp.swap(5295, $t$work on mental-health waiting times$t$, $t$work on mental health waiting times$t$);
SELECT pg_temp.swap(5295, $t$as a policy-focused Labour$t$, $t$as a policy focused Labour$t$);
SELECT pg_temp.swap(5295, $t$original disability-benefit proposals$t$, $t$original disability benefit proposals$t$);
SELECT pg_temp.swap(5295, $t$local social-care policy$t$, $t$local social care policy$t$);
SELECT pg_temp.swap(5295, $t$as a social-policy advocate$t$, $t$as a social policy advocate$t$);
-- member 5298
SELECT pg_temp.swap(5298, $t$winning a by-election to Medway$t$, $t$winning a byelection to Medway$t$);
SELECT pg_temp.swap(5298, $t$and won a by-election, then lost$t$, $t$and won a byelection, then lost$t$);
SELECT pg_temp.swap(5298, $t$become Co-Chair of the All Party$t$, $t$become Joint Chair of the All Party$t$);
-- member 5300
SELECT pg_temp.swap(5300, $t$are pro-NHS, socially$t$, $t$are pro NHS, socially$t$);
SELECT pg_temp.swap(5300, $t$A former critical-care nurse$t$, $t$A former critical care nurse$t$);
SELECT pg_temp.swap(5300, $t$stronger affordable-housing and$t$, $t$stronger affordable housing and$t$);
SELECT pg_temp.swap(5300, $t$than an under-resourced council$t$, $t$than an under resourced council$t$);
SELECT pg_temp.swap(5300, $t$visible on free-vote social$t$, $t$visible on free vote social$t$);
-- member 5305
SELECT pg_temp.swap(5305, $t$other fire-safety defects$t$, $t$other fire safety defects$t$);
SELECT pg_temp.swap(5305, $t$first council-led citizens'$t$, $t$first council led citizens'$t$);
SELECT pg_temp.swap(5305, $t$stands for: a centre-left politics$t$, $t$stands for: a centre left politics$t$);
SELECT pg_temp.swap(5305, $t$lose their special-school places$t$, $t$lose their special school places$t$);
-- member 5306
SELECT pg_temp.swap(5306, $t$over pressure-group politics$t$, $t$over pressure group politics$t$);
SELECT pg_temp.swap(5306, $t$heating and hot-water system$t$, $t$heating and hot water system$t$);
SELECT pg_temp.swap(5306, $t$At the cut-off date$t$, $t$At the cutoff date$t$);
SELECT pg_temp.swap(5306, $t$legislator, policy-maker or administrator$t$, $t$legislator, policymaker or administrator$t$);
-- member 5307
SELECT pg_temp.swap(5307, $t$Westminster's longest-serving MPs$t$, $t$Westminster's longest serving MPs$t$);
SELECT pg_temp.swap(5307, $t$Worthing council by-election$t$, $t$Worthing council byelection$t$);
SELECT pg_temp.swap(5307, $t$during the cost-of-living crisis$t$, $t$during the cost of living crisis$t$);
SELECT pg_temp.swap(5307, $t$advancing a long-dormant site$t$, $t$advancing a long dormant site$t$);
SELECT pg_temp.swap(5307, $t$major disability-benefit restrictions$t$, $t$major disability benefit restrictions$t$);
SELECT pg_temp.swap(5307, $t$Labour's soft-left caucus$t$, $t$Labour's soft left caucus$t$);
SELECT pg_temp.swap(5307, $t$pragmatic soft-left politician$t$, $t$pragmatic soft left politician$t$);
SELECT pg_temp.swap(5307, $t$broad public-health philosophy$t$, $t$broad public health philosophy$t$);
-- member 5308
SELECT pg_temp.swap(5308, $t$President and co-chair of$t$, $t$President and joint chair of$t$);
-- member 5309
SELECT pg_temp.swap(5309, $t$rebuilding post-war new towns$t$, $t$rebuilding postwar new towns$t$);
SELECT pg_temp.swap(5309, $t$became co-chair of the UNISON$t$, $t$became joint chair of the UNISON$t$);
SELECT pg_temp.swap(5309, $t$the public-service trade union$t$, $t$the public service trade union$t$);
SELECT pg_temp.swap(5309, $t$Britain's post-war new towns$t$, $t$Britain's postwar new towns$t$);
SELECT pg_temp.swap(5309, $t$ownership and long-term underinvestment$t$, $t$ownership and long term underinvestment$t$);
SELECT pg_temp.swap(5309, $t$government, local-authority and private-sector action$t$, $t$government, local authority and private sector action$t$);
SELECT pg_temp.swap(5309, $t$institutional and public-safety problem$t$, $t$institutional and public safety problem$t$);
SELECT pg_temp.swap(5309, $t$parliamentary agenda-setting$t$, $t$parliamentary agenda setting$t$);
SELECT pg_temp.swap(5309, $t$completed town-centre redevelopment$t$, $t$completed town centre redevelopment$t$);
SELECT pg_temp.swap(5309, $t$reverse the fire-service proposals$t$, $t$reverse the fire service proposals$t$);
-- member 5312
SELECT pg_temp.swap(5312, $t$ending a 114-year hold$t$, $t$ending a hold of 114 years$t$);
-- member 5315
SELECT pg_temp.swap(5315, $t$labour-movement politics$t$, $t$labour movement politics$t$);
SELECT pg_temp.swap(5315, $t$a trade-union Labour MP$t$, $t$a trade union Labour MP$t$);
SELECT pg_temp.swap(5315, $t$local public-service access$t$, $t$local public service access$t$);
SELECT pg_temp.swap(5315, $t$on guaranteed-hours contracts$t$, $t$on guaranteed hours contracts$t$);
SELECT pg_temp.swap(5315, $t$using low-hour contracts$t$, $t$using low hour contracts$t$);
SELECT pg_temp.swap(5315, $t$avoid guaranteed-hours rights$t$, $t$avoid guaranteed hours rights$t$);
SELECT pg_temp.swap(5315, $t$openly pro-public ownership$t$, $t$openly pro public ownership$t$);
SELECT pg_temp.swap(5315, $t$and public-ownership powers$t$, $t$and public ownership powers$t$);
SELECT pg_temp.swap(5315, $t$keep trade-union employment issues$t$, $t$keep trade union employment issues$t$);
SELECT pg_temp.swap(5315, $t$Max Hall, a 14-year-old constituent with a high-grade brain tumour$t$, $t$Max Hall, a constituent aged 14 with a high grade brain tumour$t$);
SELECT pg_temp.swap(5315, $t$a full-time Corby police station$t$, $t$a full time Corby police station$t$);
SELECT pg_temp.swap(5315, $t$terminal-illness employment protection and wider employment-security agenda$t$, $t$terminal illness employment protection and wider employment security agenda$t$);
SELECT pg_temp.swap(5315, $t$a constituency-rooted labour-movement advocate$t$, $t$a constituency rooted labour movement advocate$t$);
-- member 5317
SELECT pg_temp.swap(5317, $t$Labour 1997-2010, Conservative 2010-2017, Labour 2017-2019, Conservative 2019-2024, Labour 2024$t$, $t$Labour 1997 to 2010, Conservative 2010 to 2017, Labour 2017 to 2019, Conservative 2019 to 2024, Labour 2024$t$);
-- member 5323
SELECT pg_temp.swap(5323, $t$government's disability-benefit legislation$t$, $t$government's disability benefit legislation$t$);
SELECT pg_temp.swap(5323, $t$it was a government-wide funding allocation$t$, $t$it was a government wide funding allocation$t$);
SELECT pg_temp.swap(5323, $t$effective legislator or policy-maker. His school, river, road-safety$t$, $t$effective legislator or policymaker. His school, river, road safety$t$);
-- member 5324
SELECT pg_temp.swap(5324, $t$Northenden (2014-2023)$t$, $t$Northenden (2014 to 2023)$t$);
SELECT pg_temp.swap(5324, $t$was vice-chair of the Wythenshawe$t$, $t$was vice chair of the Wythenshawe$t$);
-- member 5333
SELECT pg_temp.swap(5333, $t$technology and financial-services regulation$t$, $t$technology and financial services regulation$t$);
SELECT pg_temp.swap(5333, $t$availability for first-time buyers$t$, $t$availability for first time buyers$t$);
SELECT pg_temp.swap(5333, $t$clubs, infrastructure-planning reform$t$, $t$clubs, infrastructure planning reform$t$);
SELECT pg_temp.swap(5333, $t$than 12,000 pre-charge decisions$t$, $t$than 12,000 precharge decisions$t$);
SELECT pg_temp.swap(5333, $t$tested weekly case-listing meetings$t$, $t$tested weekly case listing meetings$t$);
SELECT pg_temp.swap(5333, $t$to accelerate domestic-abuse cases$t$, $t$to accelerate domestic abuse cases$t$);
SELECT pg_temp.swap(5333, $t$responsibility for financial-services policy$t$, $t$responsibility for financial services policy$t$);
SELECT pg_temp.swap(5333, $t$absence of long-term results$t$, $t$absence of long term results$t$);
SELECT pg_temp.swap(5333, $t$removal of the two-child benefit limit$t$, $t$removal of the two child benefit limit$t$);
-- member 5334
SELECT pg_temp.swap(5334, $t$liberal, pro-public service wing$t$, $t$liberal, pro public service wing$t$);
SELECT pg_temp.swap(5334, $t$British large-language model$t$, $t$British large language model$t$);
SELECT pg_temp.swap(5334, $t$and longer-term competitiveness$t$, $t$and longer term competitiveness$t$);
SELECT pg_temp.swap(5334, $t$by the cut-off there$t$, $t$by the cutoff there$t$);
-- member 5338
SELECT pg_temp.swap(5338, $t$Thetford in 2016-17,$t$, $t$Thetford in 2016/17,$t$);
-- member 5339
SELECT pg_temp.swap(5339, $t$2023 by-election$t$, $t$2023 byelection$t$);
SELECT pg_temp.swap(5339, $t$municipal and deal-based$t$, $t$municipal and deal based$t$);
SELECT pg_temp.swap(5339, $t$51 social-rent homes within a 119-home scheme$t$, $t$51 social rent homes within a 119 home scheme$t$);
SELECT pg_temp.swap(5339, $t$A cross-party scrutiny$t$, $t$A cross party scrutiny$t$);
SELECT pg_temp.swap(5339, $t$the long-term target$t$, $t$the long term target$t$);
SELECT pg_temp.swap(5339, $t$managing-agent regulation$t$, $t$managing agent regulation$t$);
SELECT pg_temp.swap(5339, $t$begin in 2027-28$t$, $t$begin in 2027/28$t$);
SELECT pg_temp.swap(5339, $t$outline-business-case development$t$, $t$outline business case development$t$);
-- member 5341
SELECT pg_temp.swap(5341, $t$her a health-mission "delivery champion"$t$, $t$her a health mission "delivery champion"$t$);
SELECT pg_temp.swap(5341, $t$consistent mental-health assessment$t$, $t$consistent mental health assessment$t$);
SELECT pg_temp.swap(5341, $t$professional and cross-party backing$t$, $t$professional and cross party backing$t$);
SELECT pg_temp.swap(5341, $t$perinatal mental-health services$t$, $t$perinatal mental health services$t$);
-- member 5342
SELECT pg_temp.swap(5342, $t$and short-term rentals$t$, $t$and short term rentals$t$);
SELECT pg_temp.swap(5342, $t$by the cut-off showed$t$, $t$by the cutoff showed$t$);
-- member 5344
SELECT pg_temp.swap(5344, $t$conventional: health-policy scrutiny$t$, $t$conventional: health policy scrutiny$t$);
SELECT pg_temp.swap(5344, $t$without means-testing.$t$, $t$without means testing.$t$);
SELECT pg_temp.swap(5344, $t$minimum 30-minute visits$t$, $t$minimum 30 minute visits$t$);
SELECT pg_temp.swap(5344, $t$A resident-led Disabled$t$, $t$A resident led Disabled$t$);
SELECT pg_temp.swap(5344, $t$led to co-production duties$t$, $t$led to coproduction duties$t$);
SELECT pg_temp.swap(5344, $t$in the seven-year campaign$t$, $t$in the seven year campaign$t$);
SELECT pg_temp.swap(5344, $t$part of a trust-wide estate$t$, $t$part of a trust wide estate$t$);
SELECT pg_temp.swap(5344, $t$an Australian-style prohibition on social-media accounts$t$, $t$an Australian style prohibition on social media accounts$t$);
SELECT pg_temp.swap(5344, $t$a large cross-party campaign$t$, $t$a large cross party campaign$t$);
SELECT pg_temp.swap(5344, $t$His trade-envoy work$t$, $t$His trade envoy work$t$);
SELECT pg_temp.swap(5344, $t$a national policy-maker or$t$, $t$a national policymaker or$t$);
-- member 5348
SELECT pg_temp.swap(5348, $t$through international-development campaigning$t$, $t$through international development campaigning$t$);
SELECT pg_temp.swap(5348, $t$internationalist, pro-aid tradition$t$, $t$internationalist, pro aid tradition$t$);
SELECT pg_temp.swap(5348, $t$trade agreement, market-access concession$t$, $t$trade agreement, market access concession$t$);
SELECT pg_temp.swap(5348, $t$at the business-case stage$t$, $t$at the business case stage$t$);
SELECT pg_temp.swap(5348, $t$with a town-centre health campus$t$, $t$with a town centre health campus$t$);
SELECT pg_temp.swap(5348, $t$treatment and joined-up community$t$, $t$treatment and joined up community$t$);
SELECT pg_temp.swap(5348, $t$The trade-envoy appointment$t$, $t$The trade envoy appointment$t$);
-- member 5349
SELECT pg_temp.swap(5349, $t$access to weight-management treatment$t$, $t$access to weight management treatment$t$);
SELECT pg_temp.swap(5349, $t$cover day-to-day spending using asset-sale proceeds$t$, $t$cover day to day spending using asset sale proceeds$t$);
SELECT pg_temp.swap(5349, $t$retain the half-hourly Gloucester$t$, $t$retain the half hourly Gloucester$t$);
SELECT pg_temp.swap(5349, $t$government and cross-party support$t$, $t$government and cross party support$t$);
SELECT pg_temp.swap(5349, $t$£20 million in long-term Pride in Place$t$, $t$£20 million in long term Pride in Place$t$);
SELECT pg_temp.swap(5349, $t$legislator or policy-maker$t$, $t$legislator or policymaker$t$);
-- member 5351
SELECT pg_temp.swap(5351, $t$won the new cross-county constituency$t$, $t$won the new cross county constituency$t$);
SELECT pg_temp.swap(5351, $t$than the average first-term MP$t$, $t$than the average first term MP$t$);
SELECT pg_temp.swap(5351, $t$that crosses the Hampshire-Surrey boundary$t$, $t$that crosses the Hampshire and Surrey boundary$t$);
-- member 5353
SELECT pg_temp.swap(5353, $t$its narrower third-reading vote$t$, $t$its narrower third reading vote$t$);
SELECT pg_temp.swap(5353, $t$demanded a Cornwall-only arrangement$t$, $t$demanded a Cornwall only arrangement$t$);
SELECT pg_temp.swap(5353, $t$said her long-term aim$t$, $t$said her long term aim$t$);
SELECT pg_temp.swap(5353, $t$crossings were council-owned, user-funded and$t$, $t$crossings were council owned, user funded and$t$);
-- member 5359
SELECT pg_temp.swap(5359, $t$with an 18-vote majority$t$, $t$with an 18 vote majority$t$);
-- member 5360
SELECT pg_temp.swap(5360, $t$an employment-first approach$t$, $t$an employment first approach$t$);
SELECT pg_temp.swap(5360, $t$about disability-benefit cuts$t$, $t$about disability benefit cuts$t$);
SELECT pg_temp.swap(5360, $t$him by the cut-off date$t$, $t$him by the cutoff date$t$);
SELECT pg_temp.swap(5360, $t$administrator or policy-maker$t$, $t$administrator or policymaker$t$);
SELECT pg_temp.swap(5360, $t$and alliance-building$t$, $t$and alliance building$t$);
-- member 5449
SELECT pg_temp.swap(5449, $t$then the fee-paying High School$t$, $t$then the fee paying High School$t$);
SELECT pg_temp.swap(5449, $t$She began a part-time PhD$t$, $t$She began a part time PhD$t$);
SELECT pg_temp.swap(5449, $t$consolidates the anti-SNP vote$t$, $t$consolidates the anti SNP vote$t$);
SELECT pg_temp.swap(5449, $t$select a London-educated, internationally focused, Palestine-activist barrister$t$, $t$select a London educated, internationally focused, Palestine activist barrister$t$);
-- member 5484
SELECT pg_temp.swap(5484, $t$St Pancras by-election$t$, $t$St Pancras byelection$t$);
SELECT pg_temp.swap(5484, $t$a five-year housing investment$t$, $t$a five year housing investment$t$);
SELECT pg_temp.swap(5484, $t$280 family-sized homes$t$, $t$280 family sized homes$t$);
SELECT pg_temp.swap(5484, $t$poor record-keeping$t$, $t$poor record keeping$t$);
SELECT pg_temp.swap(5484, $t$first-stage complaints$t$, $t$first stage complaints$t$);
SELECT pg_temp.swap(5484, $t$October 2026 by-election$t$, $t$October 2026 byelection$t$);

COMMIT;
