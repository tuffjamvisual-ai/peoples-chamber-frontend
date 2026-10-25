import './opengov-shell.css';
import { preload } from 'react-dom';
import Link from 'next/link';
import { topics } from '@/lib/topics';
import AccountTab from './AccountTab';
import { SHOW_LEAGUE_TABLE, SHOW_YOUR_TAX_POUND, SHOW_BUDGET_CHOICES } from '@/lib/feature-flags';

// OpenGovShell — the shared "OPEN GOVERNMENT" page template.
// Renders the folders-pile backdrop, the newb folder header (red-stamp masthead
// + nav + account tab) and the dossier expanding folder, with a per-page stamp.
// Drop page content into `children`; it renders inside the dossier folder.
//
// `pageStamp` = the small stamp top-right of the dossier folder (e.g. "Front
// Page", an MP's name). Replaces DossierShell as pages migrate to this look.

type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };
const NAV: NavItem[] = [
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

// Fine SVG noise mask that gives the stamps a patchy/distressed ink.
const DISTRESS = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='340' height='150'><filter id='d'><feTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='2' seed='6' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.4 1.12'/></filter><rect width='100%' height='100%' filter='url(%23d)'/></svg>")`;

export default function OpenGovShell({
  children,
  pageStamp,
  stampStyle,
  brandAsHeading,
}: {
  children: React.ReactNode;
  pageStamp?: string;
  /** Per-page override merged into the page-stamp wrapper (e.g. lower a long stamp). */
  stampStyle?: React.CSSProperties;
  /** Render the masthead brand as the page's <h1> (homepage only, for SEO). */
  brandAsHeading?: boolean;
}) {
  // Shared masthead brand styling; margin:0 neutralises the h1 default so the
  // <h1>/<span> variants render identically.
  // The folders backdrop is a CSS background (opengov-shell.css), so the browser only asked for it once the stylesheet
  // had arrived, and on desktop it is the largest thing painted (the LCP). Preloading it from the page head starts the
  // download with the HTML instead (25 Oct 2026, report 43); each width gets only the file its stylesheet uses.
  preload('/folders.webp', { as: 'image', media: '(min-width: 641px)', fetchPriority: 'high' });
  preload('/folders-900.webp', { as: 'image', media: '(max-width: 640px)' });
  const brandStyle: React.CSSProperties = { display: 'inline-block', margin: 0, opacity: 0.8, border: '0.07em solid #6b2417', padding: '0.14em 0.32em 0.06em', fontFamily: "var(--font-bebas), 'Bebas Neue', Impact, 'Arial Narrow', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, color: '#6b2417', fontSize: 'clamp(24px, 4.6vw, 64px)' };
  return (
    <div
      className="ng-page"
      style={{ minHeight: '100vh', margin: 0, backgroundColor: '#140d07', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3vh 0 8vh' }}
    >
      {/* Folders-pile backdrop, pinned to the viewport. */}
      {/* The image is set in opengov-shell.css (.og-backdrop) so phones get the 900px version. */}
      <div aria-hidden className="og-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: '#140d07', backgroundSize: '135%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: 'min(96vw, 1240px)' }}>
        {/* Header: newb folder with the OPEN GOVERNMENT red stamp + nav + tab. */}
        <div className="og-header" style={{ position: 'relative', width: '100%', aspectRatio: '1086 / 1448', containerType: 'inline-size' }}>
          {/* Phones (25 Oct 2026, report 43): sizes says 60vw below 640px so a 3x phone takes the 800px file (72 KB) and
              a 2x phone the 600px one (16 KB), not the full 1086px file (128 KB); still about twice the shown width. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/newb.webp" srcSet="/newb-600.webp 600w, /newb-800.webp 800w, /newb.webp 1086w" sizes="(max-width: 640px) 60vw, min(96vw, 1240px)" fetchPriority="high" alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none', transform: 'rotate(-2.5deg)', filter: 'saturate(0.84) drop-shadow(0 18px 38px rgba(0,0,0,0.55))' }} />

          <div className="ng-tab" style={{ transform: 'rotate(-2.5deg)' }}>
            <AccountTab />
            <span aria-hidden style={{ display: 'inline-block', width: '1px', height: '0.95em', background: 'currentColor', opacity: 0.5, margin: '0 7px' }} />
            <Link href="/donate">Support Us</Link>
          </div>

          <div className="og-masthead-wrap" style={{ position: 'absolute', top: '3.6%', left: '5%', width: '90%', textAlign: 'left', zIndex: 5, pointerEvents: 'none', transform: 'rotate(-2.5deg)' }}>
            <Link href="/" style={{ pointerEvents: 'auto', textDecoration: 'none' }}>
              {brandAsHeading
                ? <h1 style={brandStyle}>opengovt</h1>
                : <span style={brandStyle}>opengovt</span>}
            </Link>
          </div>

          <nav aria-label="Primary" className="og-navwrap" style={{ position: 'absolute', top: '10.6%', left: '2%', width: '96%', zIndex: 5, transform: 'translateX(1.5%) rotate(-2.5deg)' }}>
            <ul className="ng-nav">
              {NAV.map((item) => (
                <li key={item.label}>
                  <a href={item.href}>{item.label}</a>
                  {item.children && (
                    <ul className="ng-sub">
                      {item.children.map((c) => (<li key={c.href}><a href={c.href}>{c.label}</a></li>))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Dossier expanding folder, overlapping up into the header. */}
        <div className="og-page og-dossier" style={{ position: 'relative', width: '90%', margin: '-115.5% 5% 0', containerType: 'inline-size' }}>
          <div className="dossier-frame" aria-hidden>
            <div className="d-top" />
            <div className="d-mid" />
            <div className="d-bottom" />
          </div>

          {pageStamp && (
            <div style={{ position: 'absolute', top: '1.4cqw', right: '4.5%', zIndex: 4, pointerEvents: 'none', ...stampStyle }}>
              <span style={{ display: 'inline-block', opacity: 0.8, border: '0.07em solid #6b2417', padding: '0.16em 0.36em 0.08em', fontFamily: "var(--font-bebas), 'Bebas Neue', Impact, 'Arial Narrow', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, color: '#6b2417', fontSize: 'clamp(18px, 4cqw, 52px)' }}>{pageStamp}</span>
            </div>
          )}

          <div className="dossier-content">
            {children}
            <footer style={{ marginTop: '48px', paddingTop: '18px', borderTop: '1px solid rgba(20,16,13,0.25)', fontFamily: "'Special Elite', monospace", fontSize: '15px', color: '#14100d' }}>
              <p style={{ margin: '0 0 14px', color: '#14100d', lineHeight: 1.65, maxWidth: '82ch' }}>
                Opengovt is independent and is not affiliated with GOV.UK, the UK Government, Parliament, any government department, local authority, public body or official public service.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 12px' }}>
                <a href="/privacy" style={{ color: '#14100d', textDecoration: 'none' }} className="no-hover-scale">Privacy</a>
                <span aria-hidden style={{ opacity: 0.4 }}>·</span>
                <a href="/terms" style={{ color: '#14100d', textDecoration: 'none' }} className="no-hover-scale">Terms</a>
                <span aria-hidden style={{ opacity: 0.4 }}>·</span>
                <a href="/contact" style={{ color: '#14100d', textDecoration: 'none' }} className="no-hover-scale">Contact</a>
                <span aria-hidden style={{ opacity: 0.4 }}>·</span>
                <a href="/commission" style={{ color: '#14100d', textDecoration: 'none' }} className="no-hover-scale">Commission research</a>
                <span style={{ flex: '1 1 auto', minWidth: '12px' }} />
                <span style={{ color: '#14100d' }}>opengovt · independent and nonpartisan</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
