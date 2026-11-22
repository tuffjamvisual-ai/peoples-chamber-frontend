// The site's main menu (25 Oct 2026, reports 47 and 60): the 11 top level sections and each section's links. One list
// for the desktop header (OpenGovShell.tsx, no dropdowns since report 60), the phone menu panel (MobileMenu.tsx), the
// section pages (app/sections/[slug]/page.tsx), so they cannot drift apart. The "In this section" rows on the section
// landing pages were removed (owner, 10 Nov 2026, T1-5s: "all it does is add fat to the pages").
import { SHOW_LEAGUE_TABLE, SHOW_YOUR_TAX_POUND, SHOW_BUDGET_CHOICES, RECOMMENDATIONS_PUBLIC } from '@/lib/feature-flags';
import { PAGE_DESCRIPTIONS, partyDescription, PARTY_NAMES } from '@/lib/page-descriptions';
// A party's link goes to its first page while its verdict is hidden (T1-VERD, 12 Nov 2026).
import { partyHref } from '@/lib/party-verdict';

// href: the section's landing page, which carries its "In this section" row. page: where the header and the phone panel
// send a click on the section, the page listing every link in it (/sections/..., built from this list by
// app/sections/[slug]/page.tsx; Topics uses /topics, which already lists every topic). desc: one line from the
// destination page's own meta description, shortened, shown on the section page (the ones in lib/page-descriptions.ts
// are the page's meta description itself, report 61). group: a subheading on the section
// page (Accountability has two, Parliament four). compact: shown as a small name card in a grid on the section page
// (the 15 parties).
export type NavLink = { label: string; href: string; desc?: string; group?: string; compact?: boolean };
export type NavItem = { label: string; href: string; page?: string; children?: NavLink[] };
// The menu (Cowork ENTRY 502, owner approved 22 Nov 2026, from T2's audit audit/menu-501/REPORT.md): six headings, Your
// area, Parliament, Government, Money and influence, Read and Parties, then A to Z (owner 22 Nov: no Home, Search or
// State of the nation item; State of the Nation and the dashboard sit under Government, Official figures). This
// one list drives the desktop header, the phone menu (PHONE_MENU_GROUPS below is built from it), the section pages and
// the A to Z, so they always match. No page was removed: About, Contact, Commission research and Donate are in the
// footer (OpenGovShell.tsx); the old section addresses /sections/local, /accountability and /vote redirect to the new ones.
// The header row (owner, 22 Nov 2026, ENTRY 502): no Home item (the OPENGOVT logo links home; the phone menu keeps a Home
// link), no Search item (search is on the homepage, in the A to Z and the footer; the phone bar keeps its search icon)
// and the directory link reads 'A to Z', so the row sits inside the folder at 1280 and 1440.
export const NAV: NavItem[] = [
  { label: 'Your area', href: '/your-area', page: '/sections/your-area', children: [
    { label: 'Find Your MP', href: '/find-your-mp', desc: 'Enter your postcode to find your MP, their voting record, expenses, declared interests and contributions.' },
    { label: 'Your Area', href: '/your-area', desc: 'Your council and the latest local figures for your area, from a postcode, town or council.' },
    { label: 'Councils', href: '/councils', desc: 'Every UK principal local authority, 382 in total, including Northern Irish councils.' },
    { label: 'Worst Places to Live', href: '/council-areas/lowest-scores', desc: 'Every English council area scored the same way on eleven official measures: the ten with the lowest scores, and why.' },
    { label: 'Sewage Spills', href: '/sewage', desc: 'How long storm overflows spilled sewage in every council area and constituency in England, Scotland and Northern Ireland, from monitoring data. Wales is not included yet.' },
    { label: 'Welfare Spending in Your Area', href: '/tools/welfare', desc: 'Universal Credit, Housing Benefit, PIP, DLA, Carer\'s Allowance and ESA spending and caseloads in your area.' },
    { label: 'Child Poverty', href: '/councils/child-poverty', desc: PAGE_DESCRIPTIONS['/councils/child-poverty'] },
    { label: 'Children in Care', href: '/councils/children-in-care', desc: PAGE_DESCRIPTIONS['/councils/children-in-care'] },
    { label: 'Free School Meals', href: '/councils/free-school-meals', desc: PAGE_DESCRIPTIONS['/councils/free-school-meals'] },
    { label: 'Youth Justice', href: '/councils/youth-justice', desc: PAGE_DESCRIPTIONS['/councils/youth-justice'] },
    { label: 'Blue Badges', href: '/councils/blue-badges', desc: PAGE_DESCRIPTIONS['/councils/blue-badges'] },
    { label: 'Road Condition', href: '/councils/road-condition', desc: PAGE_DESCRIPTIONS['/councils/road-condition'] },
    { label: 'HMOs', href: '/councils/hmos', desc: PAGE_DESCRIPTIONS['/councils/hmos'] },
    { label: 'Constituencies', href: '/constituencies', desc: 'All 650 UK parliamentary constituencies by nation and region: the MP, the 2024 result, byelections, petitions and councils.' },
    ...(SHOW_LEAGUE_TABLE ? [{ label: 'How Council Areas Compare', href: '/councils/league-table' }] : []),
  ] },
  { label: 'Parliament', href: '/bills', page: '/sections/parliament', children: [
    { group: 'Members', label: 'All MPs', href: '/mps', desc: 'Profiles of all 650 UK MPs: voting records, expenses, registered interests and contact details.' },
    { group: 'Members', label: 'House of Lords', href: '/lords', desc: 'Every member of the House of Lords: party, type of peerage, and the written questions they have asked.' },
    { group: 'Members', label: 'MP Activity', href: '/transparency/mp-activity', desc: 'Every current MP ranked by how often they have spoken in Parliament since the July 2024 general election, from Hansard.' },
    { group: 'Business', label: 'Bills', href: '/bills', desc: 'The bills going through Parliament: stage, sponsor, how MPs voted and how opengovt users voted.' },
    { group: 'Business', label: 'Bills by Session', href: '/bills/sessions', desc: 'Every bill since the 2006 to 2007 session: which became law, which were withdrawn or ran out of time.' },
    { group: 'Business', label: 'Parliamentary Votes', href: '/divisions', desc: 'Recorded votes in the House of Commons back to October 2004, with how the House divided.' },
    { group: 'Business', label: 'Commons Debates', href: '/debates', desc: 'Every debate held in the House of Commons since the July 2024 general election, by date and section.' },
    { group: 'Business', label: 'Written Questions', href: '/questions', desc: 'Search every written question since the July 2024 general election by words, MP or peer, department and date.' },
    { group: 'Business', label: 'Prime Minister\'s Questions', href: '/pmqs', desc: 'Prime Minister\'s Questions: every session since 1961, and the Prime Minister\'s attendance since 1979.' },
    { group: 'Business', label: 'Questions to the Prime Minister, 1945 to 1961', href: '/pmqs/1945-to-1961', desc: 'Questions to the Prime Minister from 1945 to 1961, before PMQs had a fixed time.' },
    { group: 'Business', label: 'Early Day Motions', href: '/edms', desc: 'Every early day motion tabled in the House of Commons since the July 2024 general election, with its text, sponsors, signatures and amendments.' },
    { group: 'Business', label: 'Petitions', href: '/petitions', desc: 'Every UK Parliament petition since the July 2024 general election with 10,000 signatures or more: the government response, any debate, and signatures by constituency.' },
    { group: 'Business', label: 'Select Committees', href: '/committees', desc: 'Current membership of the 29 House of Commons select committees, from UK Parliament.' },
    { group: 'Business', label: 'Standards Cases', href: '/standards', desc: 'Decisions published by the Parliamentary Commissioner for Standards: allegations rectified, not upheld and reported to the Committee on Standards.' },
    { group: 'Laws', label: 'Laws', href: '/laws', desc: 'Acts of the UK Parliament that have received Royal Assent, with original sponsor and stage history.' },
    { group: 'Laws', label: 'Laws Made Without a Vote', href: '/laws/made-without-a-vote', desc: PAGE_DESCRIPTIONS['/laws/made-without-a-vote'] },
    { group: 'Laws', label: 'Treaties', href: '/treaties', desc: PAGE_DESCRIPTIONS['/treaties'] },
  ] },
  { label: 'Government', href: '/departments', page: '/sections/government', children: [
    { group: 'Departments', label: 'All Departments', href: '/departments', desc: 'All 23 UK government departments: Secretary of State, junior ministers, budget and a performance report.' },
    ...(RECOMMENDATIONS_PUBLIC ? [{ group: 'Departments', label: 'Recommendations', href: '/recommendations', desc: 'Committee of Public Accounts recommendations and the government’s answers in Treasury Minutes: its response, target dates and what happened next.' }] : []),
    { group: 'Departments', label: 'Department Budgets', href: '/spending', desc: 'Total Departmental Expenditure Limits for every UK government department, ranked.' },
    { group: 'Departments', label: 'Civil Service', href: '/civil-service', desc: 'Headcount and FTE for every UK government department, ranked.' },
    ...(SHOW_YOUR_TAX_POUND ? [{ group: 'Departments', label: 'Your Tax Pound', href: '/your-tax-pound' }] : []),
    ...(SHOW_BUDGET_CHOICES ? [{ group: 'Departments', label: 'Budget Choices', href: '/budget-trade-offs' }] : []),
    { group: 'Ministers and advisers', label: "Ministers' Meetings", href: '/transparency/ministers-meetings', desc: PAGE_DESCRIPTIONS['/transparency/ministers-meetings'] },
    { group: 'Ministers and advisers', label: "Ministers' Hospitality", href: '/transparency/hospitality', desc: PAGE_DESCRIPTIONS['/transparency/hospitality'] },
    { group: 'Ministers and advisers', label: 'Special Advisers', href: '/transparency/special-advisers', desc: 'Every current Special Adviser, their department, and the gifts, hospitality and meetings they declared.' },
    { group: 'Official figures', label: 'State of the Nation', href: '/state-of-the-nation', desc: 'Inflation, growth, jobs, public borrowing and debt, NHS waits, courts, homelessness and migration: official figures.' },
    { group: 'Official figures', label: 'State Dashboard', href: '/transparency/state-dashboard', desc: 'The state of England\'s public services, tracked from official primary sources, each with its source.' },
    { group: 'What government does', label: 'Press Releases', href: '/transparency/press-releases', desc: 'UK Government department press releases from 2007 to today, plus Commons select committee reports.' },
    { group: 'What government does', label: 'Major Projects', href: '/transparency/major-projects', desc: 'Every project in the Government Major Projects Portfolio, with its delivery rating and whole life cost.' },
    { group: 'What government does', label: 'Ministerial Directions', href: '/transparency/ministerial-directions', desc: 'Every ministerial direction published since 2015: what was directed, by whom and when.' },
    { group: 'What government does', label: 'Freedom of Information', href: '/transparency/freedom-of-information', desc: 'How many FOI requests each department received, answered on time and refused.' },
    { group: 'What government does', label: 'Government Contracts', href: '/transparency/contracts', desc: PAGE_DESCRIPTIONS['/transparency/contracts'] },
  ] },
  { label: 'Money and influence', href: '/money', page: '/sections/money-and-influence', children: [
    { group: "MPs' money", label: 'Expenses', href: '/expenses', desc: PAGE_DESCRIPTIONS['/expenses'] },
    { group: "MPs' money", label: 'Refused Expenses', href: '/expenses/refused', desc: 'Expense claims IPSA refused and money MPs repaid, by year, by MP and by reason.' },
    { group: "MPs' money", label: 'Second Jobs', href: '/second-jobs', desc: 'Every current MP with declared outside earnings, grouped by party: hours, totals and employers.' },
    { group: "MPs' money", label: 'MP Earnings', href: '/earnings', desc: 'Every MP\'s personal earnings (salary, ministerial pay, outside earnings) beside their public spend.' },
    { group: "MPs' money", label: 'Register of Interests', href: '/transparency/register-of-interests', desc: 'Search the Register of Members\' Financial Interests: gifts, hospitality, employment, visits and shares.' },
    { group: "MPs' money", label: 'Register History', href: '/register-history', desc: 'Every published edition of the Register of Members\' Financial Interests from November 2000 to March 2024.' },
    { group: 'Donations', label: 'Donations', href: '/transparency/donations', desc: PAGE_DESCRIPTIONS['/transparency/donations'] },
    { group: 'Donations', label: 'Donors', href: '/donors', desc: 'Every named donor in the Electoral Commission\'s register, ranked by total given.' },
    { group: 'Donations', label: 'Donations Explained', href: '/explainers/donations', desc: 'How the UK political donation rules work: thresholds, permissibility, timing and sanctions.' },
    { group: 'Donations: more', label: 'Foreign Donations', href: '/donations/foreign', desc: PAGE_DESCRIPTIONS['/donations/foreign'] },
    { group: 'Donations: more', label: 'Impermissible Donations', href: '/donations/impermissible', desc: PAGE_DESCRIPTIONS['/donations/impermissible'] },
    { group: 'Donations: more', label: 'Late Disclosed Donations', href: '/donations/late-disclosed', desc: PAGE_DESCRIPTIONS['/donations/late-disclosed'] },
    { group: 'Donations: more', label: 'Trust Funded Donations', href: '/donations/trust-funded', desc: PAGE_DESCRIPTIONS['/donations/trust-funded'] },
    { group: 'Donations: more', label: 'Paid Twice', href: '/donations/double-dip', desc: PAGE_DESCRIPTIONS['/donations/double-dip'] },
    { group: 'Donations: more', label: 'Donors Holding Government Contracts', href: '/donations/government-contractors', desc: PAGE_DESCRIPTIONS['/donations/government-contractors'] },
    { group: 'Donations: more', label: 'Donations by Constituency', href: '/donations/constituencies', desc: PAGE_DESCRIPTIONS['/donations/constituencies'] },
    { group: 'Donations: more', label: 'Bequests', href: '/donations/bequest', desc: PAGE_DESCRIPTIONS['/donations/bequest'] },
    { group: 'Donations: more', label: 'Leadership Contest Donations', href: '/donations/leadership-contests', desc: PAGE_DESCRIPTIONS['/donations/leadership-contests'] },
    { group: 'Donations: more', label: 'Sponsored Visits', href: '/donations/sponsored-visits', desc: PAGE_DESCRIPTIONS['/donations/sponsored-visits'] },
    { group: 'Influence', label: 'Lobbying', href: '/lobbying', desc: 'Who meets ministers most often, and which consultant lobbying firms act for which clients.' },
    { group: 'Influence', label: 'Organisations', href: '/organisations', desc: PAGE_DESCRIPTIONS['/organisations'] },
    { group: 'Influence', label: 'APPG Funding', href: '/transparency/appgs', desc: PAGE_DESCRIPTIONS['/transparency/appgs'] },
    { group: 'Influence', label: 'APPG Funders', href: '/appg-funders', desc: 'Every organisation that funds one or more All Party Parliamentary Groups, ranked by groups funded.' },
    { group: 'Influence', label: 'APPG Secretariats', href: '/secretariats', desc: 'The firms and charities that run All Party Parliamentary Groups, ranked by the number of groups each runs.' },
    { group: 'Influence', label: 'Revolving Door', href: '/transparency/revolving-door', desc: PAGE_DESCRIPTIONS['/transparency/revolving-door'] },
    { group: 'Influence', label: 'Transparency Overview', href: '/transparency', desc: 'Every transparency page on opengovt in one place: registers, money, lobbying and government.' },
    { group: 'Influence', label: 'Money & Power', href: '/money', desc: 'Patterns across registers: MPs paid twice, contractors who donate, APPG funders and lobby firms.' },
  ] },
  { label: 'Read', href: '/reports', page: '/sections/read', children: [
    { label: 'Reports', href: '/reports' },
    { label: 'This Week in Parliament', href: '/this-week', desc: 'The bills coming up in the House of Commons over the next seven days, and the most recent votes.' },
    { label: 'All Topics', href: '/topics', desc: 'Every policy area in one place: its department, votes, bills and the MPs who scrutinise it.' },
  ] },
  { label: 'Parties', href: '/parties', page: '/sections/parties', children: [
    { group: 'Parties', label: 'All Parties', href: '/parties', desc: PAGE_DESCRIPTIONS['/parties'] },
    { group: 'Parties', label: 'Manifesto Comparisons', href: '/parties/manifestos', desc: 'Compare the 2024 General Election manifestos of 15 parties across 11 policy themes.' },
    { group: 'Parties', label: 'Labour', href: partyHref('labour'), compact: true, desc: partyDescription(PARTY_NAMES['labour']) },
    { group: 'Parties', label: 'Conservative', href: partyHref('conservative'), compact: true, desc: partyDescription(PARTY_NAMES['conservative']) },
    { group: 'Parties', label: 'Liberal Democrats', href: partyHref('liberal-democrats'), compact: true, desc: partyDescription(PARTY_NAMES['liberal-democrats']) },
    { group: 'Parties', label: 'SNP', href: partyHref('snp'), compact: true, desc: partyDescription(PARTY_NAMES['snp']) },
    { group: 'Parties', label: 'Reform UK', href: partyHref('reform-uk'), compact: true, desc: partyDescription(PARTY_NAMES['reform-uk']) },
    { group: 'Parties', label: 'Sinn Féin', href: partyHref('sinn-fein'), compact: true, desc: partyDescription(PARTY_NAMES['sinn-fein']) },
    { group: 'Parties', label: 'Green Party', href: partyHref('green'), compact: true, desc: partyDescription(PARTY_NAMES['green']) },
    { group: 'Parties', label: 'DUP', href: partyHref('dup'), compact: true, desc: partyDescription(PARTY_NAMES['dup']) },
    { group: 'Parties', label: 'Plaid Cymru', href: partyHref('plaid-cymru'), compact: true, desc: partyDescription(PARTY_NAMES['plaid-cymru']) },
    { group: 'Parties', label: 'SDLP', href: partyHref('sdlp'), compact: true, desc: partyDescription(PARTY_NAMES['sdlp']) },
    { group: 'Parties', label: 'Alliance', href: partyHref('alliance'), compact: true, desc: partyDescription(PARTY_NAMES['alliance']) },
    { group: 'Parties', label: 'UUP', href: partyHref('uup'), compact: true, desc: partyDescription(PARTY_NAMES['uup']) },
    { group: 'Parties', label: 'TUV', href: partyHref('tuv'), compact: true, desc: partyDescription(PARTY_NAMES['tuv']) },
    { group: 'Parties', label: 'Restore Britain', href: partyHref('restore-britain'), compact: true, desc: partyDescription(PARTY_NAMES['restore-britain']) },
    { group: 'Parties', label: 'Your Party', href: partyHref('your-party'), compact: true, desc: partyDescription(PARTY_NAMES['your-party']) },
    { group: 'Polls', label: "opengovt Polls", href: '/polls', desc: 'Polls on issues in Parliament and government. Have your say and see the results.' },
  ] },
  { label: 'A to Z', href: '/directory' },
];


