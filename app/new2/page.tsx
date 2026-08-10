// Temp page — exact reproduction of ~/Downloads/new2.zip
// (peoples-chamber-exact-claude: index.html + src/main.jsx + src/styles.css + assets/reference.png).
// The source is a React/Vite component; reproduced here as a Next route with markup + CSS
// verbatim, scoped to a `.new2-root` wrapper (the stylesheet's html/body/#root rules map onto
// it since a page can't own <body>). Fixed 1024x1536 "paper" that scales via transform on
// narrow screens. The reference render is layered back in as a faint 19% multiply overlay
// (.paper::after) exactly as the source does, from /new2-ref.png.
//
// NOTE on icons: the source imports brand icons (Twitter/Facebook/Instagram/Youtube/Linkedin)
// from lucide-react, but this app's lucide-react (v1.14.0) has REMOVED all brand icons. To
// reproduce the same look the five social marks are inlined here using the classic lucide
// brand SVG paths (same 24-viewBox stroke style, size 18).
//
// Clickable hotspots = 17 (matching the source): ISSUE 23 card, 9 nav items, 5 social icons,
// SUPPORT US + ACCOUNT/INFO. The big content-space and the 3 lower "ghosts" are intentionally
// non-clickable visual placeholders in the source — reproduced as such. /new2?debug=1 outlines
// the hotspots.
import type { Metadata } from 'next';
import { Oswald, Roboto_Condensed } from 'next/font/google';

