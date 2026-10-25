// The site's main menu (25 Oct 2026, reports 47 and 60): the 13 top level sections and each section's links. One list
// for the desktop header (OpenGovShell.tsx, no dropdowns since report 60), the phone menu panel (MobileMenu.tsx), the
// section pages (app/sections/[slug]/page.tsx) and the "In this section" rows on the section landing pages
// (SectionLinks.tsx), so they cannot drift apart.
import { topics } from '@/lib/topics';
import { SHOW_LEAGUE_TABLE, SHOW_YOUR_TAX_POUND, SHOW_BUDGET_CHOICES } from '@/lib/feature-flags';
import { PAGE_DESCRIPTIONS, partyDescription, PARTY_NAMES, VOTE_ON_BILLS_DESCRIPTION } from '@/lib/page-descriptions';

// href: the section's landing page, which carries its "In this section" row. page: where the header and the phone panel
// send a click on the section, the page listing every link in it (/sections/..., built from this list by
// app/sections/[slug]/page.tsx; Topics uses /topics, which already lists every topic). desc: one line from the
// destination page's own meta description, shortened, shown on the section page (the ones in lib/page-descriptions.ts
// are the page's meta description itself, report 61). group: a subheading on the section
// page (Accountability has two).
export type NavLink = { label: string; href: string; desc?: string; group?: string };
export type NavItem = { label: string; href: string; page?: string; children?: NavLink[] };
export const NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'Topics', href: '/topics', page: '/topics', children: topics.map((t) => ({ label: t.title, href: `/topics/${t.slug}` })) },
  { label: 'MPs', href: '/mps', page: '/sections/mps', children: [
    { label: 'Find Your MP', href: '/find-your-mp', desc: 'Enter your postcode to find your MP, their voting record, expenses, declared interests and contributions.' },
    { label: 'All MPs', href: '/mps', desc: 'Profiles of all 650 UK MPs: voting records, expenses, registered interests and contact details.' },
    { label: 'MP Activity', href: '/transparency/mp-activity', desc: 'Every current MP ranked by how often they have spoken in Parliament this term, from Hansard.' },
    { label: 'MP Earnings', href: '/earnings', desc: 'Every MP\'s personal earnings (salary, ministerial pay, outside earnings) beside their public spend.' },
  ] },
  { label: 'Parliament', href: '/bills', page: '/sections/parliament', children: [
    { label: 'Bills', href: '/bills', desc: 'The bills going through Parliament now: stage, sponsor, how MPs voted and how Open Govt users voted.' },
    { label: 'Select Committees', href: '/committees', desc: 'Current membership of the 29 House of Commons select committees, from UK Parliament.' },
    { label: 'Commons Debates', href: '/debates', desc: 'Every debate held in the House of Commons this Parliament, by date and section.' },
    { label: 'Divisions', href: '/divisions', desc: 'Every recorded vote in the House of Commons since March 2016, with how the House divided.' },
    { label: 'Press Releases', href: '/transparency/press-releases', desc: 'UK Government department press releases from 2007 to today, plus Commons select committee reports.' },
    { label: 'Laws', href: '/laws', desc: 'Acts of the UK Parliament that have received Royal Assent, with original sponsor and stage history.' },
  ] },
  { label: 'Parties', href: '/parties', page: '/sections/parties', children: [
    { label: 'Manifesto Comparisons', href: '/parties', desc: 'Compare the 2024 General Election manifestos of 15 parties across 11 policy themes.' },
    { label: 'Labour', href: '/parties/labour/bio', desc: partyDescription(PARTY_NAMES['labour']) },
    { label: 'Conservative', href: '/parties/conservative/bio', desc: partyDescription(PARTY_NAMES['conservative']) },
    { label: 'Liberal Democrats', href: '/parties/liberal-democrats/bio', desc: partyDescription(PARTY_NAMES['liberal-democrats']) },
    { label: 'SNP', href: '/parties/snp/bio', desc: partyDescription(PARTY_NAMES['snp']) },
    { label: 'Reform UK', href: '/parties/reform-uk/bio', desc: partyDescription(PARTY_NAMES['reform-uk']) },
    { label: 'Sinn Féin', href: '/parties/sinn-fein/bio', desc: partyDescription(PARTY_NAMES['sinn-fein']) },
    { label: 'Green Party', href: '/parties/green/bio', desc: partyDescription(PARTY_NAMES['green']) },
    { label: 'DUP', href: '/parties/dup/bio', desc: partyDescription(PARTY_NAMES['dup']) },
    { label: 'Plaid Cymru', href: '/parties/plaid-cymru/bio', desc: partyDescription(PARTY_NAMES['plaid-cymru']) },
    { label: 'SDLP', href: '/parties/sdlp/bio', desc: partyDescription(PARTY_NAMES['sdlp']) },
    { label: 'Alliance', href: '/parties/alliance/bio', desc: partyDescription(PARTY_NAMES['alliance']) },
    { label: 'UUP', href: '/parties/uup/bio', desc: partyDescription(PARTY_NAMES['uup']) },
    { label: 'TUV', href: '/parties/tuv/bio', desc: partyDescription(PARTY_NAMES['tuv']) },
    { label: 'Restore Britain', href: '/parties/restore-britain/bio', desc: partyDescription(PARTY_NAMES['restore-britain']) },
    { label: 'Your Party', href: '/parties/your-party/bio', desc: partyDescription(PARTY_NAMES['your-party']) },
  ] },
  { label: 'Departments', href: '/departments', page: '/sections/departments', children: [
    { label: 'All Departments', href: '/departments', desc: 'All 23 UK government departments: Secretary of State, junior ministers, budget and a performance report.' },
    { label: 'Department Budgets', href: '/spending', desc: 'Total Departmental Expenditure Limits for every UK government department, ranked.' },
    { label: 'Civil Service', href: '/civil-service', desc: 'Headcount and FTE for every UK government department, ranked.' },
    ...(SHOW_YOUR_TAX_POUND ? [{ label: 'Your Tax Pound', href: '/your-tax-pound' }] : []),
    ...(SHOW_BUDGET_CHOICES ? [{ label: 'Budget Choices', href: '/budget-trade-offs' }] : []),
  ] },
  { label: 'Local', href: '/councils', page: '/sections/local', children: [
    { label: 'Councils', href: '/councils', desc: 'Every UK principal local authority, 382 in total, including Northern Irish councils.' },
    ...(SHOW_LEAGUE_TABLE ? [{ label: 'How Council Areas Compare', href: '/councils/league-table' }] : []),
    { label: 'Sewage Spills', href: '/sewage', desc: 'How long storm overflows spilled sewage in every council area and constituency, from monitoring data.' },
  ] },
  { label: 'Accountability', href: '/transparency', page: '/sections/accountability', children: [
    { group: 'Accountability', label: 'State Dashboard', href: '/transparency/state-dashboard', desc: 'The state of England\'s public services, tracked from official primary sources, each with its source.' },
    { group: 'Accountability', label: 'Welfare Spending', href: '/tools/welfare', desc: 'Universal Credit, Housing Benefit, PIP, DLA, Carer\'s Allowance and ESA spending and caseloads in your area.' },
    { group: 'Accountability', label: 'Register of Interests', href: '/transparency/register-of-interests', desc: 'Search the Register of Members\' Financial Interests: gifts, hospitality, employment, visits and shares.' },
    { group: 'Accountability', label: 'Expenses', href: '/expenses', desc: PAGE_DESCRIPTIONS['/expenses'] },
    { group: 'Accountability', label: 'Second Jobs', href: '/second-jobs', desc: 'Every current MP with declared outside earnings, grouped by party: hours, totals and employers.' },
    { group: 'Accountability', label: 'Lobbying', href: '/lobbying', desc: 'Who meets ministers most often, and which consultant lobbying firms act for which clients.' },
    { group: 'Accountability', label: 'Revolving Door', href: '/transparency/revolving-door', desc: PAGE_DESCRIPTIONS['/transparency/revolving-door'] },
    { group: 'Accountability', label: 'Special Advisers', href: '/transparency/special-advisers', desc: 'Every current Special Adviser, their department, and the gifts, hospitality and meetings they declared.' },
    { group: 'Money & Power', label: 'Money & Power', href: '/money', desc: 'Patterns across registers: MPs paid twice, contractors who donate, APPG funders and lobby firms.' },
    { group: 'Money & Power', label: 'Donations', href: '/transparency/donations', desc: PAGE_DESCRIPTIONS['/transparency/donations'] },
    { group: 'Money & Power', label: 'Donors', href: '/donors', desc: 'Every named donor in the Electoral Commission\'s register, ranked by total given.' },
    { group: 'Money & Power', label: 'Government Contracts', href: '/transparency/contracts', desc: PAGE_DESCRIPTIONS['/transparency/contracts'] },
    { group: 'Money & Power', label: 'APPG Funding', href: '/transparency/appgs', desc: PAGE_DESCRIPTIONS['/transparency/appgs'] },
    { group: 'Money & Power', label: 'Ministers Meetings', href: '/transparency/ministers-meetings', desc: PAGE_DESCRIPTIONS['/transparency/ministers-meetings'] },
    { group: 'Money & Power', label: 'Ministers Hospitality', href: '/transparency/hospitality', desc: PAGE_DESCRIPTIONS['/transparency/hospitality'] },
  ] },
  { label: 'Reports', href: '/reports' },
  { label: 'Vote', href: '/polls', page: '/sections/vote', children: [
    { label: "opengovt Polls", href: '/polls', desc: 'Polls on issues in Parliament and government. Have your say and see the results.' },
    { label: 'Vote on Bills', href: '/bills', desc: VOTE_ON_BILLS_DESCRIPTION },
  ] },
  { label: 'Commission', href: '/commission' },
  { label: 'Contact', href: '/contact' },
];

// The section whose landing page is this address, for the "In this section" rows.
export function navSection(label: string): NavItem | undefined {
  return NAV.find((n) => n.label === label);
}

// Where a click on a top level item goes: the section page when the section has one, otherwise its own page.
export function menuHref(item: NavItem): string {
  return item.page ?? item.href;
}

// The section pages at /sections/<slug> (every section with a page under /sections/; Topics keeps /topics).
export const SECTION_PAGES = NAV.filter((n) => n.page?.startsWith('/sections/')).map((n) => ({ slug: n.page!.slice('/sections/'.length), item: n }));

// The top level item a page belongs to, for aria-current in the header: the item whose own address, section page or
// links is the longest match for the path (so /transparency/mp-activity is MPs, not Accountability). A tie goes to the
// earlier item (/bills: Parliament, not Vote). Home matches only /.
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
