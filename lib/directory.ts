// The site directory at /directory (owner, 27 Oct 2026): every reader facing page and section, A to Z, so a reader
// can find what they want even when search does not show it. Built from the menu (lib/site-nav.ts), the page
// descriptions (lib/page-descriptions.ts) and the topics, plus the pages the menu does not list (EXTRA below). Index
// pages only, never single records (no MP, donor or bill pages). A page known by two names is listed under both
// (ALSO_KNOWN_AS). scripts/checks/directory-coverage.ts lists any reader facing page that is missing.
import { NAV } from '@/lib/site-nav';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import { topics } from '@/lib/topics';
import { RECOMMENDATIONS_PUBLIC } from '@/lib/feature-flags';
import { rankMatches, type Matchable } from '@/lib/directory-match';

// `see`: another name for a page already listed (T1-5x, owner 10 Nov 2026: one name is the link, the others are plain
// text pointing to it); the entry it names is the one that links.
export type DirectoryEntry = { name: string; href: string; desc: string; see?: string; keywords?: readonly string[] };

// Pages the menu does not list, with a plain one line description.
const EXTRA: DirectoryEntry[] = [
  { name: 'About opengovt', href: '/about', desc: 'Who runs opengovt, how the data is gathered and the editorial principles behind it.' },
  // In the footer since ENTRY 502 (22 Nov 2026), no longer in the header row, so listed here (Search too).
  { name: 'Commission Research', href: '/commission', desc: 'Commission an independent, fully sourced research report from opengovt.' },
  { name: 'Search', href: '/search', desc: 'Search bills, MPs, departments, contracts, donations and the rest of the public record.' },
  { name: 'Contact', href: '/contact', desc: 'Corrections, data and press enquiries, and general questions.' },
  { name: 'APPG Funders', href: '/appg-funders', desc: 'Every organisation that funds one or more All Party Parliamentary Groups, ranked by groups funded.' },
  { name: 'APPG Secretariats', href: '/secretariats', desc: 'The firms and charities that run All Party Parliamentary Groups, ranked by the number of groups each runs.' },
  { name: 'Bills by Session', href: '/bills/sessions', desc: 'Every bill since the 2006 to 2007 session: which became law, which were withdrawn or ran out of time.' },
  { name: 'Cookie Details', href: '/cookies/details', desc: 'Every cookie opengovt sets, what it does and how long it is kept.' },
  { name: 'Cookies', href: '/cookies', desc: 'Choose which cookies opengovt may use, and change your choice at any time.' },
  { name: 'Constituency Donations', href: '/donations/constituencies', desc: 'Every constituency association ranked by the donations it declared.' },
  { name: 'Council Search', href: '/councils/search', desc: 'Find a council by name, town or postcode.' },
  // Found by the hub coverage check (Cowork ENTRY 363, 19 Nov 2026).
  { name: 'Commission Research: Sample Report', href: '/commission/sample', desc: 'An example of a commissioned research report: how it is laid out and sourced.' },
  { name: 'Commission Research: Terms', href: '/commission/terms', desc: 'The terms for commissioning an independent research report from opengovt.' },
  // /programmes is out until it has content (owner, Cowork ENTRY 479, 21 Nov 2026): noindex and out of the sitemap too.
  { name: 'A - Z Directory', href: '/directory', desc: 'Everything on opengovt, A to Z.' },
  { name: 'Donate', href: '/donate', desc: 'Make a single donation to help keep opengovt free and independent.' },
  { name: 'Donations by Trusts', href: '/donations/trust-funded', desc: 'Political donations made through a trust rather than a named person, with who set up the trust.' },
  { name: 'Donations Disclosed Late', href: '/donations/late-disclosed', desc: 'Donations reported to the Electoral Commission more than 90 days after they were accepted.' },
  { name: 'Donations Explained', href: '/explainers/donations', desc: 'How the UK political donation rules work: thresholds, permissibility, timing and sanctions.' },
  { name: 'Donations from Abroad', href: '/donations/foreign', desc: 'Every political donation declared from an address outside the UK, grouped by country.' },
  { name: 'Donors Who Also Employ Their MP', href: '/donations/double-dip', desc: 'MPs paid by an organisation that has also given them a political donation.' },
  { name: 'Feedback', href: '/feedback', desc: 'Tell us what works, what is missing or what is wrong on opengovt.' },
  { name: 'Freedom of Information', href: '/transparency/freedom-of-information', desc: 'How many FOI requests each department received, how many were answered on time and how many were refused.' },
  { name: 'Government Contractors Who Donate', href: '/donations/government-contractors', desc: 'Companies holding public contracts that have also given political donations, matched by Companies House number.' },
  { name: 'Home', href: '/', desc: 'The front page: the latest reports, votes and data from opengovt.' },
  { name: 'House of Lords', href: '/lords', desc: 'Every member of the House of Lords: party, type of peerage, posts held, votes and written questions.' },
  { name: 'How This Site Is Made', href: '/how-this-site-is-made', desc: 'How opengovt is written, edited and checked against primary sources.' },
  { name: 'Impermissible Donations', href: '/donations/impermissible', desc: 'Donations later found impermissible and returned, with the reason and the recipient.' },
  { name: 'Leadership Contest Donations', href: '/donations/leadership-contests', desc: 'Donations to party leadership candidates while they were standing, by contest.' },
  { name: 'Legacies to Parties', href: '/donations/bequest', desc: 'Every political donation left in a will.' },
  { name: 'Major Projects', href: '/transparency/major-projects', desc: 'Every project in the Government Major Projects Portfolio, with its delivery rating and whole life cost.' },
  { name: 'Ministerial Directions', href: '/transparency/ministerial-directions', desc: 'Every ministerial direction published since 2015: what was directed, by whom and when.' },
  { name: 'Newsletter', href: '/newsletter', desc: 'opengovt Weekly: the week’s investigations and public spending stories in one email.' },
  { name: 'Past Polls', href: '/polls/archive', desc: 'Earlier opengovt polls, kept as a record with their final results.' },
  { name: 'Privacy', href: '/privacy', desc: 'What data opengovt collects, why, how it is used and your rights.' },
  { name: 'Questions to the Prime Minister, 1945 to 1961', href: '/pmqs/1945-to-1961', desc: 'Questions to the Prime Minister from 1945 to 1961, before PMQs had a fixed time: what is recorded, what is not and where it comes from.' },
  { name: 'Refused Expenses', href: '/expenses/refused', desc: 'Expense claims IPSA refused and money MPs repaid, by year, by MP and by reason.' },
  { name: 'Sponsored Visits', href: '/donations/sponsored-visits', desc: 'Trips paid for by governments and groups, declared as donations in kind.' },
  { name: 'Support', href: '/support', desc: 'Get help, report a data problem or suggest a feature.' },
  { name: 'Terms', href: '/terms', desc: 'The terms and conditions for using opengovt.' },
  { name: 'This Week in Parliament', href: '/this-week', desc: 'The bills coming up in the Commons over the next seven days, and the latest votes.' },
  { name: 'Transparency', href: '/transparency', desc: 'Ministers’ meetings, hospitality, donations, contracts and the revolving door, from public registers.' },
  { name: 'Unite the Kingdom', href: '/unite-kingdom', desc: 'The march Westminster does not want to understand.' },
  { name: 'All Topics', href: '/topics', desc: 'Every policy area in one place: its department, votes, bills and the MPs who scrutinise it.' },
  { name: 'Constituencies', href: '/constituencies', desc: 'All 650 constituencies by nation and region: the MP, the 2024 result, byelections, petitions and councils.' },
  { name: 'Early Day Motions', href: '/edms', desc: 'Every early day motion since the July 2024 general election: the text as tabled, sponsors, signatures and amendments.' },
  { name: 'Written Questions', href: '/questions', desc: 'Search every written question since the July 2024 general election by words, MP or peer, department and date, with the answers as published.' },
  { name: 'Petitions', href: '/petitions', desc: 'Every petition since the July 2024 general election that reached 10,000 signatures: the government response, any debate and signatures by constituency.' },
  // The section pages (Cowork ENTRY 502, 22 Nov 2026): one per menu heading.
  { name: 'Your Area Section', href: '/sections/your-area', desc: 'Your MP, your council, local figures, sewage spills and welfare spending in your area, in one list.' },
  { name: 'Parliament Section', href: '/sections/parliament', desc: 'MPs, the House of Lords, bills, votes, debates, questions and laws, in one list.' },
  { name: 'Government Section', href: '/sections/government', desc: 'Departments, ministers, official figures, special advisers, press releases, major projects and contracts, in one list.' },
  { name: 'Money and Influence Section', href: '/sections/money-and-influence', desc: "MPs' money, donations, lobbying and All Party Parliamentary Groups, in one list." },
  { name: 'Read Section', href: '/sections/read', desc: 'Reports, the Commons business ahead and every topic, in one list.' },
  { name: 'Parties Section', href: '/sections/parties', desc: 'Every party, the manifesto comparisons and the reader polls, in one list.' },
  { name: 'Your Area', href: '/your-area', desc: 'Your council and the latest local figures for your area, from a postcode, town or council.' },
  // The menu lists it as Recommendations while the tracker is public (4 Nov 2026); this is its full name.
  ...(RECOMMENDATIONS_PUBLIC ? [{ name: 'Public Accounts Committee Recommendations', href: '/recommendations', desc: 'What the Public Accounts Committee recommended, what the government said it would do and by when, and what happened next.' }] : []),
];

