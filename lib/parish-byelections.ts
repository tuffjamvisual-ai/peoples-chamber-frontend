// Town and parish council by-elections shown on the principal council's page (owner asked, Cowork ENTRY 417, 20 Nov
// 2026): the site's by-elections list (lib/council-byelections.ts, the council_byelections table) covers principal
// councils only, so a parish poll run by the council is a short note under 'Town and parish by-elections'. Each entry is
// copied from the returning officer's declaration (declaration_url, listed in the page's Sources fold, Cowork ENTRY
// 410), never retyped from elsewhere. Parties as printed on the declaration.

export type ParishByelection = {
  councilSlug: string;     // the principal council whose page shows it (it ran the poll)
  body: string;            // 'Lowestoft Town Council'
  ward: string;            // 'Gunton Parish Ward'
  pollDate: string;        // YYYY-MM-DD
  winnerName: string;
  winnerParty: string | null;
  winnerVotes: number;
  runnerUpName: string;
  runnerUpParty: string | null;
  runnerUpVotes: number;
  turnoutPct: number | null;
  declarationUrl: string;
};

export const PARISH_BYELECTIONS: ParishByelection[] = [
  // East Suffolk Council's declaration, 19 Nov 2026 (checked 20 Nov 2026): Court (Restore Britain) 362, Barnes (Green
  // Party) 193, Chilvers (Financial Accountability) 118, Lavill (Liberal Democrats) 82; electorate 2,551; turnout 29.8%.
  {
    councilSlug: 'east-suffolk', body: 'Lowestoft Town Council', ward: 'Gunton Parish Ward', pollDate: '2026-11-19',
    winnerName: 'Michael Court', winnerParty: 'Restore Britain', winnerVotes: 362,
    runnerUpName: 'Alan Thomas Barnes', runnerUpParty: 'Green Party', runnerUpVotes: 193, turnoutPct: 29.8,
    declarationUrl: 'https://www.eastsuffolk.gov.uk/sites/default/files/2026-11/Lowestoft%20Gunton%20%20-%20Declaration%20of%20Result%20-%2019.11.26.pdf',
  },
];

export const parishByelectionsFor = (slug: string) =>
  PARISH_BYELECTIONS.filter((p) => p.councilSlug === slug).sort((a, b) => b.pollDate.localeCompare(a.pollDate));