// Source loads these via a Google CSS @import (Oswald 500;700 + Roboto Condensed 700).
// We load them through next/font instead: self-hosted, reliable, and it avoids the name
// clash with the app's own next/font "Oswald" (which only registers 400;600 and made the
// masthead title render too wide / wrap). Unique CSS variables keep this page isolated.
const oswald = Oswald({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-oswald', display: 'swap' });
const robotoCond = Roboto_Condensed({ subsets: ['latin'], weight: ['700'], variable: '--f-roboto-cond', display: 'swap' });

export const metadata: Metadata = {
  title: "opengovt, new2 replica",
  robots: { index: false, follow: false },
};

const navItems = ['HOME', 'BILLS', 'LAWS', 'PEOPLES POLLS', 'MPS', 'DEPARTMENTS', 'TRANSPARENCY', 'CONTACT', 'LOGIN'];

const svgBase = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function IconX() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}
function IconFacebook() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg {...svgBase} aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
function IconYoutube() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
      <polygon points="10 15 15 12 10 9" />
    </svg>
  );
}
function IconLinkedin() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export default async function New2Page({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const sp = await searchParams;
  const debug = sp.debug === '1';

  return (
    <>
      <style>{`
        .new2-root {
          --paper: #d7bd82;
          --paper-light: #e7d2a0;
          --ink: #080706;
          --red: #8c261f;
          --edge: #4b3420;
          min-height: 100vh;
          margin: 0;
          background: #111;
          display: grid;
          place-items: center;
          font-family: var(--f-roboto-cond), 'Roboto Condensed', Impact, sans-serif;
        }
        .new2-root * { box-sizing: border-box; }

        .new2-root .page-shell {
          width: min(100vw, 1024px);
          min-height: 100vh;
          display: grid;
          place-items: center;
        }

        .new2-root .paper {
          position: relative;
          width: 1024px;
          height: 1536px;
          overflow: hidden;
          color: var(--ink);
          background:
            radial-gradient(circle at 14% 8%, rgba(255,255,255,.14), transparent 19%),
            radial-gradient(circle at 78% 62%, rgba(110,72,27,.12), transparent 23%),
            radial-gradient(circle at 28% 83%, rgba(72,45,20,.12), transparent 18%),
            linear-gradient(90deg, rgba(35,21,9,.20) 0 1.3%, transparent 3%, transparent 96.5%, rgba(35,21,9,.24) 100%),
            linear-gradient(180deg, rgba(35,21,9,.16) 0 1.8%, transparent 5%, transparent 94%, rgba(35,21,9,.18) 100%),
            repeating-linear-gradient(33deg, rgba(20,13,4,.035) 0 1px, transparent 1px 7px),
            var(--paper-light);
          border-radius: 10px;
          box-shadow: inset 0 0 45px rgba(58,37,15,.36), inset 0 0 4px rgba(0,0,0,.42);
        }
        .new2-root .paper::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(22,14,6,.55), transparent 1.7%, transparent 98.4%, rgba(22,14,6,.50)),
            linear-gradient(180deg, rgba(22,14,6,.38), transparent 1.4%, transparent 97.8%, rgba(22,14,6,.46));
          opacity: .72;
        }
        /* NOTE: the source layered the reference mockup back in here as a 19% multiply
           overlay (.paper::after { background-image: url(reference.png) }). That produced
           a visible "two pages on top of each other" ghost because the mockup's title
           sits slightly larger/lower than the coded one. Removed so only the single
           coded page renders. */

        .new2-root .hotspot { cursor: pointer; text-decoration: none; color: inherit; }
        .new2-root .masthead {
          position: relative;
          z-index: 1;
          height: 286px;
          display: grid;
          grid-template-columns: 245px 1fr;
          align-items: center;
          padding: 58px 54px 0;
        }
        .new2-root .issue-card {
          position: relative;
          width: 170px;
          height: 126px;
          border: 1.5px solid var(--red);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--red);
        }
        .new2-root .issue-title { font-family: var(--f-oswald), 'Oswald', serif; font-size: 35px; color: #111; letter-spacing: 1px; }
        .new2-root .issue-date { font-family: var(--f-oswald), 'Oswald', serif; font-size: 17px; margin-top: 8px; }
        .new2-root .issue-rule { width: 120px; height: 1px; background: var(--red); margin-top: 8px; }
        .new2-root .tiny-star { position: absolute; font-size: 21px; color: var(--red); background: var(--paper-light); padding: 0 8px; }
        .new2-root .tiny-star.top { top: -15px; }
        .new2-root .tiny-star.bottom { bottom: -15px; }

        .new2-root .title-block { text-align: center; position: relative; padding-right: 14px; }
        .new2-root .small-the { position: absolute; left: 84px; top: -40px; font-family: var(--f-oswald), 'Oswald'; font-size: 41px; }
        .new2-root .small-the span { display: inline-block; width: 48px; border-top: 2px solid var(--red); margin-left: 14px; transform: translateY(-12px); }
        .new2-root .crown-row { position: absolute; top: -57px; left: 40%; display: flex; gap: 30px; align-items: center; color: var(--red); font-size: 24px; }
        .new2-root .crown { font-size: 56px; line-height: 1; }
        .new2-root h1 { font-family: var(--f-oswald), 'Oswald', Impact, serif; font-size: 80px; font-weight: 700; letter-spacing: 1px; margin: 0; line-height: .9; white-space: nowrap; }
        .new2-root p { font-family: var(--f-oswald), 'Oswald'; font-size: 32px; color: var(--red); margin: 28px 0 0; letter-spacing: 1px; }
        .new2-root p b { display: inline-block; width: 74px; height: 2px; background: var(--red); margin: 0 24px 9px; }

        .new2-root .nav-bar {
          position: relative;
          z-index: 1;
          margin: 0 56px;
          height: 55px;
          border-top: 1px solid var(--ink);
          border-bottom: 1px solid var(--ink);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: var(--f-oswald), 'Oswald';
          font-size: 17px;
        }
        .new2-root .nav-bar a:not(:last-child)::after { content: '|'; color: var(--red); margin-left: 24px; }

        .new2-root .content-space { position: relative; z-index: 1; height: 664px; }
        .new2-root .divider-row {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 50px 1fr;
          align-items: center;
          margin: 0 55px;
          color: var(--red);
          font-size: 31px;
          height: 56px;
        }
        .new2-root .divider-row span { border-top: 4px solid #0c0a07; opacity: .96; }
        .new2-root .divider-row b { text-align: center; }
        .new2-root .lower-ghosts {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 36px;
          margin: 0 76px 24px;
          height: 285px;
          opacity: .08;
        }
        .new2-root .lower-ghosts div { border-radius: 10px; background: rgba(255,255,255,.1); }
        .new2-root .footer {
          position: absolute;
          z-index: 1;
          left: 54px;
          right: 54px;
          bottom: 22px;
          border-top: 4px solid #0b0906;
          height: 82px;
          display: flex;
          align-items: center;
          gap: 25px;
          font-family: var(--f-oswald), 'Oswald';
          font-size: 16px;
        }
        .new2-root .footer i { height: 42px; border-left: 2px solid var(--red); margin: 0 22px; }
        .new2-root .footer-star { color: var(--red); font-size: 28px; margin-right: 42px; }
        .new2-root .footer-star.right { margin-left: auto; margin-right: 0; }
        .new2-root .social { display: inline-grid; place-items: center; width: 22px; height: 22px; color: var(--ink); }
        .new2-root .footer-link { min-width: 132px; text-align: center; }

        ${debug ? `.new2-root .hotspot { outline: 1.5px solid rgba(255,0,0,.85) !important; background: rgba(255,0,0,.12) !important; }` : ''}

        @media (max-width: 1024px) {
          .new2-root .paper { transform: scale(calc(100vw / 1024)); transform-origin: top center; }
          .new2-root .page-shell { align-items: start; }
        }
      `}</style>

      <div className={`new2-root ${oswald.variable} ${robotoCond.variable}`}>
        <main className="page-shell">
          <section className="paper" aria-label="opengovt front page">
            <header className="masthead">
              <a className="issue-card hotspot" href="#issue" aria-label="Issue 23">
                <div className="tiny-star top">★</div>
                <div className="issue-title">ISSUE&nbsp; 23</div>
                <div className="issue-rule" />
                <div className="issue-date">MAY 16 to 22, 2025</div>
                <div className="tiny-star bottom">★</div>
              </a>

              <div className="title-block">
                <div className="small-the">THE <span></span></div>
                <div className="crown-row"><span>★</span><div className="crown">♕</div><span>★</span></div>
                <h1>OPEN GOVT</h1>
                <p><b></b>UK GOVERNMENT. IN PUBLIC VIEW.<b></b></p>
              </div>
            </header>

            <nav className="nav-bar" aria-label="Primary navigation">
              {navItems.map((item) => (
                <a key={item} className="hotspot" href={`#${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</a>
              ))}
            </nav>

            <section className="content-space" aria-label="Main editorial region"></section>

            <section className="divider-row" aria-hidden="true"><span></span><b>★</b><span></span></section>

            <section className="lower-ghosts" aria-label="Lower hotspot guide area">
              <div></div><div></div><div></div>
            </section>

            <footer className="footer">
              <span className="footer-star">★</span>
              <a className="social hotspot" href="#x" aria-label="X"><IconX /></a>
              <a className="social hotspot" href="#facebook" aria-label="Facebook"><IconFacebook /></a>
              <a className="social hotspot" href="#instagram" aria-label="Instagram"><IconInstagram /></a>
              <a className="social hotspot" href="#youtube" aria-label="YouTube"><IconYoutube /></a>
              <a className="social hotspot" href="#linkedin" aria-label="LinkedIn"><IconLinkedin /></a>
              <i></i>
              <a className="footer-link hotspot" href="#support">SUPPORT US</a>
              <i></i>
              <a className="footer-link hotspot" href="#account-info">ACCOUNT/INFO</a>
              <span className="footer-star right">★</span>
            </footer>
          </section>
        </main>
      </div>
    </>
  );
}