// Second names readers may look under. [name, href]
const ALSO_KNOWN_AS: [string, string][] = [
  ['MP Expenses', '/expenses'],
  ['MPs: all 650 profiles', '/mps'],
  ['Members of Parliament', '/mps'],
  ['Lords and Peers', '/lords'],
  ['Peers', '/lords'],
  ['Your MP', '/find-your-mp'],
  ['Postcode Search for Your MP', '/find-your-mp'],
  ['Companies', '/organisations'],
  ['Suppliers and Contractors', '/organisations'],
  ['Follow the Money', '/organisations'],
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
  ['Register History', '/register-history'],
  ['SpAds', '/transparency/special-advisers'],
  ['Polls', '/polls'],
  ['Investigations', '/reports'],
  ['Government Departments', '/departments'],
  ['Gifts and Hospitality', '/transparency/hospitality'],
  ['Storm Overflows', '/sewage'],
  ['Disabled Parking Badges', '/councils/blue-badges'],
  ['Child Poverty', '/councils/child-poverty'],
  ['Children in Care', '/councils/children-in-care'],
  ['Road Condition', '/councils/road-condition'],
  ['HMOs (Houses in Multiple Occupation)', '/councils/hmos'],
  // Missing until 19 Nov 2026 (Cowork ENTRY 363).
  ['State of the Nation', '/state-of-the-nation'],
  ['Free School Meals', '/councils/free-school-meals'],
  ['Youth Justice', '/councils/youth-justice'],
  ['Local Councils', '/councils'],
  ['Benefits Spending', '/tools/welfare'],
  ['Manifestos', '/parties/manifestos'],
  ['Political Parties', '/parties'],
];

