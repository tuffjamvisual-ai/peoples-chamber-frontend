export type PartyPosition = {
  party: string;
  colour: string;
  position: string;
};

export type Department = {
  slug: string;
  name: string;
  shortName: string;
  minister: string;
  ministerParty: string;
  ministerPhoto: string;
  controlZones: string[];
  description: string;
  partyPositions: PartyPosition[];
};

export const departments: Department[] = [
  {
    slug: 'treasury',
    name: 'HM Treasury',
    shortName: 'Treasury',
    minister: 'Rachel Reeves',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4611/Thumbnail',
    controlZones: ['Income Tax', 'National Insurance', 'VAT', 'The Budget', 'Pensions', 'Banks', 'Inflation', 'Cost of Living'],
    description: 'Controls the nation\'s finances, sets tax rates, manages public spending and economic policy.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Maintaining fiscal rules with debt falling as share of GDP. Raised employer National Insurance by 1.2% to £15bn. Froze income tax thresholds until 2028. Windfall tax on oil and gas companies. Scrapped planned income tax rise after public backlash.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Cut taxes for workers and businesses. Scrap net zero levies saving families £165/year. Oppose NI rise which costs businesses £5bn. Reverse fiscal drag by unfreezing tax thresholds. Pro-growth economic agenda with deregulation.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Raise income tax threshold to £20,000 taking millions out of tax. Abolish inheritance tax for estates under £2m. Cut corporation tax for small businesses. No new stealth taxes. Slash government waste to fund tax cuts.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Windfall tax on banks making excess profits. Wealth tax on assets over £10m. Invest in public services over tax cuts. Reform business rates to support high street. Oppose fiscal drag and frozen thresholds.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Wealth tax on the super-rich. Financial transaction tax on City trades. End fossil fuel subsidies. Fund public services through progressive taxation. Scrap VAT on home insulation and repairs.' },
      { party: 'SNP', colour: '#fff200', position: 'Full fiscal autonomy for Scotland. Oppose UK-wide austerity. Invest in public services not tax cuts for the wealthy. End the two-child benefit cap. Scrap the freeze on income tax thresholds.' },
    ]
  },
  {
    slug: 'home-office',
    name: 'Home Office',
    shortName: 'Home Office',
    minister: 'Shabana Mahmood',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4406/Thumbnail',
    controlZones: ['Policing', 'Small Boats', 'Immigration', 'Passports', 'Counter-Terrorism', 'Visas', 'Drugs', 'Crime'],
    description: 'Responsible for immigration, policing, counter-terrorism and keeping the public safe.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Increased skilled worker visa salary thresholds. New returns agreements with countries to deport failed asylum seekers. Border Security Command with 1,000 new officers. Crackdown on illegal working. Processing asylum claims faster to clear backlog.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Reinstate Rwanda scheme or equivalent. Leave ECHR to deport criminals. Reduce net migration to sustainable levels. More police on streets. Tougher sentences for knife crime. Publish grooming gang offender ethnicity data.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Deport 600,000 illegal immigrants. Leave ECHR. Zero illegal immigration. End asylum hotels saving £8m per day. Abolish ILR. 5-year renewable visas only. 20,000 more police. Zero tolerance on street crime and drug dealing.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Safe and legal routes for asylum seekers. Work with EU on returns. Oppose Rwanda scheme. More community policing. Reform drug laws including cannabis decriminalisation. Treat addiction as health issue not criminal.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Migrants and refugees welcome. Stop the boats through safe legal routes. Decriminalise drug possession. End hostile environment policy. Abolish immigration detention. Reform police accountability.' },
      { party: 'SNP', colour: '#fff200', position: 'Immigration policy should be devolved to Scotland. Oppose Rwanda scheme. Scotland needs immigration for economic growth. End indefinite detention. Safe legal routes for refugees. More powers for Scottish police.' },
    ]
  },
  {
    slug: 'health',
    name: 'Health & Social Care',
    shortName: 'Health',
    minister: 'Wes Streeting',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4761/Thumbnail',
    controlZones: ['NHS', 'Doctors Pay', 'Hospital Waiting Lists', 'Dentists', 'Care Homes', 'Mental Health', 'Social Care'],
    description: 'Oversees the NHS, public health, social care and mental health services across England.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: '40,000 more weekly NHS appointments. Shift from hospital to community care. Hire 8,500 mental health workers. Fix the NHS\'s "broken" state by working with private sector where needed. Dental recovery plan with 700,000 more NHS appointments.' },
      { party: 'Conservative', colour: '#0087dc', position: 'More choice in healthcare including private provision. Reform NHS productivity. Cut management bloat. Faster access to mental health services. Fix social care with cross-party agreement. Oppose NHS strikes causing waiting list backlogs.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Extra £17bn for NHS by cutting wasteful public spending. Scrap non-jobs and diversity roles. Merge NHS England with DHSC saving £500m. No water fluoridation. Oppose mandatory vaccines. Restore NHS to basics of patient care.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: '8,000 more GPs. Mental health MOT for all. Dental check-ups on NHS. £3.5bn for social care. Give NHS workers above-inflation pay rises. 24/7 mental health crisis lines. Cancer waiting time targets restored.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Fully fund NHS through wealth taxes. End PFI contracts. Bring NHS services back in-house. Mental health on equal footing with physical health. National Care Service publicly owned and funded. 4-day working week for NHS staff.' },
      { party: 'SNP', colour: '#fff200', position: 'NHS Scotland free from England\'s marketisation. Oppose privatisation. Mental health parity. Free prescriptions. Free personal care for elderly. More funding from Barnett consequentials to clear waiting lists.' },
    ]
  },
  {
    slug: 'energy',
    name: 'Energy Security & Net Zero',
    shortName: 'Energy',
    minister: 'Ed Miliband',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4259/Thumbnail',
    controlZones: ['Gas Bills', 'Electric Bills', 'Wind Farms', 'Nuclear Power', 'Net Zero 2050', 'Oil & Gas Licenses', 'Green Levies'],
    description: 'Responsible for energy supply, climate change targets and the transition to clean energy.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Great British Energy - publicly owned clean energy company. Ban new North Sea oil and gas licences. 100% clean electricity by 2030. Enough offshore wind to power every home. Warm Homes Plan insulating 5m homes. GB Energy headquarters in Aberdeen.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Reverse ban on new North Sea licences to lower bills. Scrap Climate Change Act and net zero levies saving families £165/year. End 2030 ban on petrol cars. Build more nuclear. Cheap energy through domestic production not expensive renewables.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Scrap all net zero policies. Abolish ULEZ and low traffic neighbourhoods. Stop all new wind farm subsidies. Drill more North Sea oil. Remove green levies from all bills. Net zero is economic suicide. Energy independence through fossil fuels.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Legally binding 2045 net zero target. 80% renewable electricity by 2030. Home insulation revolution. Reform energy market to cut bills. Tax companies missing carbon targets. No new North Sea licences.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Emergency climate programme. No new fossil fuels. 100% renewable by 2030. Green New Deal creating 1m jobs. End aviation expansion. Free home insulation for all. End gas boilers by 2025. Tax frequent flyers.' },
      { party: 'SNP', colour: '#fff200', position: 'Scotland already gets 100% electricity from renewables. Full control of North Sea revenues for Scotland. Net zero by 2045. Oppose new oil licences. Invest in green hydrogen and offshore wind. Energy policy should be fully devolved.' },
    ]
  },
  {
    slug: 'education',
    name: 'Education',
    shortName: 'Education',
    minister: 'Bridget Phillipson',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4845/Thumbnail',
    controlZones: ['Schools', 'Teachers', 'University Fees', 'Student Loans', 'Childcare', 'SATs', 'Academies', 'OFSTED'],
    description: 'Oversees schools, further education, universities and childcare across England.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: '6,500 new teachers. VAT on private schools to fund state education. 3,000 new nurseries. Mental health counsellors in every secondary school. Curriculum review. Breakfast clubs in every primary school. Raise school standards in deprived areas.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Oppose VAT on private schools. Double apprenticeship funding. Scrap real interest rates on student loans. 100,000 more apprenticeships. Keep grammar schools. Oppose dumbing down of exams. Restore discipline in classrooms.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Scrap VAT on private schools. Remove ideology from classrooms - no gender theory or critical race theory. Back to basics curriculum. Restore grammar schools. Scrap student loan system. Introduce vocational alternatives to university.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Scrap university tuition fees and replace with graduate contribution. 8% pay rise for teachers. Mental health first aiders in every school. 35-hour free childcare for all. SEND funding overhaul. Oppose Ofsted single-word judgements.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Abolish tuition fees. Free childcare from 9 months. Scrap Ofsted and replace with school improvement service. Living wage for all school staff. Teach climate and sustainability in all subjects. End academisation.' },
      { party: 'SNP', colour: '#fff200', position: 'Free university tuition in Scotland. More investment in early years. Gaelic and Scots language teaching. Scottish curriculum not Westminster\'s. Childcare expansion. Oppose academies and free schools north of the border.' },
    ]
  },
  {
    slug: 'work-pensions',
    name: 'Work & Pensions',
    shortName: 'DWP',
    minister: 'Liz Kendall',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4026/Thumbnail',
    controlZones: ['Universal Credit', 'Job Centres', 'Disability Benefits', 'PIP', 'State Pension', 'Winter Fuel', 'Benefits'],
    description: 'Manages welfare benefits, pensions, employment support and disability payments.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Cut winter fuel payment to pensioners earning over £11,500 - reversed after backlash, now restored for all. Welfare reform to get more people into work. PIP reform causing controversy. £1bn employment support. Triple lock pension maintained.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Maintain triple lock pension. Reverse winter fuel payment cut. Reform welfare to make work pay. Cap benefits increases. Tougher PIP assessments to reduce fraud. Work coaches for Universal Credit claimants. Back Business in employing disabled people.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Benefits only for those who genuinely cannot work. Tougher fraud crackdown saving billions. Require community work for able-bodied benefit claimants. Protect state pension triple lock. Remove winter fuel means test. Deport foreign nationals claiming benefits.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Scrap two-child benefit limit. Restore winter fuel payment to all. £25/week disability premium. Overhaul PIP assessment - make it humane. Give carers a proper break. Triple lock plus - raise pension above inflation.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Universal Basic Income pilots. Scrap two-child limit. End sanctions regime. Humane PIP assessment. Real living wage. 4-day week. End zero-hours contracts. Raise minimum wage significantly. Support disabled people properly.' },
      { party: 'SNP', colour: '#fff200', position: 'Scrap two-child limit. Scottish Child Payment - most generous in UK at £26.70/week. Oppose welfare cuts. Full devolution of benefits to Scotland. Oppose PIP reforms. Protect triple lock. Restore winter fuel for all Scottish pensioners.' },
    ]
  },
  {
    slug: 'transport',
    name: 'Transport',
    shortName: 'Transport',
    minister: 'Heidi Alexander',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4147/Thumbnail',
    controlZones: ['Trains', 'HS2', 'Railways', 'Potholes', 'Smart Motorways', 'Buses', 'Driving Licences', 'E-bikes', 'Roads'],
    description: 'Responsible for roads, railways, buses, aviation and transport infrastructure.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Nationalise railways - Great British Railways. Bus franchising powers for local areas. Cancel HS2 northern extension confirmed. Fix potholes - £8.3bn road investment. Remove smart motorway hard shoulders. Boost cycling and walking infrastructure.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Fix potholes - biggest road investment in a generation. Scrap smart motorways as dangerous. Keep private rail operators for efficiency. Oppose bus franchising. Maintain M25 capacity. Scrap Low Traffic Neighbourhoods that harm businesses.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Fix potholes immediately - national disgrace. Scrap all smart motorways. Remove ULEZ cameras. Abolish Low Traffic Neighbourhoods. No more bike lanes that block traffic. Build more roads. Scrap HS2 entirely and use money for roads.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Restore Northern HS2 extension. Free bus passes for under 25s. Nationalise railways. More cycling infrastructure. Cut domestic flights where rail is available. Expand Heathrow only if climate targets met. Fix rural transport links.' },
      { party: 'Green Party', colour: '#02a95b', position: 'No more road building. Nationalise railways with low fares. Free buses. End airport expansion. 20mph default in towns. Massive cycling investment. Scrap HS2, use money for local transport. Ban new petrol cars by 2030.' },
      { party: 'SNP', colour: '#fff200', position: 'ScotRail already nationalised. Free bus travel for under 22s and over 60s. Oppose airport expansion. More investment in Highland rail. Full transport powers devolved. Oppose smart motorways as dangerous.' },
    ]
  },
  {
    slug: 'environment',
    name: 'Environment (DEFRA)',
    shortName: 'DEFRA',
    minister: 'Steve Reed',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4268/Thumbnail',
    controlZones: ['Water Companies', 'Sewage', 'Farming', 'Air Quality', 'National Parks', 'Animal Welfare', 'Food Standards'],
    description: 'Responsible for environment, food, rural affairs, water quality and animal welfare.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Water company bosses cannot get bonuses while pumping sewage. New Water Authority to enforce rules. Ban on bonuses until rivers clean. Strengthen Environment Act. Restore nature - 30x30 target. Farming payments for environmental work.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Record fines for water companies breaking rules. £56bn water industry investment plan. ELMS farming payments for environmental work. Oppose water nationalisation as too expensive. Strengthen Ofwat powers. Clean up rivers through regulation not nationalisation.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Take back control of fishing waters from EU legacy rules. Cut farming red tape. Support British farmers not green ideology. Scrap rewilding schemes that take land from farmers. Fix sewage through enforcement not nationalisation.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Nationalise water companies. Criminal charges for water bosses. Restore chalk streams and rivers. Ban sewage dumping with immediate effect. 30x30 nature targets. Ban bee-killing pesticides. Reform farming subsidies for nature.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Nationalise water now. End sewage dumping immediately. Transition to regenerative farming. Rewild 30% of UK. Ban all pesticides harming wildlife. Animal rights legislation. End factory farming. Restore ancient woodlands and peat bogs.' },
      { party: 'SNP', colour: '#fff200', position: 'Scottish Water already publicly owned - proof nationalisation works. Environmental powers should be devolved. Oppose Brexit impacts on Scottish fishing. Ban on GM crops. Protect Scottish salmon rivers. Rewilding Highlands programme.' },
    ]
  },
  {
    slug: 'business-trade',
    name: 'Business & Trade',
    shortName: 'Business',
    minister: 'Jonathan Reynolds',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4269/Thumbnail',
    controlZones: ['High Street', 'Trade Deals', 'Workers Rights', 'Minimum Wage', 'Post Office', 'Small Business', 'Unions'],
    description: 'Supports businesses, negotiates trade deals, protects workers and promotes UK exports.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Employment Rights Bill - biggest workers rights upgrade in a generation. Day one unfair dismissal rights. Ban exploitative zero-hours contracts. Minimum wage raised to £12.21/hour. Reset EU trade relationship. Industrial strategy for growth sectors.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Repeal Employment Rights Bill costing businesses £5bn. Cut business red tape. Reform IR35 for self-employed. Make it easier to open business bank accounts. Prioritise UK firms in procurement. Oppose union power expansion.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Cut business taxes and red tape drastically. End mass employment tribunals. Reform employment law to make hiring easier. Prioritise British workers over imported labour. Scrap diversity quotas. Support small businesses with rate relief.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Reform business rates to save high street. Workers on company boards. Right to flexible working from day one. Living wage as minimum. Support post offices. Single market access through new UK-EU deal. Help small businesses access finance.' },
      { party: 'Green Party', colour: '#02a95b', position: 'End zero-hours contracts. £15 minimum wage. Workers on boards. 4-day working week. End fire and rehire. Break up monopolies. Support cooperatives and mutual ownership. Fair trade deals with human rights conditions.' },
      { party: 'SNP', colour: '#fff200', position: 'Full devolution of employment law to Scotland. Oppose anti-trade union legislation. Scottish Living Wage. Support Scottish businesses through Brexit. Single market access essential for Scottish exporters. Oppose zero-hours contracts.' },
    ]
  },
  {
    slug: 'science-tech',
    name: 'Science, Innovation & Tech',
    shortName: 'Science & Tech',
    minister: 'Peter Kyle',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4804/Thumbnail',
    controlZones: ['AI', 'Broadband', 'Social Media Rules', 'Cyber Security', 'Satellite', 'Space Tech', 'Digital ID', 'Tech Regulation'],
    description: 'Drives innovation, regulates digital technologies, and oversees AI and cyber security.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'AI Safety Institute. Pro-innovation AI regulation not blanket bans. Gigabit broadband rollout. Online Safety Act enforcement. Digital ID optional not mandatory. Invest in semiconductor industry. Tech sector central to growth mission.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Oppose mandatory digital ID - freedom issue. Light-touch AI regulation to stay competitive. Protect children online with tough enforcement. Boost broadband in rural areas. UK as global AI leader. Cyber security investment.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Oppose digital ID entirely - dangerous surveillance. Regulate social media to protect free speech not censor it. Light-touch AI regulation. No censorship algorithms. Oppose Online Safety Act as threat to free expression. Britain must lead in tech not regulate it to death.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Regulate AI with clear ethics framework. Digital rights for citizens. Break up Big Tech monopolies. Full fibre broadband for all by 2030. Online harm to children treated as seriously as offline harm. Digital literacy in schools.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Strict AI regulation including military AI ban. Break up Big Tech. Tax digital giants properly. Stop facial recognition surveillance. Digital rights in constitution. Regulate algorithms. Data owned by citizens not corporations.' },
      { party: 'SNP', colour: '#fff200', position: 'Scottish tech sector investment. Oppose surveillance technology. Digital rights devolved to Scotland. Broadband as essential utility. AI regulation with human rights at centre. Scotland as hub for ethical tech development.' },
    ]
  },
  {
    slug: 'housing',
    name: 'Housing & Communities',
    shortName: 'Housing',
    minister: 'Matthew Pennycook',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4630/Thumbnail',
    controlZones: ['Council Tax', 'House Building', 'Renting Rules', 'Bins', 'Local Services', 'Fire Safety', 'Planning', 'Green Belt'],
    description: 'Oversees housing supply, planning, local government and community services.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Build 1.5m homes in 5 years. Reform planning system. Build on grey belt not just green belt. Renters Reform Bill - end no-fault evictions. Leasehold reform. Mandatory housing targets for councils. First Homes scheme for first-time buyers.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Build more homes but protect green belt. Scrap mandatory housing targets. First Job Bonus for young buyers. Abolish stamp duty on primary residences. Oppose building on green belt. Fix planning system without destroying countryside.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Build on brownfield land only. Protect green belt absolutely. Deport illegal immigrants to free up housing. Scrap diversity rules in planning. Cut immigration to reduce housing demand. Freeze council tax. Oppose high density developments.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: '380,000 new homes per year including social homes. Reform planning for brownfield first. End no-fault evictions now. Rent controls in areas of high pressure. Stamp duty reform. Community land trusts. Fix leasehold scandal.' },
      { party: 'Green Party', colour: '#02a95b', position: '150,000 social homes per year. End right to buy. Rent controls. Insulate all homes. No development on green belt or floodplains. Community ownership of land. Scrap leasehold. End second home ownership tax advantages.' },
      { party: 'SNP', colour: '#fff200', position: 'Scotland builds proportionally more social homes than England. Rent controls introduced in Scotland. Planning powers devolved. Build on brownfield. Oppose Westminster housing targets for Scotland. More powers for Scottish councils.' },
    ]
  },
  {
    slug: 'justice',
    name: 'Justice',
    shortName: 'Justice',
    minister: 'David Lammy',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4036/Thumbnail',
    controlZones: ['Courts', 'Prisons', 'Legal Aid', 'Human Rights Law', 'Sentencing', 'Probation', 'ECHR'],
    description: 'Runs the courts and prison system, oversees legal aid and upholds the rule of law.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Remain in ECHR. Prison capacity crisis - early release scheme to manage overcrowding. Probation reform. Increase legal aid. Faster court processing. End remand for those who won\'t receive custodial sentence. Violence against women and girls strategy.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Leave ECHR to deport foreign criminals. Tougher sentences that stick. Build more prison places. Oppose early release. Mandatory sentencing for knife crime. Publish grooming gang data. Reform Human Rights Act.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Leave ECHR immediately. Deport all foreign national prisoners. Life means life for murder. Mandatory prison for knife crime. End early release scandal. No more soft sentences. Zero tolerance on crime. Restore public trust in justice system.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Stay in ECHR. Reform Legal Aid to make justice accessible. Reduce prison population through rehabilitation. End IPP sentences. Mental health courts. Drug treatment instead of prison. Parole reform. Oppose mandatory sentencing.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Restorative justice over punishment. Reduce prison population dramatically. Decriminalise drugs. Stay in ECHR. Legal aid for all. End private prisons. Oppose mandatory sentencing. Address root causes of crime through social investment.' },
      { party: 'SNP', colour: '#fff200', position: 'Scottish justice system separate. Community Justice Scotland. Lowest prison population in UK as goal. Stay in ECHR. Legal aid protected. Oppose UK-wide mandatory sentences. Mental health courts proven effective in Scotland.' },
    ]
  },
  {
    slug: 'defence',
    name: 'Defence',
    shortName: 'Defence',
    minister: 'John Healey',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/3787/Thumbnail',
    controlZones: ['Army', 'Navy', 'RAF', 'Nuclear Submarines', 'Veterans', 'War Spending', 'NATO', 'Iran', 'Ukraine'],
    description: 'Responsible for the UK\'s armed forces, defence procurement and national security.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Increase defence spending to 2.5% GDP by 2027. AUKUS nuclear submarine deal. Support Ukraine. Maintain nuclear deterrent. Armed Forces Covenant. 13,000 new homes for service personnel. Defence industrial strategy.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Spend 3% GDP on defence now not 2031. Back Israel\'s right to defend itself. Iran attacking British assets demands response. Armed Housing Association for veterans. Oppose Chagos Islands treaty. Greenland sovereignty for its people.' },
      { party: 'Reform UK', colour: '#12b6cf', position: '3% GDP on defence. Strong military deterrence. Back our armed forces. Oppose foreign wars that don\'t serve UK interests. Strong borders. Veterans treated as heroes not forgotten. Rebuild military capability hollowed out by cuts.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: '2% GDP minimum on NATO commitments. Prioritise diplomacy over military action. Back Ukraine fully. Arms embargo on Israel. Strengthen Veterans Commissioner. Oppose AUKUS cost overruns. More diplomatic resources.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Cut defence spending and redirect to public services. Nuclear disarmament. Oppose arms sales to human rights abusers. Diplomacy first always. Pull back from AUKUS. End UK involvement in foreign conflicts. Peace as foreign policy goal.' },
      { party: 'SNP', colour: '#fff200', position: 'Independent Scotland would not host Trident nuclear weapons. Remove Trident from Faslane. Defence spending priorities for Scotland decided in Scotland. Oppose nuclear weapons on moral grounds. Diplomatic solutions to conflicts.' },
    ]
  },
  {
    slug: 'culture',
    name: 'Culture, Media & Sport',
    shortName: 'Culture',
    minister: 'Lisa Nandy',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4472/Thumbnail',
    controlZones: ['BBC Funding', 'Gambling', 'Football Regulators', 'Tourism', 'Arts Funding', 'Broadcasting', 'Libraries'],
    description: 'Supports arts, media, sport and tourism while regulating broadcasting and gambling.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Football Governance Bill - Independent Regulator for football. BBC licence fee review. Gambling reform including stake limits. Arts and culture investment. Free museum entry protected. Support for creative industries after Brexit.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Reform BBC funding model - consider subscription. Football regulator with lighter touch. Gambling reform but not prohibition. Protect free to air major sporting events. Support touring artists post-Brexit. Culture as driver of soft power.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Defund BBC - it is institutionally biased. Scrap licence fee entirely. Football free from government interference. Gambling is personal choice - light regulation. Protect free speech in arts and culture. End woke arts funding.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Reform BBC governance not abolish it. Tougher gambling advertising restrictions. Independent football regulator with real teeth. Arts funding increase. Support grassroots sport. Protect local libraries. Music touring rights with EU.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Fund BBC properly through fair taxation. Ban gambling advertising completely. Football clubs owned by communities. Arts funding as essential public good. Libraries protected. Support grassroots culture not just elite institutions.' },
      { party: 'SNP', colour: '#fff200', position: 'Broadcasting powers devolved to Scotland. Scottish Six news service. Protect BBC Scotland budget. Gambling reform. Support Scottish arts and Gaelic culture. Football governance for Scottish game separate from England.' },
    ]
  },
  {
    slug: 'cabinet-office',
    name: 'Cabinet Office',
    shortName: 'Cabinet Office',
    minister: 'Darren Jones',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4850/Thumbnail',
    controlZones: ['MP Ethics', 'Civil Service', 'Voting Rules', 'Digital ID', 'National Emergencies', 'Electoral Reform'],
    description: 'Supports the Prime Minister and Cabinet, oversees the Civil Service and elections.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Modernise Civil Service. Votes at 16 legislation. Digital ID optional. Lords reform. Ethics rules for ministers. Procurement reform. Reduce government waste. Government digital services improvement. National resilience planning.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Oppose digital ID as freedom threat. Oppose votes at 16 - Labour power grab. Reform Civil Service to cut waste. Oppose Lords reform that removes hereditary peers. Keep First Past the Post. Reduce Whitehall bureaucracy.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Votes at 16 is Labour vote-rigging. Oppose digital ID surveillance. Cut Civil Service by 30%. Abolish quangos. First Past the Post is fine. Bring back hereditary peers if Lords must exist. Remove woke ideology from Civil Service.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Proportional Representation - every vote must count. Votes at 16. Elected Lords. Stronger ethics rules for MPs and ministers. Fixed term parliaments. Right to recall MPs. Digital rights in constitution. Reform honours system.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Proportional representation urgently. Votes at 16. Abolish House of Lords. Citizens assemblies. Right to recall. End party donations from corporations. Lobbyist register. Radical democratic reform. Separate judiciary from executive.' },
      { party: 'SNP', colour: '#fff200', position: 'Scottish Parliament is model of democratic reform. Votes at 16 already in Scotland for Holyrood. Proportional representation. Independence would give Scotland control of own constitution. Lords is undemocratic and should be abolished.' },
    ]
  },
  {
    slug: 'foreign-office',
    name: 'Foreign & Commonwealth',
    shortName: 'Foreign Office',
    minister: 'Yvette Cooper',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/3812/Thumbnail',
    controlZones: ['Iran', 'Middle East', 'Embassies', 'Foreign Aid', 'UK Citizens Abroad', 'Ukraine', 'Trade Diplomacy'],
    description: 'Manages UK foreign policy, diplomatic relations and overseas aid.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Reset relations with EU. Maintain NATO commitments. Support Ukraine. Restore foreign aid towards 0.7% GDP. Pause Chagos Islands treaty. Diplomatic approach to Iran crisis. Two-state solution for Israel-Palestine.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Scrap Chagos Islands treaty as national humiliation. Back Israel fully. Act on Iran attacking British assets. 3% GDP defence. Cut foreign aid to countries that don\'t share UK values. Transatlantic alliance above all.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Scrap foreign aid budget - UK first. Chagos Islands is national humiliation. Stay out of foreign wars. Strong relationship with Trump\'s America. Iran must be confronted not appeased. No more money to corrupt foreign governments.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Restore 0.7% foreign aid target. EU single market access. Arms embargo on Israel. Sanctions on Iran. Multilateral approach to global problems. Climate diplomacy. Protect UK citizens abroad. Rejoin Erasmus.' },
      { party: 'Green Party', colour: '#02a95b', position: 'End arms exports to human rights violators. Full 0.7% aid restored. Sanctions on Israel for Gaza. Diplomatic solution to Iran. Rejoin EU single market. Climate as foreign policy priority. Peace Corps expansion.' },
      { party: 'SNP', colour: '#fff200', position: 'Independent Scotland would rejoin EU. Oppose UK arms to Israel. Scotland would maintain own diplomatic service. Foreign policy should reflect Scottish values not Tory or Labour ideology. Support UN multilateralism.' },
    ]
  },
  {
    slug: 'attorney-general',
    name: 'Attorney General\'s Office',
    shortName: 'Attorney General',
    minister: 'Lord Hermer',
    ministerParty: 'Labour',
    ministerPhoto: '',
    controlZones: ['Government Legal Advice', 'Serious Fraud Office', 'Crown Prosecution Service', 'Rule of Law'],
    description: 'Provides legal advice to government and oversees prosecution of serious crimes.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Independent legal advice to government. SFO reform to tackle serious economic crime. Rule of law paramount. Maintain ECHR obligations. Human rights central to legal framework.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Reform Human Rights Act. Challenge ECHR rulings that conflict with UK law. Stronger SFO powers against fraud. Government must be able to govern without legal challenge at every turn.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Leave ECHR so Attorney General not constrained by foreign courts. Prosecute institutional grooming gang cover-ups. SFO should tackle financial crimes more aggressively. Rule of law means British law not European.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'ECHR must be protected. Attorney General must be independent from political pressure. Legal aid restoration. SFO properly funded. Rule of law above political convenience.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Human rights law must be strengthened not weakened. Environmental law enforcement. Corporate accountability. Climate litigation supported. ECHR essential foundation of rights.' },
      { party: 'SNP', colour: '#fff200', position: 'Scotland has separate Lord Advocate independent of UK Attorney General. Scottish legal system distinct. ECHR essential. Oppose any weakening of human rights law.' },
    ]
  },
  {
    slug: 'scotland-office',
    name: 'Scotland Office',
    shortName: 'Scotland',
    minister: 'Ian Murray',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4090/Thumbnail',
    controlZones: ['Scottish Government Relations', 'Devolution', 'Scottish Parliament', 'Union'],
    description: 'Manages the relationship between the UK Government and Scottish Government.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Strong Union between Scotland and rest of UK. Work constructively with SNP Scottish Government. Devolution settlement stable. No second independence referendum. Invest in Scottish communities through UK-wide programmes.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Strongest Unionist party. No second independence referendum - settled for a generation. Oppose SNP grievance politics. Scotland benefits from UK-wide defence, trade and foreign policy. Make Union case positively.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Strong United Kingdom. No independence referendum. Stop SNP separatism. Scotland benefits enormously from Union. Oppose excessive devolution that weakens UK. Same laws should apply across UK.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Federal UK with stronger devolution. No independence referendum without clear majority. More powers for Scotland within UK. Constructive relationship with Holyrood. Scottish voices heard in Westminster.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Support Scottish independence by democratic vote. Federal UK as minimum. More devolution of powers. Scotland should decide its own future. Respect democratic will of Scottish people.' },
      { party: 'SNP', colour: '#fff200', position: 'Independence is the answer. Scotland office is an obstacle to Scottish democracy. Westminster has no right to block a democratic referendum. Scotland\'s future must be decided in Scotland not London.' },
    ]
  },
  {
    slug: 'wales-office',
    name: 'Wales Office',
    shortName: 'Wales',
    minister: 'Jo Stevens',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4124/Thumbnail',
    controlZones: ['Welsh Government Relations', 'Senedd', 'Devolution', 'Welsh Economy'],
    description: 'Manages the relationship between the UK Government and Welsh Government.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Labour in power in both Westminster and Cardiff Bay. Strong cooperation between governments. More investment in Welsh infrastructure. Devolution settlement working well. Welsh voice in UK decisions.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Strong Union. Oppose Welsh independence. Wales benefits from UK membership. Oppose Labour-run Cardiff Bay\'s excessive spending. More accountability for Senedd. No independence referendum.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'No Welsh independence. UK should speak with one voice. Oppose devolution overreach. Same rules for Wales as rest of UK. Stop Welsh government wasting money on ideology.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'More powers for Wales. Federal UK. Welsh voices must be heard. Constructive devolution. Welsh language protected. More investment in Welsh public services.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Support Welsh independence if that\'s what Welsh people want. Federal UK minimum. More devolution. Plaid Cymru alliance where appropriate. Welsh language and culture protected.' },
      { party: 'SNP', colour: '#fff200', position: 'Support Wales\'s right to self-determination. Solidarity with Plaid Cymru. Devolution must be extended. Nations of UK should decide their own futures.' },
    ]
  },
  {
    slug: 'northern-ireland-office',
    name: 'Northern Ireland Office',
    shortName: 'N. Ireland',
    minister: 'Hilary Benn',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/3702/Thumbnail',
    controlZones: ['Stormont', 'NI Assembly', 'Good Friday Agreement', 'NI Protocol', 'Windsor Framework'],
    description: 'Manages Northern Ireland\'s relationship with Westminster and upholds the Good Friday Agreement.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Protect Good Friday Agreement absolutely. Windsor Framework working. Support devolved institutions. North-South cooperation. Investment in NI economy. Both communities respected. Brexit legacy issues resolved through diplomacy.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Windsor Framework better than NI Protocol but still has issues. Support Union. Good Friday Agreement must be respected. DUP concerns must be addressed. NI must benefit from both UK and EU markets.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Northern Ireland is fully British. Windsor Framework is unacceptable. NI should have same rules as rest of UK. Oppose Irish Sea border. Support Union parties. Good Friday Agreement must not undermine British sovereignty.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Good Friday Agreement sacred. Windsor Framework improvement on Protocol. Support for power sharing. North-South institutions strengthened. NI benefits from unique dual access to UK and EU.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Support Irish unity by consent. Good Friday Agreement must be upheld. All-Ireland approach to many policy areas. NI benefits from EU single market access. Rights of all communities protected.' },
      { party: 'SNP', colour: '#fff200', position: 'Solidarity with Irish unity aspirations by consent. Good Friday Agreement is model of conflict resolution. NI should stay close to EU. Brexit has damaged NI communities. Self-determination for all nations.' },
    ]
  },
  {
    slug: 'commons-leader',
    name: 'Leader of the Commons',
    shortName: 'Commons Leader',
    minister: 'Sir Alan Campbell',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4488/Thumbnail',
    controlZones: ['Parliamentary Schedule', 'Bills Debated', 'Commons Business', 'MPs Conduct'],
    description: 'Manages the business of the House of Commons and acts as link between government and Parliament.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Reform parliamentary procedures. More time for government legislation. Modernise Commons working. Improve MP conduct rules. Better scrutiny of government. Parliamentary democracy strengthened.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Opposition must have proper scrutiny time. Government trying to rush legislation through. Commons must hold executive to account. Restore conventions of parliamentary democracy. Oppose guillotining of important bills.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Parliament is rigged against ordinary people. Establishment controls the agenda. Need real democratic debate not managed consensus. Opposition voices must be heard. Reform parliamentary procedures fundamentally.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'More free votes. Better protected time for opposition and backbenchers. Parliamentary reform commission. Citizens initiatives in parliament. More transparency in scheduling.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Radical parliamentary reform needed. Citizens assemblies feeding into Commons. Proportional representation would transform Commons. More time for environmental legislation. End whipping system.' },
      { party: 'SNP', colour: '#fff200', position: 'Scotland\'s MPs routinely ignored in Commons. Westminster is dysfunctional. Independence would let Scotland govern itself properly. SNP MPs voices marginalised by FPTP system.' },
    ]
  },
  {
    slug: 'lords-leader',
    name: 'Leader of the Lords',
    shortName: 'Lords Leader',
    minister: 'Baroness Smith of Basildon',
    ministerParty: 'Labour',
    ministerPhoto: '',
    controlZones: ['House of Lords Schedule', 'Lords Reform', 'Hereditary Peers', 'Lords Business'],
    description: 'Manages the business of the House of Lords and leads Lords reform efforts.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Remove remaining 92 hereditary peers - done. Further Lords reform to come. More diverse appointments. Lords as revising chamber not blocking chamber. Long-term elected element possible.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Lords provides essential constitutional check on government. Oppose abolition. Hereditary peers had legitimate role. Lords reforms going too far. Government trying to pack Lords with Labour peers.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'Abolish Lords entirely or elect it. Hereditary peers is class privilege. But appointed Lords even worse - pure patronage. Either elect it or scrap it. No more Lords appointments for political donors.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Elected second chamber based on proportional representation. Lords reform long overdue. No more political appointments. Diverse voices in revising chamber. Constitutional convention to agree new system.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Abolish House of Lords. Replace with elected senate or citizens assembly. Hereditary and appointed privilege has no place in democracy. Radical constitutional reform now.' },
      { party: 'SNP', colour: '#fff200', position: 'Abolish Lords. Independent Scotland would have no unelected chamber. Westminster undemocratic. Lords is embodiment of English establishment privilege. Scotland should not be governed by unelected peers.' },
    ]
  },
  {
    slug: 'advocate-general',
    name: 'Advocate General for Scotland',
    shortName: 'Advocate General',
    minister: 'Baroness Smith of Cluny',
    ministerParty: 'Labour',
    ministerPhoto: '',
    controlZones: ['Scottish Law', 'Legal Advice Scotland', 'Devolution Legal Issues'],
    description: 'Provides legal advice to the UK Government on Scottish law and devolution matters.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'Work constructively with Scottish legal system. Devolution settlement legally sound. UK-wide legal coherence while respecting Scots law. Rule of law in Scotland protected.' },
      { party: 'Conservative', colour: '#0087dc', position: 'Scots law must align with UK-wide principles where possible. Devolution should not create two-tier legal system. Union requires legal coherence.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'One legal system for the whole UK where possible. Devolution has created too much legal divergence. British citizens should have same legal rights wherever they live.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'Respect Scottish legal traditions. Separate legal system is strength of UK\'s federal nature. More devolution of legal powers to Scotland.' },
      { party: 'Green Party', colour: '#02a95b', position: 'Scottish legal system should be fully independent. Devolution of all legal powers. Scotland should control its own legal framework entirely.' },
      { party: 'SNP', colour: '#fff200', position: 'Scotland has always had a separate legal system. Advocate General is unneeded interference. Full legal independence for Scotland. Scots law for Scottish people decided in Scotland.' },
    ]
  },
  {
    slug: 'ukef',
    name: 'UK Export Finance',
    shortName: 'UKEF',
    minister: 'Douglas Alexander',
    ministerParty: 'Labour',
    ministerPhoto: 'https://members-api.parliament.uk/api/Members/4753/Thumbnail',
    controlZones: ['Export Finance', 'British Business Exports', 'Trade Credit', 'Overseas Investment'],
    description: 'Helps UK businesses export goods and services abroad through finance and insurance.',
    partyPositions: [
      { party: 'Labour', colour: '#d50000', position: 'UKEF supports British businesses selling overseas. Target clean energy exports. Industrial strategy links to export finance. Support SMEs exporting for first time. Green finance conditions on UKEF support.' },
      { party: 'Conservative', colour: '#0087dc', position: 'UKEF crucial for post-Brexit trade. Support arms exports to allies. Cut red tape for exporters. Prioritise trade deals that open markets for British goods. Less green ideology in export finance decisions.' },
      { party: 'Reform UK', colour: '#12b6cf', position: 'British businesses first in procurement and export support. Cut bureaucracy in UKEF. Support arms industries. Trade deals with Anglosphere countries. No green strings on export finance.' },
      { party: 'Liberal Democrats', colour: '#faa61a', position: 'No UKEF support for fossil fuel projects. Support clean tech exports. SME access to UKEF. EU single market access key to export success. Human rights conditions on all export finance.' },
      { party: 'Green Party', colour: '#02a95b', position: 'End all fossil fuel export finance. UKEF should only support sustainable exports. No arms export finance. Green New Deal exports. Climate conditions on all overseas finance.' },
      { party: 'SNP', colour: '#fff200', position: 'Scottish exporters need specific UKEF support. EU single market access essential for Scottish businesses. No arms exports to human rights abusers. Independent Scotland would have own export finance agency.' },
    ]
  },
];