// The phone menu (ENTRY 502): the same headings as the desktop row, each opening to its links (MobileMenu.tsx), built
// from NAV so the two menus cannot differ. Home is the wordmark; Search and A to Z are their own lines.
export const PHONE_MENU_GROUPS: { label: string; href: string; links: NavLink[] }[] = NAV
  .filter((n) => n.children?.length)
  .map((n) => ({ label: n.label, href: n.page ?? n.href, links: n.children! }));

// Where a click on a top level item goes: the section page when the section has one, otherwise its own page.
export function menuHref(item: NavItem): string {
  return item.page ?? item.href;
}

// The order of a section page's groups where it differs from the menu's (owner, 12 Nov 2026, T1-SECT: Departments
// directly under MPs on the Parliament page). Groups not named here follow, in the menu's order.
export const SECTION_GROUP_ORDER: Record<string, string[]> = {};

// The section pages at /sections/<slug> (every section with a page under /sections/; Topics keeps /topics).
export const SECTION_PAGES = NAV.filter((n) => n.page?.startsWith('/sections/')).map((n) => ({ slug: n.page!.slice('/sections/'.length), item: n }));

// The top level item a page belongs to, for aria-current in the header: the item whose own address, section page or
// links is the longest match for the path (so /transparency/mp-activity is Parliament, through its MPs group, not
// Accountability; pages under MPs, Parties and Departments are Parliament). A tie goes to the earlier item (/bills:
// Parliament, not Vote). Home matches only /.
export function currentSection(pathname: string): string | null {
  const under = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));
  let best: { label: string; len: number } | null = null;
  for (const item of NAV) {
    for (const href of [item.href, ...(item.page ? [item.page] : []), ...(item.children ?? []).map((c) => c.href)]) {
      if (under(href) && (!best || href.length > best.len)) best = { label: item.label, len: href.length };
    }
  }
  return best?.label ?? null;
}
