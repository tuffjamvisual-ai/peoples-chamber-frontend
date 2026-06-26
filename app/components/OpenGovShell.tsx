import './opengov-shell.css';

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
  { label: 'Bills', href: '/bills', children: [
    { label: 'All Bills', href: '/bills' },
    { label: 'Acts of Parliament', href: '/laws' },
  ] },
  { label: 'Peoples Polls', href: '/polls', children: [
    { label: 'All Polls', href: '/polls' },
    { label: 'Your Tax Pound', href: '/your-tax-pound' },
    { label: 'Budget Trade-Offs', href: '/budget-trade-offs' },
  ] },
  { label: 'Parties', href: '/parties', children: [
    { label: 'Manifesto Comparisons', href: '/parties' },
    { label: 'Labour', href: '/parties/labour/bio' },
    { label: 'Conservative', href: '/parties/conservative/bio' },
    { label: 'Liberal Democrats', href: '/parties/liberal-democrats/bio' },
    { label: 'SNP', href: '/parties/snp/bio' },
    { label: 'Reform UK', href: '/parties/reform-uk/bio' },
    { label: 'Green Party', href: '/parties/green/bio' },
    { label: 'Restore Britain', href: '/parties/restore-britain/bio' },
    { label: 'Your Party', href: '/parties/your-party/bio' },
  ] },
  { label: 'MPs', href: '/mps', children: [
    { label: 'All MPs', href: '/mps' },
    { label: 'Top Spenders', href: '/expenses' },
    { label: 'Earnings & Pay', href: '/earnings' },
  ] },
  { label: 'Departments', href: '/departments' },
  { label: 'Editorials', href: '/editorials' },
  { label: 'Transparency', href: '/transparency', children: [
    { label: 'All Datasets', href: '/transparency' },
    { label: 'MPs’ Second Jobs', href: '/second-jobs' },
    { label: 'Ministers’ Meetings', href: '/transparency/ministers-meetings' },
    { label: 'Revolving Door', href: '/transparency/revolving-door' },
    { label: 'Political Donations', href: '/transparency/donations' },
    { label: 'Local Councils', href: '/councils' },
    { label: 'Top Council Tax', href: '/council-tax' },
  ] },
  { label: 'Sign up / Log in', href: '/login' },
];

// Fine SVG noise mask that gives the stamps a patchy/distressed ink.
const DISTRESS = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='340' height='150'><filter id='d'><feTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='2' seed='6' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.4 1.12'/></filter><rect width='100%' height='100%' filter='url(%23d)'/></svg>")`;

export default function OpenGovShell({
  children,
  pageStamp,
}: {
  children: React.ReactNode;
  pageStamp?: string;
}) {
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
            <a href="/login">Account / Info</a>
            <span aria-hidden style={{ opacity: 0.55, margin: '0 4px' }}>|</span>
            <a href="/support">Support Us</a>
          </div>

          <div className="og-masthead-wrap" style={{ position: 'absolute', top: '5%', left: '5%', width: '90%', textAlign: 'left', zIndex: 5, pointerEvents: 'none', transform: 'rotate(-2.5deg)' }}>
            <a href="/" style={{ pointerEvents: 'auto', textDecoration: 'none' }}>
              <span style={{ display: 'inline-block', opacity: 0.8, border: '0.07em solid #6b2417', padding: '0.14em 0.32em 0.06em', fontFamily: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, color: '#6b2417', fontSize: 'clamp(24px, 4.6vw, 64px)' }}>Open Government</span>
            </a>
          </div>

          <nav aria-label="Primary" className="og-navwrap" style={{ position: 'absolute', top: '10.6%', left: '2%', width: '96%', zIndex: 5, transform: 'translateX(-1.6%) rotate(-2.5deg)' }}>
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
        <div className="og-page og-dossier" style={{ position: 'relative', width: '90%', margin: '-116% 5% 0', containerType: 'inline-size' }}>
          <div className="dossier-frame" aria-hidden>
            <div className="d-top" />
            <div className="d-mid" />
            <div className="d-bottom" />
          </div>

          {pageStamp && (
            <div style={{ position: 'absolute', top: '1.4cqw', right: '9.5%', zIndex: 4, pointerEvents: 'none' }}>
              <span style={{ display: 'inline-block', opacity: 0.72, border: '0.07em solid #6b2417', padding: '0.16em 0.36em 0.08em', fontFamily: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, color: '#6b2417', fontSize: 'clamp(18px, 4cqw, 52px)', WebkitMaskImage: DISTRESS, maskImage: DISTRESS, WebkitMaskSize: 'cover', maskSize: 'cover', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }}>{pageStamp}</span>
            </div>
          )}

          <div className="dossier-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
