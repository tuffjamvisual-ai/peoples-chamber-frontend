import type { Metadata } from 'next';
import './landing-demo2.css';

// /landing-demo2 — DEMO ONLY (noindex). The folders-pile backdrop (folders.webp)
// with a single empty "oldfolder" centred on it. No masthead, nav, or article
// content — left unpopulated per request. The live landing page is untouched.

export const metadata: Metadata = {
  title: 'Landing demo — old folder (preview)',
  robots: { index: false, follow: false },
};

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
  { label: 'Support Us', href: '/support' },
];

export default function LandingDemo2() {
  return (
    <div
      className="ng-page"
      style={{
        minHeight: '100vh',
        margin: 0,
        backgroundColor: '#140d07',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3vh 0 8vh',
      }}
    >
      {/* Folders-pile backdrop, pinned to the viewport. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#140d07',
          backgroundImage: 'url(/folders.webp)',
          backgroundSize: '135%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Empty clean folder, centred on the backdrop. */}
      <div style={{ position: 'relative', zIndex: 1, width: 'min(96vw, 1240px)' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1086 / 1448', containerType: 'inline-size' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/newb.webp"
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
              transform: 'rotate(-2.5deg)',
              // slightly less golden (gentle desaturate).
              filter: 'saturate(0.84) drop-shadow(0 18px 38px rgba(0,0,0,0.55))',
            }}
          />

          {/* Main-site dossier folder template (folder-top/mid/bottom slices,
              assembled as in DossierShell) laid on top of the fold folder. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '13%',
              left: '5%',
              width: '90%',
              height: '83%',
              display: 'flex',
              flexDirection: 'column',
              // original dossier colour (native) — drop shadows only.
              filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.5)) drop-shadow(-9px 2px 10px rgba(0,0,0,0.4))',
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: '100%', aspectRatio: '1023 / 160', backgroundImage: 'url(/folder-top.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }} />
            <div style={{ flex: '1 1 auto', backgroundImage: 'url(/folder-mid.webp)', backgroundRepeat: 'repeat-y', backgroundSize: '100% auto' }} />
            <div style={{ width: '100%', aspectRatio: '1023 / 157', backgroundImage: 'url(/folder-bottom.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', marginTop: '-5%', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 34%)', maskImage: 'linear-gradient(180deg, transparent 0%, #000 34%)' }} />
          </div>

          {/* "OPEN GOVERNMENT" masthead — top-secret red stamp with a red box
              all round, on the newb back folder (rotated to match). */}
          <div
            style={{
              position: 'absolute',
              top: '5%',
              left: '5%',
              width: '90%',
              textAlign: 'left',
              zIndex: 5,
              pointerEvents: 'none',
              transform: 'rotate(-2.5deg)',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                border: '0.07em solid #6b2417',
                padding: '0.14em 0.32em 0.06em',
                fontFamily: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif",
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                lineHeight: 1,
                color: '#6b2417',
                fontSize: 'clamp(24px, 4.6vw, 64px)',
              }}
            >
              Open Government
            </span>
          </div>

          {/* Nav bar on the back folder, below the masthead (rotated to match). */}
          <nav
            aria-label="Primary"
            style={{
              position: 'absolute',
              top: '10.8%',
              left: '5%',
              width: '90%',
              zIndex: 5,
              transform: 'rotate(-2.5deg)',
            }}
          >
            <ul className="ng-nav" style={{ justifyContent: 'flex-start' }}>
              {NAV.map((item) => (
                <li key={item.label}>
                  <a href={item.href}>{item.label}</a>
                  {item.children && (
                    <ul className="ng-sub">
                      {item.children.map((c) => (
                        <li key={c.href}><a href={c.href}>{c.label}</a></li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
