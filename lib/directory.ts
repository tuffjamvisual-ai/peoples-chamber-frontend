// The site directory at /directory (owner, 27 Oct 2026): every reader facing page and section, A to Z, so a reader
// can find what they want even when search does not show it. Built from the menu (lib/site-nav.ts), the page
// descriptions (lib/page-descriptions.ts) and the topics, plus the pages the menu does not list (EXTRA below). Index
// pages only, never single records (no MP, donor or bill pages). A page known by two names is listed under both
// (ALSO_KNOWN_AS). scripts/checks/directory-coverage.ts lists any reader facing page that is missing.
import { NAV } from '@/lib/site-nav';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import { topics } from '@/lib/topics';

export type DirectoryEntry = { name: string; href: string; desc: string };

// Pages the menu does not list, with a plain one line description.
const EXTRA: DirectoryEntry[] = [
  { name: 'About Open Govt', href: '/about', desc: 'Who runs Open Govt, how the data is gathered and the editorial principles behind it.' },
  { name: 'APPG Funders', href: '/appg-funders', desc: 'Every organisation that funds one or more All Party Parliamentary Groups, ranked by groups funded.' },
  { name: 'APPG Secretariats', href: '/secretariats', desc: 'The firms and charities that run All Party Parliamentary Groups, ranked by the number of groups each runs.' },
  { name: 'Bills by Session', href: '/bills/sessions', desc: 'Every bill since the 2004 to 2005 session: which became law, which were withdrawn or ran out of time.' },
  { name: 'Commission Terms', href: '/commission/terms', desc: 'The terms that apply when you commission research from Open Govt.' },
  { name: 'Constituency Donations', href: '/donations/constituencies', desc: 'Every constituency association ranked by the donations it declared.' },
  { name: 'Council Search', href: '/councils/search', desc: 'Find a council by name, town or postcode.' },
  { name: 'Directory', href: '/directory', desc: 'Everything on Open Govt, A to Z.' },
  { name: 'Donate', href: '/donate', desc: 'Make a single donation to help keep Open Govt free and independent.' },
  { name: 'Donations by Trusts', href: '/donations/trust-funded', desc: 'Political donations made through a trust rather than a named person, with who set up the trust.' },
  { name: 'Donations Disclosed Late', href: '/donations/late-disclosed', desc: 'Donations reported to the Electoral Commission more than 90 days after they were accepted.' },
  { name: 'Donations Explained', href: '/explainers/donations', desc: 'How the UK political donation rules work: thresholds, permissibility, timing and sanctions.' },
  { name: 'Donations from Abroad', href: '/donations/foreign', desc: 'Every political donation declared from an address outside the UK, grouped by country.' },
  { name: 'Donors Who Also Employ Their MP', href: '/donations/double-dip', desc: 'MPs paid by an organisation that has also given them a political donation.' },
  { name: 'Freedom of Information', href: '/transparency/freedom-of-information', desc: 'How many FOI requests each department received, how many were answered on time and how many were refused.' },
  { name: 'Government Contractors Who Donate', href: '/donations/government-contractors', desc: 'Companies holding public contracts that have also given political donations, matched by Companies House number.' },
  { name: 'Home', href: '/', desc: 'The front page: the latest reports, votes and data from Open Govt.' },
  { name: 'How This Site Is Made', href: '/how-this-site-is-made', desc: 'How Open Govt is written, edited and checked against primary sources.' },
  { name: 'Impermissible Donations', href: '/donations/impermissible', desc: 'Donations later found impermissible and returned, with the reason and the recipient.' },
  { name: 'Leadership Contest Donations', href: '/donations/leadership-contests', desc: 'Donations to party leadership candidates while they were standing, by contest.' },
  { name: 'Legacies to Parties', href: '/donations/bequest', desc: 'Every political donation left in a will.' },
  { name: 'Major Projects', href: '/transparency/major-projects', desc: 'Every project in the Government Major Projects Portfolio, with its delivery rating and whole life cost.' },
  { name: 'Ministerial Directions', href: '/transparency/ministerial-directions', desc: 'Every ministerial direction published since 2015: what was directed, by whom and when.' },
  { name: 'Newsletter', href: '/newsletter', desc: 'Open Govt Weekly: the week’s investigations and public spending stories in one email.' },
  { name: 'Past Polls', href: '/polls/archive', desc: 'Earlier Open Govt polls, kept as a record with their final results.' },
  { name: 'Privacy', href: '/privacy', desc: 'What data Open Govt collects, why, how it is used and your rights.' },
  { name: 'Programmes', href: '/programmes', desc: 'Major government policy commitments, tracked over time.' },
  { name: 'Refused Expenses', href: '/expenses/refused', desc: 'Expense claims IPSA refused and money MPs repaid, by year, by MP and by reason.' },
  { name: 'Sponsored Visits', href: '/donations/sponsored-visits', desc: 'Trips paid for by governments and groups, declared as donations in kind.' },
  { name: 'Support', href: '/support', desc: 'Get help, report a data problem or suggest a feature.' },
  { name: 'Terms', href: '/terms', desc: 'The terms and conditions for using Open Govt.' },
  { name: 'This Week in Parliament', href: '/this-week', desc: 'The bills coming up in the Commons over the next seven days, and the latest votes.' },
  { name: 'Transparency', href: '/transparency', desc: 'Ministers’ meetings, hospitality, donations, contracts and the revolving door, from public registers.' },
  { name: 'Unite the Kingdom', href: '/unite-kingdom', desc: 'The march Westminster does not want to understand.' },
  { name: 'All Topics', href: '/topics', desc: 'Every policy area in one place: its department, votes, bills and the MPs who scrutinise it.' },
  { name: 'Parliament Section', href: '/sections/parliament', desc: 'Everything on MPs, bills, votes, parties and departments in one list.' },
  { name: 'Local Section', href: '/sections/local', desc: 'Councils and sewage spills in your area, in one list.' },
  { name: 'Accountability Section', href: '/sections/accountability', desc: 'Registers of interests, expenses, lobbying, donations and contracts, in one list.' },
  { name: 'Vote Section', href: '/sections/vote', desc: 'Open Govt polls and voting on bills, in one list.' },
];