// Plain words a reader would type for each page (owner, Cowork ENTRY 383, 19 Nov 2026), matched as well as the name and
// description, in 'Filter this list' and in the 'Pages on opengovt' group on /search (lib/directory-match.ts). Keyed by
// the page, so every entry for it, and the section pages' lists, use the same words; 3 to 8 each, each naming something
// the page itself shows. Reviewed by Cowork before push (audit/directory-383/KEYWORDS.md).
export const KEYWORDS: Record<string, readonly string[]> = {
  '/': ['front page', 'homepage', 'latest news', 'latest reports'],
  '/about': ['who we are', 'who runs opengovt', 'editorial principles', 'methodology'],
  '/appg-funders': ['APPG funders', 'who funds APPGs', 'all party groups', 'sponsors'],
  '/bills': ['new laws', 'legislation', 'bill stages', 'proposed laws', 'bills in parliament'],
  '/bills/sessions': ['old bills', 'bill history', 'parliamentary session', 'past bills'],
  '/civil-service': ['civil servants', 'headcount', 'staff numbers', 'FTE', 'civil service jobs'],
  '/commission': ['commission research', 'research report', 'hire opengovt', 'paid research'],
  '/commission/sample': ['sample report', 'example report', 'research example'],
  '/commission/terms': ['research terms', 'commission terms', 'terms and conditions'],
  '/committees': ['select committee members', 'committee membership', 'MPs on committees', 'Commons committees'],
  '/constituencies': ['seats', 'my constituency', 'election results', 'by-elections', 'byelections', 'constituency map'],
  '/contact': ['contact us', 'email opengovt', 'corrections', 'press enquiries', 'report an error'],
  '/cookies': ['cookie settings', 'cookie choices', 'analytics cookies', 'opt out'],
  '/cookies/details': ['cookie list', 'cookies used', 'cookie policy'],
  '/councils': ['local councils', 'local authorities', 'council tax', 'councillors', 'council leaders', 'council finance'],
  '/councils/blue-badges': ['disabled parking', 'blue badge', 'disability parking permit', 'parking badges'],
  '/councils/child-poverty': ['children in poverty', 'poor children', 'low income families', 'child poverty rate'],
  '/councils/children-in-care': ['looked after children', 'care system', 'kids in care', 'children looked after'],
  '/councils/free-school-meals': ['FSM', 'school dinners', 'free meals', 'pupils eligible', 'school lunches'],
  '/councils/hmos': ['HMO', 'bedsits', 'shared houses', 'house shares', 'houses in multiple occupation', 'HMO licences', 'HMO licensing'],
  '/councils/road-condition': ['potholes', 'road repairs', 'road maintenance', 'state of roads', 'bad roads'],
  '/councils/search': ['find my council', 'which council', 'council by postcode', 'local authority search'],
  '/councils/youth-justice': ['youth crime', 'young offenders', 'child offenders', 'first time entrants', 'youth cautions', 'juvenile crime'],
  '/departments': ['government departments', 'ministries', 'secretaries of state', 'ministers', 'cabinet'],
  '/directory': ['site map', 'sitemap', 'a to z', 'all pages', 'index'],
  '/divisions': ['how MPs voted', 'votes', 'voting records', 'Commons votes', 'division list'],
  '/donate': ['support opengovt', 'give money', 'make a donation', 'fund opengovt'],
  '/donations/bequest': ['wills', 'bequests', 'legacies', 'left in a will'],
  '/donations/constituencies': ['local party donations', 'constituency associations', 'local associations'],
  '/donations/double-dip': ['MPs paid twice', 'paid twice', 'donor employers'],
  '/donations/foreign': ['foreign donations', 'overseas donors', 'donations from abroad', 'foreign money'],
  '/donations/government-contractors': ['contractors who donate', 'donors with contracts', 'contract donors'],
  '/donations/impermissible': ['returned donations', 'impermissible donors', 'permissibility'],
  '/donations/late-disclosed': ['late donations', 'late reporting', 'reported late'],
  '/donations/leadership-contests': ['leadership race donations', 'leadership election', 'leadership campaign funding'],
  '/donations/sponsored-visits': ['paid trips', 'free trips', 'overseas visits', 'foreign trips'],
  '/donations/trust-funded': ['trust donations', 'donations through trusts', 'trusts'],
  '/donors': ['party donors', 'biggest donors', 'who funds parties', 'top donors', 'donor list'],
  '/earnings': ['MPs pay', 'MP pay', 'MP salary', 'salary', 'ministerial pay', 'how much MPs earn', 'MP wages'],
  '/edms': ['EDM', 'early day motion', 'motions', 'MP motions'],
  '/expenses': ['MP expenses', 'expenses claims', 'IPSA', 'office costs', 'travel expenses', 'staff costs'],
  '/expenses/refused': ['rejected expenses', 'refused claims', 'repaid expenses', 'IPSA refused'],
  '/explainers/donations': ['donation rules', 'donation law', 'how donations work', 'permissible donors'],
  '/feedback': ['give feedback', 'suggestions', 'report a problem', 'tell us'],
  '/find-your-mp': ['who is my MP', 'my MP', 'MP by postcode', 'postcode lookup', 'local MP'],
  '/how-this-site-is-made': ['how opengovt works', 'methods', 'fact checking', 'sources'],
  '/laws': ['acts of parliament', 'acts', 'royal assent', 'new laws', 'legislation passed'],
  '/laws/made-without-a-vote': ['statutory instruments', 'secondary legislation', 'SI', 'regulations', 'delegated legislation'],
  '/lobbying': ['lobbyists', 'lobby firms', 'meetings with ministers', 'lobbying register', 'consultant lobbyists'],
  '/lords': ['peers', 'Lords members', 'House of Lords members', 'Lords votes', 'baroness', 'lord'],
  '/money': ['follow the money', 'money and power', 'paid twice', 'contractors who donate', 'lobby firms'],
  '/mps': ['MP list', 'all MPs', 'members of parliament', 'MP profiles', 'voting records'],
  '/newsletter': ['email newsletter', 'weekly email', 'subscribe', 'sign up', 'opengovt weekly'],
  '/organisations': ['companies', 'firms', 'suppliers', 'contractors', 'charities', 'businesses'],
  '/parties': ['political parties', 'party list', 'parties in parliament', 'party records'],
  '/parties/manifestos': ['manifesto', 'party manifestos', 'election promises', 'general election 2024', 'party policies'],
  '/petitions': ['petition', 'e-petitions', 'signatures', 'petition debates', 'government response'],
  '/pmqs': ['PMQs', 'PMQ', 'Prime Ministers Questions', 'PM questions', 'Wednesday questions'],
  '/pmqs/1945-to-1961': ['old PMQs', 'Attlee', 'Churchill', 'Eden', 'Macmillan', 'PM questions history'],
  '/polls': ['opinion polls', 'vote', 'have your say', 'reader polls', 'poll results'],
  '/polls/archive': ['old polls', 'past results', 'poll archive', 'closed polls'],
  '/privacy': ['privacy policy', 'data protection', 'GDPR', 'personal data', 'your data'],
  '/questions': ['written questions', 'parliamentary questions', 'PQs', 'ministers answers', 'WQs'],
  '/register-history': ['old register of interests', 'past interests', 'register archive', 'interests 2000 to 2024', 'MP interests history'],
  '/reports': ['investigations', 'articles', 'news', 'briefings', 'analysis', 'stories'],
  '/search': ['search', 'find', 'search the site'],
  '/second-jobs': ['outside earnings', 'MP second jobs', 'outside interests', 'MPs other jobs'],
  '/secretariats': ['APPG secretariat', 'who runs APPGs', 'APPG administrators'],
  '/sections/government': ['government', 'ministers', 'departments', 'special advisers', 'press releases'],
  '/sections/money-and-influence': ['accountability', 'money', 'interests', 'expenses', 'lobbying', 'donations'],
  '/sections/parliament': ['parliament', 'MPs', 'Lords', 'bills', 'votes', 'debates', 'questions'],
  '/sections/parties': ['parties', 'manifestos', 'polls', 'vote', 'reader polls', 'have your say'],
  '/sections/read': ['read', 'reports', 'articles', 'this week', 'topics'],
  '/sections/your-area': ['local', 'my area', 'councils', 'sewage', 'local data', 'postcode'],
  '/sewage': ['sewage', 'sewage dumping', 'storm overflows', 'water companies', 'sewage discharges', 'raw sewage'],
  '/spending': ['government spending', 'department spending', 'DEL', 'public spending', 'budgets'],
  '/standards': ['standards commissioner', 'MP investigations', 'complaints about MPs', 'code of conduct', 'standards breaches'],
  '/state-of-the-nation': ['inflation', 'unemployment', 'GDP', 'national debt', 'NHS waiting lists', 'net migration', 'official statistics', 'economy figures'],
  '/support': ['help', 'report a data problem', 'suggest a feature', 'support'],
  '/terms': ['terms of use', 'terms and conditions', 'legal'],
  '/this-week': ['this week', 'upcoming bills', 'parliament this week', 'Commons business', 'latest votes'],
  '/topics': ['policy areas', 'issues', 'subjects', 'topics list'],
  '/transparency': ['transparency data', 'public registers', 'government transparency', 'transparency releases'],
  '/transparency/appgs': ['APPG', 'APPGs', 'all party groups', 'all party parliamentary groups', 'APPG register'],
  '/transparency/contracts': ['contracts', 'public contracts', 'government contracts', 'tenders', 'procurement', 'Find a Tender'],
  '/transparency/donations': ['political donations', 'party funding', 'donations to parties', 'Electoral Commission', 'party donations'],
  '/transparency/freedom-of-information': ['FOI', 'freedom of information requests', 'FOI statistics', 'FOI refusals'],
  '/transparency/hospitality': ['ministers gifts', 'gifts', 'hospitality', 'freebies'],
  '/transparency/major-projects': ['big projects', 'HS2', 'infrastructure projects', 'project ratings', 'GMPP'],
  '/transparency/ministerial-directions': ['ministerial direction', 'overruled officials', 'value for money direction'],
  '/transparency/ministers-meetings': ['ministers meetings', 'meetings with ministers', 'who ministers meet', 'diary'],
  '/transparency/mp-activity': ['most active MPs', 'MP speeches', 'how often MPs speak', 'Hansard'],
  '/transparency/press-releases': ['press releases', 'government announcements', 'GOV.UK news', 'committee reports'],
  '/transparency/register-of-interests': ['MP interests', 'registered interests', 'declared interests', 'gifts to MPs', 'MP shares'],
  '/transparency/revolving-door': ['revolving door', 'ACOBA', 'former ministers jobs', 'jobs after government', 'lobbying jobs'],
  '/transparency/special-advisers': ['SpAds', 'spads', 'special adviser', 'advisers', 'political advisers'],
  '/transparency/state-dashboard': ['public services', 'NHS waiting lists', 'A&E', 'prison places', 'prison capacity', 'court backlog', 'homelessness'],
  '/treaties': ['international treaties', 'treaty scrutiny', 'CRaG', 'agreements'],
  '/unite-kingdom': ['Unite the Kingdom march', 'march', 'protest', 'rally'],
  '/your-area': ['my area', 'local area', 'postcode', 'local figures', 'where I live'],
  '/debates': ['Hansard', 'Commons debates', 'debates', 'speeches', 'what MPs said'],
  '/tools/welfare': ['benefits', 'Universal Credit', 'PIP', 'housing benefit', 'carers allowance', 'welfare by area'],
  '/recommendations': ['PAC', 'Public Accounts Committee', 'committee recommendations', 'government response'],
  // Topics.
  '/topics/climate-and-energy': ['energy bills', 'net zero', 'climate change', 'renewables', 'oil and gas'],
  '/topics/constitutional-reform': ['electoral reform', 'voting system', 'Lords reform', 'devolution', 'recall'],
  '/topics/culture-media-and-sport': ['BBC', 'licence fee', 'arts', 'football regulator', 'gambling', 'museums'],
  '/topics/defence': ['armed forces', 'military', 'army', 'NATO', 'nuclear deterrent', 'veterans'],
  '/topics/economy-and-tax': ['tax', 'taxes', 'cost of living', 'borrowing', 'economy', 'growth'],
  '/topics/education': ['schools', 'universities', 'student loans', 'tuition fees', 'teachers', 'SEND', 'childcare'],
  '/topics/foreign-affairs': ['foreign policy', 'sanctions', 'foreign aid', 'diplomacy', 'alliances'],
  '/topics/housing': ['housing', 'renting', 'renters rights', 'leasehold', 'planning', 'social housing', 'council tax'],
  '/topics/immigration': ['asylum hotels', 'asylum', 'small boats', 'migrants', 'refugees', 'visas', 'net migration'],
  '/topics/justice-and-policing': ['crime', 'police', 'prisons', 'prison places', 'courts', 'sentencing'],
  '/topics/nhs-and-health': ['NHS', 'waiting lists', 'GP', 'hospitals', 'social care', 'mental health'],
  '/topics/transport': ['trains', 'rail fares', 'buses', 'roads', 'HS2', 'electric cars'],
  '/topics/welfare-and-benefits': ['benefits', 'Universal Credit', 'pensions', 'disability benefits', 'PIP', 'welfare'],
  // Parties.
  '/parties/alliance': ['Alliance Party', 'Northern Ireland', 'Alliance manifesto', 'Alliance donations'],
  '/parties/conservative': ['Conservatives', 'Tories', 'Tory', 'Conservative Party', 'Conservative manifesto', 'Conservative donations'],
  '/parties/dup': ['Democratic Unionist Party', 'DUP manifesto', 'DUP donations', 'unionists'],
  '/parties/green': ['Greens', 'Green Party', 'Green manifesto', 'Green donations'],
  '/parties/labour': ['Labour Party', 'Labour manifesto', 'Labour donations', 'Labour rebels'],
  '/parties/liberal-democrats': ['Lib Dems', 'Lib Dem', 'Liberal Democrat manifesto', 'Lib Dem donations'],
  '/parties/plaid-cymru': ['Plaid', 'Welsh nationalists', 'Plaid Cymru manifesto', 'Plaid donations'],
  '/parties/reform-uk': ['Reform', 'Reform party', 'Reform manifesto', 'Reform donations'],
  '/parties/restore-britain': ['Restore Britain party', 'Restore Britain donations', 'Restore Britain manifesto'],
  '/parties/sdlp': ['Social Democratic and Labour Party', 'SDLP manifesto', 'SDLP donations'],
  '/parties/sinn-fein': ['Sinn Fein', 'Sinn Fein manifesto', 'Sinn Fein donations', 'republicans'],
  '/parties/snp': ['Scottish National Party', 'Scottish nationalists', 'SNP manifesto', 'SNP donations'],
  '/parties/tuv': ['Traditional Unionist Voice', 'TUV manifesto', 'TUV donations'],
  '/parties/uup': ['Ulster Unionists', 'Ulster Unionist Party', 'UUP manifesto', 'UUP donations'],
  '/parties/your-party': ['Your Party manifesto', 'Your Party donations', 'new party'],
};

