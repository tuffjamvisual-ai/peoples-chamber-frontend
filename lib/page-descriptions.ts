// Page descriptions written from what each page shows (25 Oct 2026, report 61), replacing generic ones. Each is used in
// two places from here, so they cannot differ: the page's own meta description (what search engines show) and its row
// on the section pages (lib/site-nav.ts, app/sections/[slug]/page.tsx). 120 to 155 characters each.

// /transparency/<section> (app/transparency/[section]/page.tsx), /parties (app/parties/page.tsx) and /expenses.
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/organisations':
    'Every organisation with political donations, public contracts, grants, meetings with ministers or lobbying, matched by Companies House number.',
  '/transparency/revolving-door':
    'Jobs taken by former ministers and officials after leaving government: ACOBA advice until it closed, then the Independent Adviser\'s advice for ministers.',
  '/transparency/donations':
    'Electoral Commission records of donations to parties and candidates: who gave, who received, how much, cash or in kind, and when it was reported.',
  '/transparency/contracts':
    'Contract notices from Find a Tender, read daily: the buyer, the supplier, the value and the date of each notice, with framework values shown as potential.',
  '/transparency/appgs':
    'Every All Party Parliamentary Group on the register: its category, chair and officers, its funders, and the benefits it declared, in value bands.',
  '/transparency/ministers-meetings':
    "Ministers' meetings with outside organisations, as published by each department: the minister, the date, who they met and the purpose given.",
  '/transparency/hospitality':
    'Hospitality received by ministers, as published by each department: the minister, the date, who gave it, what it was, any guest and its value.',
  '/parties':
    'The 15 UK parties Open Govt covers, each with its number of current MPs and a link to its promises against its record, its donations and its whip record.',
  '/laws/made-without-a-vote':
    'Every statutory instrument laid before Parliament: laws ministers make without a full Act, with procedure, department, scrutiny and debates.',
  '/treaties':
    'Every treaty laid before Parliament under the 2010 Act: laid date, department, objection deadline, committee work and whether scrutiny ended.',
  '/directory':
    'Everything on Open Govt, A to Z: every section, list and tool on the site with a one line description, so you can find exactly what you need.',
  '/councils/blue-badges':
    'Blue Badges held and issued in every English council area: the share of residents with one, the change on the year, and who qualifies automatically.',
  '/expenses':
    'The ten MPs with the highest IPSA business costs in the latest year, ranked by total claimed across staffing, office, accommodation and travel.',
};

// Every party page (/parties/<slug>/bio) shows the same parts, so one template keeps all 15 consistent: the long form
// "Opengovt verdict", and links to the party's manifesto against its record on 11 themes, its money (every declared
// donation) and its whip record (how often its MPs vote against the party line).
export function partyDescription(name: string): string {
  return `${name}: Open Govt's verdict, linking to its promises against its record on 11 themes, its donations and how often its MPs rebel.`;
}

// The parties' names as their pages show them (parties.name), for the section page rows.
export const PARTY_NAMES: Record<string, string> = {
  labour: 'Labour',
  conservative: 'Conservative',
  'liberal-democrats': 'Liberal Democrats',
  snp: 'Scottish National Party',
  'reform-uk': 'Reform UK',
  'sinn-fein': 'Sinn Féin',
  green: 'Green Party',
  dup: 'Democratic Unionist Party',
  'plaid-cymru': 'Plaid Cymru',
  sdlp: 'SDLP',
  alliance: 'Alliance Party',
  uup: 'Ulster Unionist Party',
  tuv: 'Traditional Unionist Voice',
  'restore-britain': 'Restore Britain',
  'your-party': 'Your Party',
};

// "Vote on Bills" (the Vote section) opens /bills, the same page as "Bills", so its row describes the voting itself rather
// than repeating the bill list's description. The bill pages offer Aye and No (Abstain was removed on 30 May 2026).
export const VOTE_ON_BILLS_DESCRIPTION =
  'Sign in to vote Aye or No on any bill going through Parliament, see how Open Govt users voted, and change your vote while the bill is still live.';
