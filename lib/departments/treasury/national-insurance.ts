import type { ControlZoneData } from '../types';

const nationalInsurance: ControlZoneData = {
  zone: 'National Insurance',
  context: 'National Insurance is paid by workers on earnings above £12,570 at 8% and by employers on wages above £5,000 at 15% after Labour raised it from 13.8% in April 2025. This raised £15bn but triggered widespread hiring freezes, reduced hours and redundancies particularly in hospitality, retail and care sectors.',
  positions: [
    { partyId: 'labour', headline: 'Employer NI rise necessary to fund public services', position: 'Labour raised employer NI from 13.8% to 15% in April 2025 raising £15bn/year for the NHS. Business groups say it has cost 800,000 jobs or reduced hours. Reeves says the alternative — cutting public services — would be worse.' },
    { partyId: 'conservative', headline: 'Reverse the jobs tax — it is destroying businesses', position: 'Conservatives call the NI rise a jobs tax and want to reverse it. It is already causing redundancies in care homes, hospitality and retail. It was not included in Labour manifesto costings — a betrayal of voters.' },
    { partyId: 'reform', headline: 'Scrap employer NI entirely for small businesses', position: 'Reform UK want to scrap employer NI for businesses with fewer than 10 employees. The NI system is a tax on employment that should be gradually abolished.' },
    { partyId: 'libdem', headline: 'Reverse the small business NI rise', position: 'Lib Dems want to reverse the employer NI rise for small businesses and charities who cannot absorb the cost unlike large corporations. Replace the revenue with a windfall tax on banks.' },
    { partyId: 'green', headline: 'Reform NI — make it truly progressive', position: 'Greens want NI applied to all income including dividends, rental income and capital gains — not just employment income. This would raise more from the wealthy and allow rates to be cut for low and middle earners.' },
    { partyId: 'snp', headline: 'NI rise is damaging Scottish businesses and care sector', position: 'SNP oppose the employer NI rise as particularly damaging to Scotland care sector and small businesses. Full NI powers should be devolved to Scotland.' },
    { partyId: 'plaid', headline: 'NI rise hitting Welsh care sector hardest', position: 'Plaid Cymru oppose the NI rise as disproportionately damaging to Wales where lower wages mean care sector and hospitality margins are thinner.' },
    { partyId: 'yourparty', headline: 'Extend NI to investment income — make the rich pay', position: 'Your Party support extending NI to dividends and investment income currently exempt, raising an estimated £8bn. The NI system currently taxes employment but not unearned income.' },
    { partyId: 'dup', headline: 'NI rise damaging Northern Ireland fragile economy', position: 'DUP strongly oppose the employer NI rise as particularly damaging to Northern Ireland where businesses already face additional costs from the Windsor Framework.' },
    { partyId: 'sinnfein', headline: 'Reform NI system — tax wealth not just work', position: 'Sinn Féin want NI extended to investment income. They oppose the employer NI rise as hitting workers through job cuts and reduced hours.' },
    { partyId: 'sdlp', headline: 'Reverse the rise — protect workers and care sector', position: 'SDLP want the employer NI rise reversed for care providers and small businesses. Support reforming NI to make it more progressive.' },
    { partyId: 'alliance', headline: 'NI businesses need relief from employer NI burden', position: 'Alliance want targeted relief for Northern Ireland businesses facing the NI rise on top of Windsor Framework costs.' },
    { partyId: 'tuv', headline: 'Scrap the employer NI rise — a tax on jobs', position: 'TUV strongly oppose the NI rise as a direct tax on employment that will cost Northern Ireland jobs. Want it reversed immediately.' },
    { partyId: 'uup', headline: 'Reverse the jobs tax for NI businesses', position: 'UUP want the employer NI rise reversed for Northern Ireland businesses which face unique challenges including Windsor Framework costs.' },
    { partyId: 'restore', headline: 'Abolish employer NI — a tax on hiring people', position: 'Restore Britain want to phase out employer National Insurance entirely, calling it a tax on hiring British workers.' },
    { partyId: 'others', headline: 'UKIP: Scrap employer NI. Alba: Devolve NI to Scotland.', position: 'UKIP want to phase out employer NI starting with exemptions for small businesses. Alba want NI devolved to Scotland.' },
  ]
};

export default nationalInsurance;
