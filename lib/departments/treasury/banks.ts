import type { ControlZoneData } from '../types';

const banks: ControlZoneData = {
  zone: 'Banks',
  context: 'The UK banking sector is regulated by the FCA and PRA. Banks are making large profits from the Bank Rate at 3.75% — passing on rate rises to mortgage holders faster than to savers. The Treasury oversees financial regulation and the Bank of England sets interest rates independently.',
  positions: [
    { partyId: 'labour', headline: 'Banks must pass on savings rates — mortgage support', position: 'Rachel Reeves has repeatedly challenged banks to pass on higher interest rates to savers as fast as they pass them to mortgage holders. Working with banks on mortgage charter support. No plans for a windfall tax on bank profits.' },
    { partyId: 'conservative', headline: 'Competitive banking sector — light touch regulation', position: 'Conservatives want a competitive banking sector with lighter regulation to maintain London status as a global financial centre. Oppose a windfall tax on banks as deterring investment.' },
    { partyId: 'reform', headline: 'Break up the big banks — end too big to fail', position: 'Reform UK want to break up the major high street banks to increase competition and end the implicit guarantee of taxpayer bailout. Support community banks and building societies.' },
    { partyId: 'libdem', headline: 'Windfall tax on bank profits — they are profiteering', position: 'Lib Dems want a windfall tax on bank excess profits made from the high interest rate environment. Banks are making billions from the spread between mortgage rates and savings rates.' },
    { partyId: 'green', headline: 'Nationalise the major banks — public ownership', position: 'Greens want to bring the major banks into public ownership as public utilities. A publicly owned banking system would direct lending towards green investment and social housing.' },
    { partyId: 'snp', headline: 'Scottish banking sector needs devolved oversight', position: 'SNP want more regulatory powers over Scottish-based banks. Royal Bank of Scotland and Bank of Scotland are central to Scotland economy. Scottish financial services sector needs protection through devolved regulation.' },
    { partyId: 'plaid', headline: 'Welsh communities need local banking — end branch closures', position: 'Plaid Cymru are concerned about bank branch closures in Welsh communities particularly in rural areas. Want Post Office banking services expanded and Welsh Development Bank strengthened.' },
    { partyId: 'yourparty', headline: 'Nationalise the banks — end financial speculation', position: 'Your Party want to nationalise the major banks and create a public banking system that serves the economy rather than shareholders.' },
    { partyId: 'dup', headline: 'Protect NI banking access — branch closures damaging', position: 'DUP are concerned about bank branch closures in Northern Ireland. NI has unique banking complications from the Windsor Framework. Treasury must ensure NI has adequate banking infrastructure.' },
    { partyId: 'sinnfein', headline: 'All-Ireland banking reform — end profiteering', position: 'Sinn Féin want banking reform across the island of Ireland. They support a windfall tax on bank profits and oppose branch closures in rural communities.' },
    { partyId: 'sdlp', headline: 'Banking must serve communities not just shareholders', position: 'SDLP want banks to serve communities — passing on savings rates, maintaining branch access and supporting first-time buyers. Support a windfall tax on excess bank profits.' },
    { partyId: 'alliance', headline: 'Banking regulation must protect NI consumers', position: 'Alliance want banking regulation that protects NI consumers particularly on mortgage rates and savings. Support maintaining bank branch access and strengthening credit unions.' },
    { partyId: 'tuv', headline: 'Banks must serve British people not global shareholders', position: 'TUV are concerned about major UK banks being owned by foreign shareholders. British banking should serve British interests. Oppose branch closures in NI communities.' },
    { partyId: 'uup', headline: 'Banking must support NI economic development', position: 'UUP want the banking sector to actively support NI economic development particularly through lending to businesses and first-time buyers.' },
    { partyId: 'restore', headline: 'Free market banking — end regulatory overreach', position: 'Restore Britain want to significantly reduce banking regulation. They oppose windfall taxes and want banks free to compete globally.' },
    { partyId: 'others', headline: 'UKIP: Post Office banking network. Alba: Scottish national bank.', position: 'UKIP want to use the Post Office network to restore banking access to communities losing branches. Alba want an independent Scotland to have its own national bank.' },
  ]
};

export default banks;
