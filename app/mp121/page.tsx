// Recreation of ~/Downloads/mp121.zip (peoples-chamber-exact-claude family).
// Built strictly from THIS zip's own files — src/main.jsx markup + src/styles.css —
// with nothing carried over from the other landing pages. Per the zip README:
// fonts come from the CSS @import (Oswald + Rye + Staatliches), no font binaries added;
// target is a 1024x1536 portrait page; no borders on the content/lower hotspots; thin
// nav rules; lightly aged edges; small borderless social icons.
//
// Faithful Next adaptation: the stylesheet's html/body/#root rules are mapped onto a
// `.mp121-root` wrapper (a page can't own <body>) and every selector is scoped under it
// so it can't collide with the app globals. The brand title is Rye (the woodtype display
// face in the reference) — loaded via the @import exactly as the source does.
//
// The source imports brand icons from lucide-react, but this app's lucide (v1.14) has
// removed all brand icons, so the four lucide marks are inlined here using lucide's own
// SVG paths with the exact size / strokeWidth / fill the source specifies. X is the 𝕏 glyph.
// /mp121?debug=1 outlines the hotspots.
import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: "The People's Chamber — mp121",
  robots: { index: false, follow: false },
};

const navItems = ['HOME', 'BILLS', 'LAWS', 'PEOPLES POLLS', 'MPS', 'DEPARTMENTS', 'TRANSPARENCY', 'CONTACT', 'LOGIN'];

