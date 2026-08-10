import type { EditorialEntry } from './types';

// Investigation: government housing targets raised above what water companies'
// resource plans can supply across southern England. Fact-checked 2026-08-02 against
// real sources this session: Tonbridge & Malling local plan 19,746 homes vs South
// East Water's 6,318 (diff 13,428), Tugendhat "completely irresponsible" (Commons);
// SEW WRMP 2024 on 2023 housing data, replacement due 2029; Basingstoke & Deane
// 830->1,150, Surrey Hills pipeline funding rejected; East Hampshire 574->1,142 (Dec
// 2024), recalculated 1,119, legal advice ~828 outside SDNP; SEW June 2026
// restrictions were treatment/distribution not raw water; Oxford sewage — interim
// 2027 / full upgrade 2031, Susan Brown, EA objection across Oxford/Cherwell/South
// Oxon/Vale of White Horse; CCN survey 21 responses, none supportive, 94% excessive,
// nine in ten infrastructure; net additional dwellings 208,600 in 2024/25 (-6% from
// 221,410); Commons Library/OBR ~1m, Savills ~840k. Angela Rayner CONFIRMED reappointed
// housing secretary by Burnham (20-21 July 2026), so her 25 July 2026 Today interview
// stands. Offsite source hyperlinks stripped -> plain text (house rule).
const piece: EditorialEntry = {
  slug: 'hw9k4mxq2t',
  kicker: 'Housing and Infrastructure',
  headline: 'Housing Targets Rise Beyond the Capacity of Local Water Supplies',
  standfirst:
    'The government raised housing targets across southern England after water companies had already fixed what their networks could supply. The gap is now surfacing in local plans from Kent to Oxfordshire.',
  publishedAt: '2026-08-02',
  authorByline: 'opengovt',
  body: [
    { type: 'paragraph', text: 'The government increased housing targets across southern England after water companies had finished deciding what their networks could supply.' },
    { type: 'paragraph', text: 'The consequences are now appearing in local plans. Tonbridge and Malling must make provision for almost 20,000 homes, while South East Water says its current resource plan can accommodate 6,318. Basingstoke is waiting for a pipeline that has not been built. Around Oxford, inadequate sewage capacity has threatened delays to at least 10,000 homes.' },
    { type: 'paragraph', text: 'These are not identical problems. Some areas lack sustainable water resources. Others lack treatment works, pipelines or sewage capacity. What connects them is that housing requirements have risen faster than the infrastructure plans intended to support them.' },
    { type: 'paragraph', text: 'The government wants 1.5 million homes built in England during this parliament. In Tonbridge and Malling, the borough’s emerging local plan must provide for 19,746 homes between 2024 and 2042.' },
    { type: 'paragraph', text: 'South East Water told the council that its current plan could accommodate 6,318 additional homes over that period. The difference is 13,428.' },
    { type: 'paragraph', text: 'Tom Tugendhat, the Conservative MP for Tonbridge, told the Commons it was “completely irresponsible” to pursue the higher housing figure while the water shortfall remained unresolved.' },
    { type: 'paragraph', text: 'The problem lies partly in the timing. South East Water’s current Water Resources Management Plan was completed in 2024 using housing information from 2023. The government subsequently changed the method used to calculate housing need, increasing the number of homes expected in many areas served by the company.' },
    { type: 'paragraph', text: 'Nick Price, South East Water’s head of water resources, said the current plan did not account for those higher figures. Work has begun on its replacement, but that plan is not due to be published until 2029.' },
    { type: 'paragraph', text: 'By then, the parliamentary period during which ministers want 1.5 million homes delivered will be ending.' },

    { type: 'heading', level: 2, text:'A pipeline that never arrived' },
    { type: 'paragraph', text: 'In Basingstoke and Deane, the annual housing figure rose from 830 to 1,150.' },
    { type: 'paragraph', text: 'South East Water had proposed a pipeline from the Surrey Hills to increase the amount of water available to the area by 2030. The company says the project has not been delivered after its proposed funding was initially rejected by the regulator.' },
    { type: 'paragraph', text: 'There is no indication that the pipeline will be available in time to support the higher housing figure.' },
    { type: 'paragraph', text: 'Paul Harvey, the Independent leader of Basingstoke and Deane Borough Council, said the government was demanding growth without resolving the physical limits on supply.' },
    { type: 'paragraph', text: '“We cannot magic up more water,” he said. “They say ‘build, baby, build’ but it is something we cannot just wave a wand and do.”' },
    { type: 'paragraph', text: 'The council’s water cycle study warned that demand created by new housing could exceed the limits of sustainable supply. Concerns raised by Natural England and the Environment Agency about water resources and the effects of further abstraction on protected habitats have complicated the council’s attempt to produce a local plan capable of passing examination.' },
    { type: 'paragraph', text: 'The issue is not simply whether water comes out of the tap today. A council must consider whether sufficient water can be supplied throughout the life of its plan without damaging rivers, wetlands and aquifers or placing existing customers at greater risk during dry weather.' },
    { type: 'paragraph', text: 'Neighbouring East Hampshire shows how quickly the assumptions have moved. Its standard-method figure rose from 574 to 1,142 homes a year in December 2024, an increase of almost 100 per cent.' },
    { type: 'paragraph', text: 'The figure was subsequently recalculated at 1,119. Legal advice commissioned by the council supported a figure of about 828 for the area outside the South Downs National Park.' },
    { type: 'paragraph', text: 'South East Water’s current resource plan was prepared before those increases.' },

    { type: 'heading', level: 2, text:'Water in the ground but not in the pipes' },
    { type: 'paragraph', text: 'The constraint is not always a shortage of raw water.' },
    { type: 'paragraph', text: 'When South East Water introduced restrictions in June 2026, it said its raw-water levels were healthy. The immediate problem was that treatment works and the distribution network could not process and move enough water to meet demand.' },
    { type: 'paragraph', text: 'That distinction matters. Water can exist in reservoirs or aquifers while remaining unavailable to households because treatment plants, pumping stations and pipes lack the required capacity.' },
    { type: 'paragraph', text: 'Building homes adds demand throughout the year and increases pressure during hot, dry periods. Expanding the network may require new treatment equipment, storage facilities, pumping stations and pipelines. Those projects cannot be delivered through a change in planning policy alone.' },
    { type: 'paragraph', text: 'Similar concerns have arisen across Hampshire, Kent, Hertfordshire, Essex and Cambridgeshire. The details differ, but the conflict is the same: councils are being told to identify more land for housing while the infrastructure needed to serve it remains unfunded, delayed or based on older growth assumptions.' },

    { type: 'heading', level: 2, text:'At least 10,000 homes affected around Oxford' },
    { type: 'paragraph', text: 'In Oxfordshire, the main problem is sewage rather than drinking-water supply.' },
    { type: 'paragraph', text: 'Oxford City Council warned in 2024 that insufficient sewage-treatment capacity could affect more than 4,000 homes in the city and at least 10,000 across the wider area served by the Oxford treatment works.' },
    { type: 'paragraph', text: 'The warning also covered more than 500,000 square metres of proposed commercial development.' },
    { type: 'paragraph', text: 'The Environment Agency objected to planning proposals because Thames Water’s network could not demonstrate that it could accept the additional sewage without increasing the risk of pollution. The difficulty affected development planned across Oxford, Cherwell, South Oxfordshire and the Vale of White Horse.' },
    { type: 'paragraph', text: 'Susan Brown, the leader of Oxford City Council, called the lack of investment “a source of huge frustration and anger”.' },
    { type: 'paragraph', text: 'Thames Water said initial improvements were expected by 2027, with the full expansion of the treatment works due by 2031. That left councils and developers attempting to plan homes several years before the complete solution was expected to be available.' },
    { type: 'paragraph', text: 'The Oxford example shows why granting planning permission is not the same as making a development possible. Homes cannot be occupied safely if the sewerage network lacks capacity to carry and treat the waste they produce.' },

    { type: 'heading', level: 2, text:'Water companies have no planning veto' },
    { type: 'paragraph', text: 'Water companies do not have to be consulted on every ordinary planning application.' },
    { type: 'paragraph', text: 'They may comment on proposals, provide evidence for local plans and require technical work before connecting a development. They also have statutory duties under water legislation. They do not, however, possess a veto over planning permission.' },
    { type: 'paragraph', text: 'Price said South East Water’s absence from the statutory-consultee list meant there was no automatic requirement for councils to seek its view before approving additional housing.' },
    { type: 'paragraph', text: 'That creates an obvious weakness. A council can assess an application against its planning policies without being required to obtain a current statement from the company expected to provide the water.' },
    { type: 'paragraph', text: 'The company still has a duty to connect new domestic properties as they are built. That does not guarantee that the wider infrastructure required to serve thousands of additional homes has already been funded or constructed.' },

    { type: 'heading', level: 2, text:'Councils warned about missing infrastructure' },
    { type: 'paragraph', text: 'The County Councils Network surveyed its members after the government proposed its revised housing method in 2024.' },
    { type: 'paragraph', text: 'None of the 21 councils that responded supported the housing figure calculated for its area. Ninety-four per cent described the figures as excessive, while nine in ten said the absence of supporting infrastructure was a barrier to delivery.' },
    { type: 'paragraph', text: 'Those objections were not confined to water. Councils also raised roads, schools, health services and public transport. Water differs from many of those services because supply can be limited by environmental law and by the amount that can be extracted sustainably from a particular river or aquifer.' },
    { type: 'paragraph', text: 'Angela Rayner told BBC Radio 4’s Today programme on 25 July 2026 that the 1.5 million target had been “very challenging” when it was set and was “even more challenging” now.' },
    { type: 'paragraph', text: 'She compared the task with completing the London Marathon in under five hours.' },
    { type: 'paragraph', text: 'The latest confirmed figures show how far the rate of construction has fallen behind the government’s ambition. England recorded 208,600 net additional homes in 2024/25, down 6 per cent from 221,410 the previous year. It was the lowest annual total since 2015/16.' },
    { type: 'paragraph', text: 'Forecasts suggest that the 1.5 million target will be missed. A House of Commons Library calculation based on Office for Budget Responsibility projections put delivery at roughly one million homes over the parliament. Savills forecast about 840,000.' },
    { type: 'paragraph', text: 'High borrowing costs, construction prices, weak demand and the availability of planning permission all contribute to that shortfall. Ministers can attempt to influence those pressures through tax, spending, planning rules and housing policy.' },
    { type: 'paragraph', text: 'Water infrastructure follows a slower timetable.' },
    { type: 'paragraph', text: 'Reservoirs, pipelines, treatment works and sewage upgrades can take years to design, fund, approve and build. Several projects intended to provide additional capacity have been delayed, rejected for funding or scheduled years after the increased housing requirements begin to apply.' },
    { type: 'paragraph', text: 'Greater water efficiency could help. New homes can be designed to consume less drinking water, while rainwater collection and recycled grey water can reduce demand. Accelerated investment could release more capacity.' },
    { type: 'paragraph', text: 'Neither is an instant solution. The homes are being placed in local plans now, while some of the infrastructure needed to support them will not arrive until the end of the decade or later.' },
    { type: 'paragraph', text: 'Ministers have said infrastructure will accompany new housing. What they have not published is an assessment showing how much additional water and sewage capacity each affected area requires, what projects will provide it, how much those projects will cost and when they will be ready.' },
    { type: 'paragraph', text: 'That leaves councils preparing housing plans against one set of numbers while water companies continue working from another.' },
    { type: 'paragraph', text: 'In Tonbridge and Malling, the published difference is stark. Provision must be made for 19,746 homes. South East Water says its current resource plan can accommodate 6,318.' },
    { type: 'paragraph', text: 'The difference cannot be removed by granting more planning permissions.' },

    { type: 'heading', level: 2, text:'Sources' },
    { type: 'paragraph', text: 'South East Water evidence on Tonbridge and Malling supply capacity and comments from Nick Price, head of water resources, reported by BBC South East, July 2026.' },
    { type: 'paragraph', text: 'Tom Tugendhat MP, Commons statement concerning housing targets and water capacity, Hansard, July 2026.' },
    { type: 'paragraph', text: 'Fiona Harvey, “We cannot magic up more water: the supply problems putting housing targets in England at risk”, The Guardian, 2 August 2026.' },
    { type: 'paragraph', text: 'Basingstoke and Deane Borough Council, Draft Water Cycle Study and Local Plan evidence, 2025.' },
    { type: 'paragraph', text: 'East Hampshire District Council, housing-figure announcements and legal advice, December 2024 and April 2025.' },
    { type: 'paragraph', text: 'South East Water, public statements concerning June 2026 restrictions and treatment and distribution capacity.' },
    { type: 'paragraph', text: 'Oxford City Council statement on sewage capacity, including the potential effect on development across the Oxford treatment area.' },
    { type: 'paragraph', text: 'County Councils Network survey of proposed housing figures, 2024.' },
    { type: 'paragraph', text: 'Angela Rayner interview, BBC Radio 4 Today, 25 July 2026.' },
    { type: 'paragraph', text: 'Ministry of Housing, Communities and Local Government, Housing supply: net additional dwellings, England, 2024 to 2025.' },
    { type: 'paragraph', text: 'House of Commons Library housing-supply briefing and Office for Budget Responsibility projections.' },
    { type: 'paragraph', text: 'Savills residential development forecasts.' },
  ],
  evidence: {
    recordsReviewed: [
      'South East Water evidence on Tonbridge and Malling (19,746 homes vs 6,318 capacity); Nick Price comments, via BBC South East, July 2026',
      'Tom Tugendhat MP, Commons statement, Hansard, July 2026',
      'Fiona Harvey, "We cannot magic up more water…", The Guardian, 2 August 2026',
      'Oxford City Council statement on sewage-treatment capacity, 2024',
      'County Councils Network survey of proposed housing figures, 2024',
      'MHCLG, Housing supply: net additional dwellings, England, 2024 to 2025',
      'Angela Rayner interview, BBC Radio 4 Today, 25 July 2026',
    ],
    lastChecked: '2026-08-02',
  },
};

export default piece;
