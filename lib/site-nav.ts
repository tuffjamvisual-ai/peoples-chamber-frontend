// The site's main menu (25 Oct 2026, reports 47 and 57): the 13 top level sections and each section's pages. One list for
// the desktop header row (DESKTOP_NAV below, DesktopNav.tsx), the phone menu panel (MobileMenu.tsx) and the "In this
// section" rows on the section landing pages (SectionLinks.tsx), so they cannot drift apart. The desktop header has no
// dropdowns (report 57); a section's pages are listed on its landing page.
import { topics } from '@/lib/topics';
import { SHOW_LEAGUE_TABLE, SHOW_YOUR_TAX_POUND, SHOW_BUDGET_CHOICES } from '@/lib/feature-flags';

export type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };
export const NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'Topics', href: '/topics', children: topics.map((t) => ({ label: t.title, href: `/topics/${t.slug}` })) },
  { label: 'MPs', href: '/mps', children: [
    { label: 'Find Your MP', href: '/find-your-mp' },
    { label: 'All MPs', href: '/mps' },
    { label: 'MP Activity', href: '/transparency/mp-activity' },
    { label: 'MP Earnings', href: '/earnings' },
  ] },
  { label: 'Parliament', href: '/bills', children: [
    { label: 'Bills', href: '/bills' },
    { label: 'Select Committees', href: '/committees' },
    { label: 'Commons Debates', href: '/debates' },
    { label: 'Divisions', href: '/divisions' },
    { label: 'Press Releases', href: '/transparency/press-releases' },
    { label: 'Laws', href: '/laws' },
  ] },
  { label: 'Parties', href: '/parties', children: [
    { label: 'Manifesto Comparisons', href: '/parties' },
    { label: 'Labour', href: '/parties/labour/bio' },
    { label: 'Conservative', href: '/parties/conservative/bio' },
    { label: 'Liberal Democrats', href: '/parties/liberal-democrats/bio' },
    { label: 'SNP', href: '/parties/snp/bio' },
    { label: 'Reform UK', href: '/parties/reform-uk/bio' },
    { label: 'Sinn Féin', href: '/parties/sinn-fein/bio' },
    { label: 'Green Party', href: '/parties/green/bio' },
    { label: 'DUP', href: '/parties/dup/bio' },
    { label: 'Plaid Cymru', href: '/parties/plaid-cymru/bio' },
    { label: 'SDLP', href: '/parties/sdlp/bio' },
    { label: 'Alliance', href: '/parties/alliance/bio' },
    { label: 'UUP', href: '/parties/uup/bio' },
    { label: 'TUV', href: '/parties/tuv/bio' },
    { label: 'Restore Britain', href: '/parties/restore-britain/bio' },
    { label: 'Your Party', href: '/parties/your-party/bio' },
  ] },
  { label: 'Departments', href: '/departments', children: [
    { label: 'All Departments', href: '/departments' },
    { label: 'Department Budgets', href: '/spending' },
    { label: 'Civil Service', href: '/civil-service' },
    ...(SHOW_YOUR_TAX_POUND ? [{ label: 'Your Tax Pound', href: '/your-tax-pound' }] : []),
    ...(SHOW_BUDGET_CHOICES ? [{ label: 'Budget Choices', href: '/budget-trade-offs' }] : []),
  ] },
  { label: 'Local', href: '/councils', children: [
    { label: 'Councils', href: '/councils' },
    ...(SHOW_LEAGUE_TABLE ? [{ label: 'How Council Areas Compare', href: '/councils/league-table' }] : []),
    { label: 'Sewage Spills', href: '/sewage' },
  ] },
  { label: 'Accountability', href: '/transparency', children: [
    { label: 'State Dashboard', href: '/transparency/state-dashboard' },
    { label: 'Welfare Spending', href: '/tools/welfare' },
    { label: 'Register of Interests', href: '/transparency/register-of-interests' },
    { label: 'Expenses', href: '/expenses' },
    { label: 'Second Jobs', href: '/second-jobs' },
    { label: 'Lobbying', href: '/lobbying' },
    { label: 'Revolving Door', href: '/transparency/revolving-door' },
    { label: 'Special Advisers', href: '/transparency/special-advisers' },
    { label: 'Money & Power', href: '/money' },
    { label: 'Donations', href: '/transparency/donations' },
    { label: 'Donors', href: '/donors' },
    { label: 'Government Contracts', href: '/transparency/contracts' },
    { label: 'APPG Funding', href: '/transparency/appgs' },
    { label: 'Ministers Meetings', href: '/transparency/ministers-meetings' },
    { label: 'Ministers Hospitality', href: '/transparency/hospitality' },
  ] },
  { label: 'Reports', href: '/reports' },
  { label: 'Vote', href: '/polls', children: [
    { label: "opengovt Polls", href: '/polls' },
    { label: 'Vote on Bills', href: '/bills' },
  ] },
  { label: 'Commission', href: '/commission' },
  { label: 'Contact', href: '/contact' },
];

// The desktop header row (owner's choice, 25 Oct 2026, report 57, the TaxPayers' Alliance pattern): these sections as
// plain links, in this order. Home is the wordmark, Search an icon, Commission the button and Contact is in the footer.
const DESKTOP_SECTIONS = ['Topics', 'MPs', 'Parliament', 'Parties', 'Departments', 'Local', 'Accountability', 'Reports', 'Vote'];
export const DESKTOP_NAV: NavItem[] = DESKTOP_SECTIONS.map((label) => NAV.find((n) => n.label === label)!);

// The desktop section a page belongs to: the section whose own address or page addresses is the longest match for the
// path (so /transparency/mp-activity is MPs, not Accountability). A tie goes to the earlier section (/bills: Parliament).
export function desktopSectionFor(pathname: string): string | null {
  const under = (href: string) => pathname === href || pathname.startsWith(href + '/');
  let best: { label: string; len: number } | null = null;
  for (const item of DESKTOP_NAV) {
    for (const href of [item.href, ...(item.children ?? []).map((c) => c.href)]) {
      if (under(href) && (!best || href.length > best.len)) best = { label: item.label, len: href.length };
    }
  }
  return best?.label ?? null;
}

// The section whose landing page is this address, for the "In this section" rows.
export function navSection(label: string): NavItem | undefined {
  return NAV.find((n) => n.label === label);
}