// Second names readers may look under. [name, href]
const ALSO_KNOWN_AS: [string, string][] = [
  ['MP Expenses', '/expenses'],
  ['MPs: all 650 profiles', '/mps'],
  ['Members of Parliament', '/mps'],
  ['Your MP', '/find-your-mp'],
  ['Postcode Search for Your MP', '/find-your-mp'],
  ['Companies', '/organisations'],
  ['Lobbying and Organisations', '/organisations'],
  ['Organisations Lobbying Ministers', '/lobbying'],
  ['Lobbying Registry', '/lobbying'],
  ['Political Donations', '/transparency/donations'],
  ['Party Donors', '/donors'],
  ['Public Contracts', '/transparency/contracts'],
  ['Contracts', '/transparency/contracts'],
  ['All Party Parliamentary Groups', '/transparency/appgs'],
  ['Statutory Instruments', '/laws/made-without-a-vote'],
  ['Secondary Legislation', '/laws/made-without-a-vote'],
  ['Acts of Parliament', '/laws'],
  ['Commons Votes', '/divisions'],
  ['Votes in Parliament', '/divisions'],
  ['Hansard Debates', '/debates'],
  ['Outside Earnings', '/second-jobs'],
  ['MP Interests', '/transparency/register-of-interests'],
  ['SpAds', '/transparency/special-advisers'],
  ['Polls', '/polls'],
  ['Investigations', '/reports'],
  ['Government Departments', '/departments'],
  ['Gifts and Hospitality', '/transparency/hospitality'],
  ['Storm Overflows', '/sewage'],
  ['Local Councils', '/councils'],
  ['Benefits Spending', '/tools/welfare'],
  ['Research Commissions', '/commission'],
  ['Manifestos', '/parties/manifestos'],
  ['Political Parties', '/parties'],
];

// The menu's own name for a section where the menu has no description.
const TOP_DESC: Record<string, string> = {
  '/search': 'Search bills, MPs, departments, contracts, donations and the rest of the public record.',
  '/reports': 'Every Open Govt investigation and briefing, newest first, each checked against the public record.',
  '/commission': 'Commission an independent, fully sourced research report from Open Govt.',
  '/contact': 'Corrections, data and press enquiries, and general questions.',
};

const sortKey = (name: string) => name.replace(/^the\s+/i, '').toLocaleLowerCase('en-GB');
const clean = (t: string) => t.replace(/\s+/g, ' ').trim();

function build(): DirectoryEntry[] {
  const out: DirectoryEntry[] = [];
  const descFor = new Map<string, string>();
  const add = (name: string, href: string, desc?: string) => {
    const d = clean(desc || PAGE_DESCRIPTIONS[href] || TOP_DESC[href] || descFor.get(href) || '');
    if (d && !descFor.has(href)) descFor.set(href, d);
    out.push({ name: clean(name), href, desc: d });
  };
  for (const item of NAV) {
    if (item.children?.length) {
      for (const c of item.children) {
        if (item.label === 'Topics') continue; // the topics are added below with their own lines
        add(c.label, c.href, c.desc);
      }
    } else {
      add(item.label === 'Home' ? 'Home' : item.label, item.href, TOP_DESC[item.href]);
    }
  }
  for (const t of topics) add(`${t.title} (topic)`, `/topics/${t.slug}`, (t.blurb || '').split(/(?<=\.)\s/)[0]);
  for (const e of EXTRA) add(e.name, e.href, e.desc);
  for (const [name, href] of ALSO_KNOWN_AS) add(name, href);
  // Fill any entry added before its page's description was known, then drop exact repeats (same name and page).
  const seen = new Set<string>();
  return out
    .map((e) => ({ ...e, desc: e.desc || descFor.get(e.href) || '' }))
    .filter((e) => { const k = `${sortKey(e.name)}|${e.href}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'en-GB'));
}

export const DIRECTORY: DirectoryEntry[] = build();

// The letter an entry is filed under: the first letter of its name, ignoring "The"; anything else under "#".
export function directoryLetter(name: string): string {
  const c = sortKey(name).normalize('NFD').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
