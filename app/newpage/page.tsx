// Temp page — exact reproduction of ~/Downloads/newpage.zip
// (peoples-chamber-full-page-build: index.html + src/styles.css + src/hotspots.json).
// This package is a FULLY-CODED HTML/CSS page (not an image overlay): the newspaper
// is built from real elements (masthead, nav, 16:9 aged "paper", content grid, footer)
// with 22 invisible hotspots. Markup + CSS reproduced verbatim, with the usual Next
// adaptation: the stylesheet's `html, body` rules are applied to a `.newpage-root`
// wrapper since a page can't own <body>. Per the README: keep 16:9 dimensions, no
// visible borders on the 2 large + 3 lower content hotspots, ultra-thin navbar divider
// lines, ISSUE 23 clickable, five individual social-icon hotspots, SUPPORT US +
// ACCOUNT/INFO footer links, slightly rounded corners with no white behind them,
// lightly aged edges. Visit /newpage?debug=1 to reveal the 22 hotspot hitboxes.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "opengovt — newpage build",
  robots: { index: false, follow: false },
};

export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const sp = await searchParams;
  const debug = sp.debug === '1';

  return (
    <>
      <style>{`
        .newpage-root {
          --ink: #191612;
          --red: #8e1f19;
          --paper: #d9c49a;
          --paper-light: #eadbbd;
          --paper-dark: #b49b6b;
          min-height: 100vh;
          margin: 0;
          background:
            radial-gradient(circle at 20% 15%, rgba(60, 42, 20, 0.10), transparent 28%),
            radial-gradient(circle at 75% 85%, rgba(60, 42, 20, 0.10), transparent 30%),
            #c7b28b;
          color: var(--ink);
          font-family: Georgia, "Times New Roman", serif;
        }
        .newpage-root * { box-sizing: border-box; }

        .newpage-root .stage {
          width: 100vw;
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .newpage-root .paper {
          position: relative;
          width: min(94vw, 1160px);
          aspect-ratio: 16 / 9;
          padding: 34px 42px 26px;
          overflow: hidden;
          border-radius: 7px;
          background:
            linear-gradient(90deg, rgba(82, 55, 24, 0.12), transparent 4%, transparent 96%, rgba(82, 55, 24, 0.12)),
            linear-gradient(180deg, rgba(82, 55, 24, 0.10), transparent 5%, transparent 95%, rgba(82, 55, 24, 0.14)),
            radial-gradient(circle at 10% 20%, rgba(110, 78, 42, 0.13), transparent 12%),
            radial-gradient(circle at 87% 30%, rgba(110, 78, 42, 0.10), transparent 14%),
            radial-gradient(circle at 60% 92%, rgba(110, 78, 42, 0.11), transparent 11%),
            var(--paper-light);
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.22),
            inset 0 0 24px rgba(80, 45, 18, 0.10);
        }
        .newpage-root .paper::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            repeating-linear-gradient(0deg, rgba(50, 35, 18, 0.026) 0 1px, transparent 1px 4px),
            repeating-linear-gradient(90deg, rgba(50, 35, 18, 0.018) 0 1px, transparent 1px 5px);
          mix-blend-mode: multiply;
          opacity: 0.75;
        }
        .newpage-root .paper::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(78, 45, 18, 0.18), transparent 18px, transparent calc(100% - 18px), rgba(78, 45, 18, 0.18)),
            linear-gradient(180deg, rgba(78, 45, 18, 0.14), transparent 16px, transparent calc(100% - 16px), rgba(78, 45, 18, 0.16));
          opacity: 0.42;
        }

        .newpage-root .hotspot { cursor: pointer; text-decoration: none; color: inherit; }
        .newpage-root .hotspot:focus-visible { outline: 2px dashed var(--red); outline-offset: 4px; }

        .newpage-root .masthead {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 155px 1fr 155px;
          align-items: start;
          gap: 14px;
          min-height: 126px;
        }
        .newpage-root .issue { display: block; color: var(--red); padding-top: 8px; line-height: 1; }
        .newpage-root .issue span { display: block; font-size: clamp(20px, 2.3vw, 34px); font-weight: 900; letter-spacing: -0.04em; }
        .newpage-root .issue small { display: block; margin-top: 6px; color: var(--ink); font-size: 10px; letter-spacing: 0.08em; }

        .newpage-root .brand { text-align: center; line-height: 1; }
        .newpage-root .crest { color: var(--red); font-size: clamp(20px, 2vw, 30px); line-height: 0.85; margin-bottom: 0; }
        .newpage-root h1 {
          margin: 0;
          font-size: clamp(46px, 7vw, 96px);
          letter-spacing: -0.075em;
          font-weight: 950;
          transform: scaleX(1.08);
          transform-origin: center;
        }
        .newpage-root .brand p { margin: 7px 0 0; color: var(--red); font-size: 13px; font-weight: 900; letter-spacing: 0.24em; }

        .newpage-root .nav {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin: 2px 0 28px;
          padding: 9px 0 8px;
          border-top: 0.5px solid rgba(25, 22, 18, 0.68);
          border-bottom: 0.5px solid rgba(25, 22, 18, 0.68);
          font-family: "Arial Narrow", Arial, sans-serif;
          font-size: clamp(11px, 1.25vw, 15px);
          font-weight: 900;
          letter-spacing: 0.02em;
        }
        .newpage-root .nav a { display: inline-flex; align-items: center; justify-content: center; min-height: 24px; white-space: nowrap; }
        .newpage-root .nav .wide { letter-spacing: -0.01em; }

        .newpage-root .content-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          grid-template-rows: 1fr 0.52fr;
          gap: 28px 30px;
          min-height: 365px;
        }
        .newpage-root .feature,
        .newpage-root .lower-card { display: block; background: rgba(236, 220, 184, 0.18); border: 0; box-shadow: none; min-height: 100%; }
        .newpage-root .lower-card { min-height: 132px; }
        .newpage-root .feature-left { grid-column: 1 / 3; }
        .newpage-root .feature-right { grid-column: 3 / 7; }
        .newpage-root .content-grid .lower-card:nth-of-type(3) { grid-column: 1 / 3; }
        .newpage-root .content-grid .lower-card:nth-of-type(4) { grid-column: 3 / 5; }
        .newpage-root .content-grid .lower-card:nth-of-type(5) { grid-column: 5 / 7; display: block; }

        .newpage-root .footer {
          position: relative;
          z-index: 1;
          margin-top: 28px;
          padding-top: 12px;
          border-top: 0.5px solid rgba(25, 22, 18, 0.52);
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 34px;
          font-family: "Arial Narrow", Arial, sans-serif;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: 0.06em;
        }
        .newpage-root .socials { display: flex; align-items: center; gap: 13px; }
        .newpage-root .social {
          display: inline-grid;
          place-items: center;
          width: 16px;
          height: 16px;
          color: var(--red);
          font-size: 14px;
          line-height: 1;
          font-family: Arial, sans-serif;
          font-weight: 900;
        }
        .newpage-root .footer-link { color: var(--red); white-space: nowrap; font-size: 12px; }

        ${debug ? `
        .newpage-root .hotspot {
          outline: 1.5px solid rgba(255,0,0,.85) !important;
          background: rgba(255,0,0,.14) !important;
        }
        ` : ''}

        @media (max-width: 760px) {
          .newpage-root .stage { padding: 12px; }
          .newpage-root .paper { width: 100%; aspect-ratio: auto; min-height: 100vh; padding: 26px 22px; }
          .newpage-root .masthead { grid-template-columns: 1fr; min-height: auto; }
          .newpage-root .issue { text-align: center; }
          .newpage-root h1 { font-size: 46px; }
          .newpage-root .nav { flex-wrap: wrap; justify-content: center; }
          .newpage-root .content-grid { grid-template-columns: 1fr; grid-template-rows: none; }
          .newpage-root .feature-left,
          .newpage-root .feature-right,
          .newpage-root .content-grid .lower-card:nth-of-type(3),
          .newpage-root .content-grid .lower-card:nth-of-type(4),
          .newpage-root .content-grid .lower-card:nth-of-type(5) { grid-column: 1; min-height: 130px; }
          .newpage-root .footer { grid-template-columns: 1fr; justify-items: center; }
        }
      `}</style>

      <div className="newpage-root">
        <main className="stage">
          <section className="paper" aria-label="opengovt page">
            <header className="masthead">
              <a className="issue hotspot" href="#issue" aria-label="Issue 23">
                <span>ISSUE 23</span>
                <small>MAY 16 to 22, 2025</small>
              </a>

              <div className="brand">
                <div className="crest" aria-hidden="true">♛</div>
                <h1>OPEN GOVT</h1>
                <p>PUBLIC RECORD · THE TRUTH · NO SPIN</p>
              </div>
            </header>

            <nav className="nav" aria-label="Primary">
              <a className="hotspot" href="#home">HOME</a>
              <a className="hotspot" href="#bills">BILLS</a>
              <a className="hotspot" href="#laws">LAWS</a>
              <a className="hotspot wide" href="#polls">PEOPLES POLLS</a>
              <a className="hotspot" href="#mps">MPS</a>
              <a className="hotspot wide" href="#departments">DEPARTMENTS</a>
              <a className="hotspot wide" href="#transparency">TRANSPARENCY</a>
              <a className="hotspot" href="#contact">CONTACT</a>
              <a className="hotspot" href="#login">LOGIN</a>
            </nav>

            <section className="content-grid">
              <a className="feature feature-left hotspot" href="#feature-left" aria-label="Large upper content area left"></a>
              <a className="feature feature-right hotspot" href="#feature-right" aria-label="Large upper content area right"></a>

              <a className="lower-card hotspot" href="#lower-left" aria-label="Lower left content area"></a>
              <a className="lower-card hotspot" href="#lower-centre" aria-label="Lower centre content area"></a>
              <a className="lower-card hotspot" href="#lower-right" aria-label="Lower right content area"></a>
            </section>

            <footer className="footer">
              <div className="socials" aria-label="Social media links">
                <a className="social hotspot" href="#x" aria-label="X">𝕏</a>
                <a className="social hotspot" href="#facebook" aria-label="Facebook">f</a>
                <a className="social hotspot" href="#instagram" aria-label="Instagram">◎</a>
                <a className="social hotspot" href="#youtube" aria-label="YouTube">▶</a>
                <a className="social hotspot" href="#linkedin" aria-label="LinkedIn">in</a>
              </div>

              <a className="footer-link hotspot" href="#support">SUPPORT US</a>
              <a className="footer-link hotspot" href="#account-info">ACCOUNT/INFO</a>
            </footer>
          </section>
        </main>
      </div>
    </>
  );
}
