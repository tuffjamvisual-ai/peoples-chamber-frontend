import type { ControlZoneData } from '../types';

const inflation: ControlZoneData = {
  zone: 'Inflation',
  context: 'UK CPI inflation peaked at 11.1% in October 2022 driven by energy prices after Russia invasion of Ukraine. It has since fallen to 2.3% per the March 2026 OBR forecast and is expected to hit the Bank of England 2% target by late 2026. However food prices remain 25% higher than 2021 levels.',
  positions: [
    { partyId: 'labour', headline: 'Inflation falling — plan is working', position: 'Labour point to inflation falling from 3.4% when they took office to 2.3% in the OBR March 2026 forecast. Reeves says inflation will hit the 2% target by late 2026. Critics note prices are still 25% higher than 2021.' },
    { partyId: 'conservative', headline: 'Inflation was global — Labour taking credit for others work', position: 'Conservatives argue inflation was a global phenomenon caused by Covid supply chains and the Ukraine war. Labour NI rise risks reigniting inflation by increasing business costs.' },
    { partyId: 'reform', headline: 'Inflation is a hidden tax — end money printing', position: 'Reform UK argue inflation is caused by government overspending and the Bank of England printing money. Want strict limits on QE and government borrowing.' },
    { partyId: 'libdem', headline: 'Structural reform needed — inflation hits poorest hardest', position: 'Lib Dems argue the poorest households face higher effective inflation because they spend more on food and energy. Structural reform of energy markets and food supply chains is needed.' },
    { partyId: 'green', headline: 'Green investment reduces inflation long term', position: 'Greens argue investment in renewables and home insulation reduces the UK exposure to volatile fossil fuel prices — the main cause of the 2022-23 inflation spike.' },
    { partyId: 'snp', headline: 'Scotland hit harder by inflation — devolved solutions needed', position: 'SNP argue Scotland was disproportionately affected by energy inflation given its climate and housing stock. Scotland needs its own economic tools to respond to inflation differently.' },
    { partyId: 'plaid', headline: 'Wales hit harder — Welsh workers still in cost of living crisis', position: 'Plaid argue Welsh workers are still in a cost of living crisis even as headline inflation falls. Welsh wages are lower and housing costs remain high.' },
    { partyId: 'yourparty', headline: 'Inflation is class war — profiteering must be stopped', position: 'Your Party argue the 2022-24 inflation was driven partly by corporate profiteering. They want price controls on essential goods and windfall taxes on companies that profiteered.' },
    { partyId: 'dup', headline: 'NI inflation higher than UK average — unique pressures', position: 'DUP note Northern Ireland has experienced higher inflation than the UK average due to its unique economic position. Windsor Framework costs add to inflationary pressure.' },
    { partyId: 'sinnfein', headline: 'All-Ireland approach to inflation and price stability', position: 'Sinn Féin want coordinated action between Dublin and London on inflation. They support price controls on essential goods and windfall taxes on energy companies.' },
    { partyId: 'sdlp', headline: 'Cost of living crisis not over — NI families still struggling', position: 'SDLP argue while headline inflation falls Northern Ireland families are still in a cost of living crisis. Energy costs, food prices and housing costs remain very high relative to wages.' },
    { partyId: 'alliance', headline: 'Inflation must stay low — Bank independence essential', position: 'Alliance support Bank of England independence as essential to maintaining low inflation. They want policies that address structural causes of inflation.' },
    { partyId: 'tuv', headline: 'End money printing — sound money for British people', position: 'TUV support strict monetary discipline and oppose Quantitative Easing as a cause of inflation. They want the Bank of England to prioritise price stability above all.' },
    { partyId: 'uup', headline: 'Inflation reduction must translate to lower living costs', position: 'UUP welcome falling inflation but note prices remain far higher than pre-pandemic levels. Government must ensure falling inflation translates to lower costs for NI families.' },
    { partyId: 'restore', headline: 'Sound money — government caused inflation must fix it', position: 'Restore Britain argue the government caused inflation through excessive spending and money printing. Sound money principles and balanced budgets are essential.' },
    { partyId: 'others', headline: 'UKIP: Sound money and balanced budgets. Alba: Scottish monetary policy post independence.', position: 'UKIP want strict monetary discipline and oppose government deficits that cause inflation. Alba want an independent Scotland to consider its currency options.' },
  ]
};

export default inflation;
