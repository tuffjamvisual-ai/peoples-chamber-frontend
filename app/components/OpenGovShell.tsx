import './opengov-shell.css';
import { topics } from '@/lib/topics';
import AccountTab from './AccountTab';

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
  { label: 'Topics', href: '/topics', children: topics.map((t) => ({ label: t.title, href: `/topics/${t.slug}` })) },
  { label: 'MPs', href: '/mps', children: [
    { label: 'Find Your MP', href: '/find-your-mp' },
    { label: 'All MPs', href: '/mps' },
    { label: 'MP Activity', href: '/transparency/mp-activity' },
  ] },
  { label: 'Parliament', href: '/bills', children: [
    { label: 'Bills', href: '/bills' },
    { label: 'Commons Debates', href: '/debates' },
    { label: 'Divisions', href: '/divisions' },
    { label: 'Press Releases', href: '/transparency/press-releases' },
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
  { label: 'Departments', href: '/departments' },
  { label: 'Accountability', href: '/transparency', children: [
    { label: 'State Dashboard', href: '/transparency/state-dashboard' },
    { label: 'Register of Interests', href: '/transparency/register-of-interests' },
    { label: 'Expenses', href: '/expenses' },
    { label: 'Second Jobs', href: '/second-jobs' },
    { label: 'Revolving Door', href: '/transparency/revolving-door' },
    { label: 'Special Advisers', href: '/transparency/special-advisers' },
    { label: 'Donations', href: '/transparency/donations' },
    { label: 'Government Contracts', href: '/transparency/contracts' },
    { label: 'APPG Funding', href: '/transparency/appgs' },
    { label: 'Ministers Meetings', href: '/transparency/ministers-meetings' },
    { label: 'Ministers Hospitality', href: '/transparency/hospitality' },
  ] },
  { label: 'Reports', href: '/editorials', children: [
    { label: 'Investigations', href: '/editorials' },
    { label: 'Briefings', href: '/briefings' },
  ] },
  { label: 'Vote', href: '/polls', children: [
    { label: "opengovt Polls", href: '/polls' },
    { label: 'Vote on Bills', href: '/bills' },
  ] },
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
  const brandStyle: React.CSSProperties = { display: 'inline-block', margin: 0, opacity: 0.8, border: '0.07em solid #6b2417', padding: '0.14em 0.32em 0.06em', fontFamily: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, color: '#6b2417', fontSize: 'clamp(24px, 4.6vw, 64px)' };
  return (
    <div
      className="ng-page"
      style={{ minHeight: '100vh', margin: 0, backgroundColor: '#140d07', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3vh 0 8vh' }}
    >
      {/* Folders-pile backdrop, pinned to the viewport. */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, backgroundColor: '#140d07', backgroundImage: 'url(/folders.webp)', backgroundSize: '135%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: 'min(96vw, 1240px)' }}>
        {/* Header: newb folder with the OPEN GOVERNMENT red stamp + nav + tab. */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1086 / 1448', containerType: 'inline-size' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/newb.webp" alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none', transform: 'rotate(-2.5deg)', filter: 'saturate(0.84) drop-shadow(0 18px 38px rgba(0,0,0,0.55))' }} />

          <div className="ng-tab" style={{ transform: 'rotate(-2.5deg)' }}>
            <AccountTab />
            <span aria-hidden style={{ display: 'inline-block', width: '1px', height: '0.95em', background: 'currentColor', opacity: 0.5, margin: '0 7px' }} />
            <a href="/support">Support Us</a>
          </div>

          <div className="og-masthead-wrap" style={{ position: 'absolute', top: '3.6%', left: '5%', width: '90%', textAlign: 'left', zIndex: 5, pointerEvents: 'none', transform: 'rotate(-2.5deg)' }}>
            <a href="/" style={{ pointerEvents: 'auto', textDecoration: 'none' }}>
              {brandAsHeading
                ? <h1 style={brandStyle}>opengovt</h1>
                : <span style={brandStyle}>opengovt</span>}
            </a>
          </div>

          <nav aria-label="Primary" className="og-navwrap" style={{ position: 'absolute', top: '10.6%', left: '2%', width: '96%', zIndex: 5, transform: 'translateX(5%) rotate(-2.5deg)' }}>
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
              <span style={{ display: 'inline-block', opacity: 0.8, border: '0.07em solid #6b2417', padding: '0.16em 0.36em 0.08em', fontFamily: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, color: '#6b2417', fontSize: 'clamp(18px, 4cqw, 52px)' }}>{pageStamp}</span>
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