export default async function Mp121Page({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const sp = await searchParams;
  const debug = sp.debug === '1';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Rye&family=Staatliches&display=swap');

        .mp121-root {
          --ink: #090807;
          --red: #8e241b;
          --paper: #dbc18b;
          --paper-light: #e7cf99;
          --paper-dark: #a9854b;
          min-height: 100vh;
          margin: 0;
          display: grid;
          place-items: center;
          color: var(--ink);
          background: #2a1d0e;
        }
        .mp121-root * { box-sizing: border-box; }

        .mp121-root .page-wrap {
          width: 100%;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: transparent;
        }

        .mp121-root .newspaper-page {
          position: relative;
          width: min(100vw, 1024px);
          aspect-ratio: 1024 / 1536;
          overflow: hidden;
          padding: 4.1% 4.55% 2.7%;
          background:
            radial-gradient(circle at 18% 9%, rgba(255,255,255,0.18), transparent 20%),
            radial-gradient(circle at 62% 78%, rgba(91,58,23,0.15), transparent 36%),
            linear-gradient(90deg, rgba(61,38,18,0.22) 0, rgba(255,255,255,0) 3.2%, rgba(255,255,255,0) 96.8%, rgba(61,38,18,0.22) 100%),
            linear-gradient(180deg, rgba(65,38,17,0.18) 0, rgba(255,255,255,0) 5.5%, rgba(255,255,255,0) 94.5%, rgba(65,38,17,0.22) 100%),
            var(--paper-light);
          border-radius: 14px;
          box-shadow: inset 0 0 0 0 transparent;
          isolation: isolate;
        }
        .mp121-root .newspaper-page::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            linear-gradient(90deg, rgba(48,30,12,0.34), transparent 1.4%, transparent 98.4%, rgba(48,30,12,0.32)),
            linear-gradient(180deg, rgba(48,30,12,0.25), transparent 1.6%, transparent 98.4%, rgba(48,30,12,0.28)),
            repeating-linear-gradient(92deg, rgba(87,62,29,0.10) 0 1px, transparent 1px 6px),
            repeating-linear-gradient(176deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 9px);
          mix-blend-mode: multiply;
          opacity: .62;
        }
        .mp121-root .newspaper-page::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background:
            radial-gradient(circle at 2% 3%, rgba(55,35,16,.38) 0 1.5%, transparent 3.8%),
            radial-gradient(circle at 98% 4%, rgba(55,35,16,.34) 0 1.4%, transparent 3.6%),
            radial-gradient(circle at 3% 97%, rgba(55,35,16,.36) 0 1.5%, transparent 3.7%),
            radial-gradient(circle at 98% 97%, rgba(55,35,16,.32) 0 1.5%, transparent 3.7%),
            linear-gradient(180deg, transparent 50.7%, rgba(107,76,38,.14) 50.8%, transparent 51.4%);
          opacity: .7;
        }

        .mp121-root .masthead,
        .mp121-root .main-nav,
        .mp121-root .blank-editorial-space,
        .mp121-root .middle-rule,
        .mp121-root .bottom-ghost-grid,
        .mp121-root .footer-bar { position: relative; z-index: 2; }

        .mp121-root .masthead {
          height: 230px;
          display: grid;
          grid-template-columns: 170px 1fr;
          gap: 24px;
          align-items: start;
        }

        .mp121-root .issue-card {
          position: relative;
          display: block;
          width: 150px;
          height: 126px;
          margin-top: 26px;
          text-align: center;
          text-decoration: none;
          color: inherit;
          border: 1.5px solid var(--red);
          border-radius: 8px;
          padding-top: 24px;
        }
        .mp121-root .issue-star { position: absolute; left: 50%; transform: translateX(-50%); color: var(--red); font-size: 20px; line-height: 1; background: var(--paper-light); padding: 0 9px; }
        .mp121-root .issue-star.top { top: -10px; }
        .mp121-root .issue-star.bottom { bottom: -10px; }
        .mp121-root .issue-title { font-family: Rye, Georgia, serif; font-size: 29px; letter-spacing: .5px; }
        .mp121-root .issue-rule { width: 90px; height: 1px; background: var(--red); margin: 12px auto 8px; }
        .mp121-root .issue-date { font-family: Oswald, Arial, sans-serif; font-size: 15px; color: var(--red); font-weight: 700; letter-spacing: .3px; }

        .mp121-root .brand-block { text-align: center; padding-top: 22px; }
        .mp121-root .brand-top { display: inline-flex; align-items: center; gap: 16px; margin-right: 540px; font-family: Rye, Georgia, serif; font-size: 35px; }
        .mp121-root .brand-top i { display: block; width: 54px; height: 2px; background: var(--red); }
        .mp121-root .crown-row { height: 24px; margin-top: -20px; display: flex; justify-content: center; align-items: center; gap: 24px; color: var(--red); }
        .mp121-root .crown-row span { font-size: 22px; }
        .mp121-root .crown { font-size: 54px; line-height: .5; transform: translateY(-5px); font-family: Georgia, serif; }
        /* Source spec is 77px; in this environment the @import Rye renders ~4% wider, so
           77px (803px) overflows its 737px column and clips. 70px (727px) fits one line in
           the column exactly as the reference shows. */
        .mp121-root h1 { font-family: Rye, Georgia, serif; font-size: 70px; line-height: .86; margin: 13px 0 28px; letter-spacing: -2px; font-weight: 400; white-space: nowrap; }
        .mp121-root .strapline { display: flex; align-items: center; justify-content: center; gap: 18px; color: var(--red); font-family: Rye, Georgia, serif; font-size: 25px; }
        .mp121-root .strapline i { display: block; width: 92px; height: 2px; background: var(--red); }

        .mp121-root .main-nav {
          height: 54px;
          border-top: 1px solid var(--ink);
          border-bottom: 1px solid var(--ink);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
          font-family: Oswald, Arial, sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: .15px;
        }
        .mp121-root .main-nav a { color: var(--ink); text-decoration: none; padding: 16px 5px; white-space: nowrap; }
        .mp121-root .nav-sep { color: var(--red); font-size: 28px; font-weight: 300; transform: translateY(-1px); }

        .mp121-root .blank-editorial-space { height: 682px; }

        .mp121-root .middle-rule { display: grid; grid-template-columns: 1fr 38px 1fr; align-items: center; margin-top: 0; }
        .mp121-root .middle-rule span { height: 1px; background: var(--ink); opacity: .95; }
        .mp121-root .middle-rule b { color: var(--red); font-size: 26px; text-align: center; line-height: 1; }

        .mp121-root .bottom-ghost-grid {
          height: 315px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 26px;
        }
        .mp121-root .ghost-card {
          display: block;
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          outline: none;
          text-decoration: none;
        }

        .mp121-root .footer-bar { margin-top: 12px; }
        .mp121-root .footer-line { height: 2px; background: var(--ink); opacity: .95; }
        .mp121-root .footer-content {
          height: 54px;
          display: grid;
          grid-template-columns: 42px 250px 28px 1fr 28px 1fr 42px;
          align-items: center;
          gap: 10px;
          font-family: Oswald, Arial, sans-serif;
          font-size: 15px;
          font-weight: 700;
        }
        .mp121-root .footer-star { color: var(--red); font-size: 28px; text-align: center; }
        .mp121-root .socials { display: flex; align-items: center; gap: 24px; }
        .mp121-root .socials a { color: var(--ink); display: inline-flex; align-items: center; justify-content: center; text-decoration: none; width: 18px; height: 18px; }
        .mp121-root .x-icon { font-family: Arial, sans-serif; font-size: 19px; line-height: 1; }
        .mp121-root .footer-sep { color: var(--red); font-size: 31px; font-weight: 300; text-align: center; }
        .mp121-root .footer-link { color: var(--ink); text-decoration: none; text-align: center; padding: 16px 5px; }

        .mp121-root .hotspot { cursor: pointer; }
        .mp121-root .hotspot:hover { filter: brightness(.92); }

        ${debug ? `.mp121-root .hotspot { outline: 1.5px solid rgba(255,0,0,.8) !important; background: rgba(255,0,0,.10) !important; }` : ''}

        @media (max-width: 760px) {
          .mp121-root .newspaper-page { width: 100vw; }
        }
      `}</style>

      <div className="mp121-root">
        <main className="page-wrap">
          <section className="newspaper-page" aria-label="The People's Chamber page mockup">
            <header className="masthead">
              <a className="issue-card hotspot" href="#issue" aria-label="Issue 23">
                <div className="issue-star top">★</div>
                <div className="issue-title">ISSUE&nbsp; 23</div>
                <div className="issue-rule" />
                <div className="issue-date">MAY 16–22, 2025</div>
                <div className="issue-star bottom">★</div>
              </a>

              <div className="brand-block">
                <div className="brand-top">
                  <span>THE</span><i></i>
                </div>
                <div className="crown-row"><span>★</span><div className="crown">♕</div><span>★</span></div>
                <h1>PEOPLE’S CHAMBER</h1>
                <div className="strapline"><i></i><span>UK GOVERNMENT. IN PUBLIC VIEW.</span><i></i></div>
              </div>
            </header>

            <nav className="main-nav" aria-label="Primary navigation">
              {navItems.map((item, index) => (
                <React.Fragment key={item}>
                  <a href={`#${item.toLowerCase().replaceAll(' ', '-')}`} className="hotspot">{item}</a>
                  {index < navItems.length - 1 && <span className="nav-sep">|</span>}
                </React.Fragment>
              ))}
            </nav>

            <section className="blank-editorial-space" aria-hidden="true"></section>

            <div className="middle-rule"><span></span><b>★</b><span></span></div>

            <section className="bottom-ghost-grid" aria-label="Three lower clickable story areas">
              <a href="#lower-one" className="ghost-card hotspot" aria-label="Lower story card one"></a>
              <a href="#lower-two" className="ghost-card hotspot" aria-label="Lower story card two"></a>
              <a href="#lower-three" className="ghost-card hotspot" aria-label="Lower story card three"></a>
            </section>

            <footer className="footer-bar">
              <div className="footer-line" />
              <div className="footer-content">
                <span className="footer-star">★</span>
                <div className="socials hotspot" aria-label="Social media links">
                  <a href="#x" aria-label="X"><span className="x-icon" aria-hidden="true">𝕏</span></a>
                  <a href="#facebook" aria-label="Facebook">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </a>
                  <a href="#instagram" aria-label="Instagram">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  </a>
                  <a href="#youtube" aria-label="YouTube">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
                      <polygon points="10 15 15 12 10 9" fill="#e7cf99" stroke="none" />
                    </svg>
                  </a>
                  <a href="#linkedin" aria-label="LinkedIn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect width="4" height="12" x="2" y="9" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </a>
                </div>
                <span className="footer-sep">|</span>
                <a href="#support" className="footer-link hotspot">SUPPORT US</a>
                <span className="footer-sep">|</span>
                <a href="#account-info" className="footer-link hotspot">ACCOUNT/INFO</a>
                <span className="footer-star">★</span>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </>
  );
}
