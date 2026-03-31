import type { DepartmentData } from './types';

const treasury: DepartmentData = {
  slug: 'treasury',
  name: 'HM Treasury',
  shortName: 'Treasury',
  minister: 'Rachel Reeves',
  ministerParty: 'labour',
  ministerPhoto: 'https://members-api.parliament.uk/api/Members/4611/Thumbnail',
  controlZones: ['Income Tax', 'National Insurance', 'VAT', 'The Budget', 'Pensions', 'Banks', 'Inflation', 'Cost of Living', 'National Debt', 'Economic Growth', 'Crypto & Digital Money', 'Mortgage Rules'],
  description: 'The Ultimate Power Centre. Controls the nation\'s finances — every other department answers to the Treasury for money. Sets tax rates, manages public spending, controls economic policy and oversees the financial sector.',
  streetContext: 'With inflation at 2.3%, national debt at 93% of GDP and energy bills still high after the Middle East conflict, most people feel they\'re working harder for less. The "tax trap" — frozen thresholds dragging millions into higher rates — is the biggest grievance on the street right now.',
  currentIssues: [
    { title: 'The Tax Trap', description: 'Frozen income tax thresholds since 2021 mean 3.7 million more people will pay higher rate tax by 2028 as wages rise. Treasury calls it fiscal drag. The public calls it a stealth tax on hardworking people.', hot: true },
    { title: 'Energy Bill Support', description: 'Middle East conflict pushing gas prices up again. Treasury deciding whether to reinstate household energy support payments. Average annual bill still £1,738.', hot: true },
    { title: 'Mortgage Squeeze', description: 'Reeves meeting banks to ensure support for families struggling with mortgage payments. Bank Rate at 3.75% — still painful for millions who remortgaged at higher rates.', hot: false },
    { title: 'Crypto Regulation', description: 'New rules for cryptoassets coming in 2026. Treasury wants UK as global digital finance hub while cracking down on £1bn+ annual crypto fraud.', hot: false },
  ],
  partyPositions: [
    {
      partyId: 'labour',
      headline: 'Stability first, growth second — but the stealth taxes are hurting',
      position: 'Rachel Reeves has committed to strict fiscal rules — debt must fall as a share of GDP and day-to-day spending must be covered by tax revenues. She raised employer National Insurance by 1.2% in 2024, generating £15bn but causing 800,000 job losses according to some business groups. Income tax thresholds frozen until 2028 — a stealth tax that is pulling 3.7m more people into higher rate bands. Scrapped a planned income tax rise after public backlash showed even Labour voters had had enough. The March 2026 OBR forecast shows inflation falling to 2.3% and borrowing down to £133bn — Labour claims this proves the plan is working. Critics say living standards are still falling and the "growth mission" has stalled at just 1.1% GDP growth.',
    },
    {
      partyId: 'conservative',
      headline: 'Cut taxes, grow the economy — stop punishing work',
      position: 'Kemi Badenoch and shadow chancellor Mel Stride argue Labour\'s £15bn NI rise is a "jobs tax" that is already causing redundancies and hiring freezes across small businesses. Conservatives want to reverse the NI rise, unfreeze income tax thresholds to end fiscal drag, and scrap net zero levies saving families £165/year on energy bills. Pro-growth agenda focused on deregulation and cutting corporation tax for businesses that invest in the UK. Oppose what they call "tax and spend" economics. Argue that economic growth — not higher taxes — is the only sustainable route to funding public services.',
    },
    {
      partyId: 'reform',
      headline: 'Raise the tax threshold to £20,000 — give workers their money back',
      position: 'Nigel Farage\'s Reform UK proposes raising the income tax personal allowance from £12,570 to £20,000, taking 7 million low earners out of income tax entirely. Abolish inheritance tax for estates under £2m. Cut corporation tax for small businesses. End what Reform calls "fiscal torture" — the combination of frozen thresholds, NI rises and stealth taxes. Fund the tax cuts by slashing government waste — Reform claims to have identified £50bn in savings through cutting the civil service, ending foreign aid and scrapping diversity programmes. Critics say the numbers don\'t add up. Reform voters say they don\'t care — they want their money back.',
    },
    {
      partyId: 'libdem',
      headline: 'Wealth tax on the super-rich — make the system fair',
      position: 'Ed Davey\'s Liberal Democrats want a new wealth tax on assets over £10m, estimated to raise £5bn/year. Windfall tax on banks making excess profits from high interest rates. Reverse the freeze on income tax thresholds immediately. Reform business rates to save the high street — a system unchanged since 1990. Invest in public services rather than tax cuts for the wealthy. Oppose further austerity that hits the poorest hardest. Support the OBR\'s independence and oppose any political interference in fiscal forecasting.',
    },
    {
      partyId: 'green',
      headline: 'Tax the rich, fund the future — the current system is broken',
      position: 'Zack Polanski\'s Greens want a comprehensive wealth tax on the super-rich, a 1% annual levy on assets over £10m raising an estimated £70bn/year. Financial transaction tax on City trades — 0.5% on share deals, 0.1% on derivatives. End all fossil fuel subsidies worth £15bn/year. Fund the NHS, housing and green transition through progressive taxation rather than austerity. Scrap VAT on home insulation and repairs. The Green Party argues the current tax system is rigged in favour of those who own assets over those who work for a living.',
    },
    {
      partyId: 'snp',
      headline: 'Full fiscal powers for Scotland — Westminster\'s economic model has failed',
      position: 'The SNP argue that Scotland has been economically damaged by Westminster decisions — from Thatcher\'s deindustrialisation to austerity. Full fiscal autonomy would let Scotland set its own tax rates, borrow for investment and build a different economic model. Oppose the NI rise and frozen thresholds hitting Scottish workers. Support scrapping the two-child benefit cap. The SNP point to Scotland\'s North Sea oil and gas revenues — which they argue should fund a Scottish sovereign wealth fund rather than going to Westminster. An independent Scotland would rejoin the EU single market, boosting trade by an estimated 15%.',
    },
    {
      partyId: 'plaid',
      headline: 'Wales is being short-changed — fair funding or independence',
      position: 'Plaid Cymru argue Wales receives less per head than Scotland through the Barnett formula despite having greater need. Demand a needs-based funding formula. Welsh Government should have full borrowing powers to invest in infrastructure. Oppose the NI rise which is killing Welsh small businesses. Support a wealth tax and windfall taxes on energy companies. The £4bn owed to Wales from HS2 cancellation must be paid immediately and invested in Welsh transport. An independent Wales would have control of its own fiscal levers.',
    },
    {
      partyId: 'yourparty',
      headline: 'Tax the billionaires, nationalise the banks, end austerity for good',
      position: 'Jeremy Corbyn\'s Your Party want a fundamental restructuring of the UK economy. A comprehensive wealth tax on assets over £1m. Nationalise the major banks and turn them into public utilities. End corporate tax avoidance costing an estimated £90bn/year through closing loopholes and proper enforcement. Cancel the debt created by banker bailouts. Scrap all austerity measures. A National Investment Bank to fund green industry, housing and public services. Your Party argue the current economic model transfers wealth from workers to shareholders and only fundamental change will fix inequality.',
    },
    {
      partyId: 'dup',
      headline: 'Northern Ireland needs its own economic deal — the Windsor Framework is costing us',
      position: 'The DUP argue that the Windsor Framework creates an economic border in the Irish Sea that damages Northern Ireland\'s trade with Great Britain. NI businesses face extra costs and paperwork that GB competitors don\'t. A special economic zone arrangement for NI is needed. Oppose tax rises that hurt NI\'s already fragile economy. Support corporation tax powers being devolved to Stormont to compete with the Republic of Ireland\'s 12.5% rate. NI\'s unique position — in both UK and EU regulatory spheres — should be an economic advantage not a burden.',
    },
    {
      partyId: 'sinnfein',
      headline: 'All-Ireland economy — unity would transform both economies',
      position: 'Sinn Féin argue that Irish unity would create a single economic space of 7 million people with access to both EU and UK markets. A united Ireland would end the economic distortions caused by partition. Oppose austerity measures from Westminster. Support corporation tax harmonisation across the island. An Irish unity referendum should include detailed economic modelling. Sinn Féin point to the Republic\'s economic success — GDP growth of 5%+ — as proof that an independent Irish economic model works.',
    },
    {
      partyId: 'sdlp',
      headline: 'Investment not austerity — NI needs a proper economic strategy',
      position: 'The SDLP support more investment in Northern Ireland\'s economy through the Shared Island Fund. Oppose cuts to public services. Want the UK Government to properly fund the Stormont Executive. Support cross-border economic cooperation. The SDLP back a windfall tax on energy companies and oppose the NI Protocol\'s economic disruption. A progressive tax system that funds public services and reduces inequality.',
    },
    {
      partyId: 'alliance',
      headline: 'Pragmatic economics — what works for NI citizens',
      position: 'Alliance takes a cross-community pragmatic approach to economics. Support investment in NI\'s economy, particularly in tech and green industries. Want the Treasury to properly fund public services in NI. Support the Windsor Framework as providing economic opportunities. Oppose ideological austerity. Back progressive taxation and oppose measures that increase inequality.',
    },
    {
      partyId: 'tuv',
      headline: 'One UK economy — no special deals that undermine the union',
      position: 'Jim Allister\'s TUV oppose any economic arrangement that treats Northern Ireland differently from the rest of the UK. The Windsor Framework creates an internal UK economic border that must be scrapped. NI must be fully integrated into the UK single market with no additional costs or paperwork. Oppose tax rises. Support a strong UK economy with NI as a full equal partner. Brexit must deliver genuine UK economic sovereignty.',
    },
    {
      partyId: 'uup',
      headline: 'Practical unionism — make the economic union work for everyone',
      position: 'The UUP want the economic relationship between NI and GB to work properly. Support resolving the Windsor Framework issues pragmatically. NI needs investment in infrastructure, skills and business to close the productivity gap with GB. Support devolution of some fiscal powers to Stormont. Oppose austerity measures that harm NI\'s public services.',
    },
    {
      partyId: 'restore',
      headline: 'Cut taxes, cut the state, give people their money back',
      position: 'Rupert Lowe\'s Restore Britain — formed after his split from Reform UK — advocates for radical tax cuts and state reduction. Raise income tax threshold to £20,000. Abolish stamp duty. Cut corporation tax to 15%. Slash the size of government by 30% through cutting quangos, ending foreign aid and reforming the civil service. Restore Britain argues the UK state has become too large, too expensive and too intrusive. Economic freedom, not government intervention, is the route to prosperity.',
    },
    {
      partyId: 'others',
      headline: 'UKIP, Alba and others — fringe but vocal',
      position: 'UKIP: Raise income tax threshold, slash immigration to reduce public spending pressure, leave ECHR. Alba (Scotland): Full fiscal independence for Scotland, Scottish sovereign wealth fund from North Sea revenues, rejoin EU. Heritage Party: Flat tax rate of 20% for all, abolish inheritance tax, end foreign aid, radical spending cuts. These parties have no MPs but published policies that attract tens of thousands of voters.',
    },
  ],
};

export default treasury;