// The menu's own name for a section where the menu has no description.
const TOP_DESC: Record<string, string> = {
  '/search': 'Search bills, MPs, departments, contracts, donations and the rest of the public record.',
  '/reports': 'Every opengovt investigation and briefing, newest first, each checked against the public record.',
  '/commission': 'Commission an independent, fully sourced research report from opengovt.',
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
  // Home is no longer a header item (owner, 22 Nov 2026, ENTRY 502: the logo links home), but stays in the A to Z.
  add('Home', '/', TOP_DESC['/']);
  for (const item of NAV) {
    if (item.href === '/directory') continue; // listed as 'A - Z Directory' in EXTRA
    if (item.children?.length) {
      for (const c of item.children) {
        add(c.label, c.href, c.desc);
      }
    } else {
      add(item.label, item.href, TOP_DESC[item.href]);
    }
  }
  for (const t of topics) add(`${t.title} (topic)`, `/topics/${t.slug}`, (t.blurb || '').split(/(?<=\.)\s/)[0]);
  for (const e of EXTRA) add(e.name, e.href, e.desc);
  for (const [name, href] of ALSO_KNOWN_AS) add(name, href);
  // Fill any entry added before its page's description was known, then drop exact repeats (same name and page).
  const seen = new Set<string>();
  const primary = new Map<string, string>(); // page -> the name that links (the first added: menu, then extras, then aliases)
  return out
    .map((e) => ({ ...e, desc: e.desc || descFor.get(e.href) || '' }))
    .filter((e) => { const k = `${sortKey(e.name)}|${e.href}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((e) => { const p = primary.get(e.href); if (!p) { primary.set(e.href, e.name); return KEYWORDS[e.href] ? { ...e, keywords: KEYWORDS[e.href] } : e; } return { ...e, see: p }; })
    .sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'en-GB'));
}

export const DIRECTORY: DirectoryEntry[] = build();

// The letter an entry is filed under: the first letter of its name, ignoring "The"; anything else under "#".
export function directoryLetter(name: string): string {
  const c = sortKey(name).normalize('NFD').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// The 'Pages on opengovt' group on /search (Cowork ENTRY 383 addendum, 19 Nov 2026): the directory's pages that match the
// words, best first, one row per page (its other names count as its name), with the same matcher as 'Filter this list'.
export type DirectoryPage = Matchable & { href: string };
const PAGES: DirectoryPage[] = (() => {
  const alt = new Map<string, string[]>();
  for (const e of DIRECTORY) if (e.see) alt.set(e.href, [...(alt.get(e.href) ?? []), e.name]);
  return DIRECTORY.filter((e) => !e.see).map((e) => ({ href: e.href, title: e.name, desc: e.desc, keywords: e.keywords ?? [], alt: alt.get(e.href) ?? [] }));
})();

export function searchDirectory(q: string, limit = 8): DirectoryPage[] {
  return rankMatches(PAGES, q, limit);
}
