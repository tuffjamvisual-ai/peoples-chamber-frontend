/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "The People's Chamber — land101 demo",
  robots: { index: false, follow: false },
};

// Faithful reproduction of the land101 / "101" build package.
// Image is locked to 1033 x 1523; hotspot map below is copied verbatim from
// the package's styles.css (percentages relative to the page-wrap). Do not
// crop/pad/replace the image without recalculating these coordinates.
type Box = { cls: string; href: string; label: string; left: number; top: number; width: number; height: number };

const HOTSPOTS: Box[] = [
  { cls: 'issue', href: '/issue', label: 'Issue box', left: 2.8, top: 3.0, width: 14.8, height: 5.4 },
  { cls: 'main-combined', href: '/stories/parliament-returns-after-easter-recess', label: 'Top story and image', left: 2.8, top: 27.0, width: 94.4, height: 40.0 },
  { cls: 'cost', href: '/economy', label: 'Cost of Living card', left: 2.8, top: 68.5, width: 29.6, height: 24.0 },
  { cls: 'nhs', href: '/public-services/nhs', label: 'NHS card', left: 32.8, top: 68.5, width: 31.0, height: 24.0 },
  { cls: 'voices', href: '/voices', label: 'Voices card', left: 64.5, top: 68.5, width: 32.7, height: 24.0 },
  { cls: 'nav-home', href: '/', label: 'Home', left: 2.6, top: 22.6, width: 8.0, height: 3.3 },
  { cls: 'nav-bills', href: '/bills', label: 'Bills', left: 10.8, top: 22.6, width: 8.0, height: 3.3 },
  { cls: 'nav-laws', href: '/laws', label: 'Laws', left: 19.0, top: 22.6, width: 8.0, height: 3.3 },
  { cls: 'nav-polls', href: '/peoples-polls', label: 'Peoples Polls', left: 27.0, top: 22.6, width: 14.0, height: 3.3 },
  { cls: 'nav-mps', href: '/mps', label: 'MPs', left: 41.0, top: 22.6, width: 7.2, height: 3.3 },
  { cls: 'nav-departments', href: '/departments', label: 'Departments', left: 48.2, top: 22.6, width: 14.4, height: 3.3 },
  { cls: 'nav-login', href: '/login', label: 'Login', left: 62.6, top: 22.6, width: 8.0, height: 3.3 },
  { cls: 'nav-about', href: '/about', label: 'About', left: 70.6, top: 22.6, width: 8.3, height: 3.3 },
  { cls: 'nav-contact', href: '/contact-donate', label: 'Contact Donate', left: 78.9, top: 22.6, width: 18.5, height: 3.3 },
];

const OVERLAYS = [
  { text: 'FULL STORY →', left: 3.3, top: 61.2, size: 'clamp(12px, 1.2vw, 22px)' },
  { text: 'MORE INFO →', left: 3.1, top: 90.7, size: 'clamp(11px, 1vw, 20px)' },
  { text: 'MORE INFO →', left: 34.8, top: 90.7, size: 'clamp(11px, 1vw, 20px)' },
  { text: 'MORE INFO →', left: 66.0, top: 90.7, size: 'clamp(11px, 1vw, 20px)' },
];

export default async function Land101Page({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const sp = await searchParams;
  const debug = sp.debug === '1';

  return (
    <>
      <style>{`
        .land101-body {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #120d09;
          font-family: Georgia, "Times New Roman", serif;
        }
        .land101-wrap {
          position: relative;
          width: min(100%, 1040px);
          aspect-ratio: 1033 / 1523;
          filter: drop-shadow(0 24px 42px rgba(0, 0, 0, 0.48));
        }
        .land101-img {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: fill;
          user-select: none;
          pointer-events: none;
        }
        .land101-hotspot {
          position: absolute;
          z-index: 30;
          display: block;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
        }
        .land101-hotspot:hover,
        .land101-hotspot:focus-visible {
          background-color: rgba(90, 45, 22, 0.12);
          box-shadow: inset 0 0 0 2px rgba(80, 32, 18, 0.28);
          transform: translateY(-1px);
          outline: none;
        }
        .land101-overlay {
          position: absolute;
          z-index: 20;
          pointer-events: none;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #6b1f14;
          line-height: 1;
        }
        ${debug ? `
        .land101-hotspot {
          background: rgba(255,0,0,.16) !important;
          box-shadow: inset 0 0 0 2px rgba(255,0,0,.75) !important;
        }
        .land101-overlay { background: rgba(255,255,0,.75) !important; }
        ` : ''}
        @media (max-width: 720px) {
          .land101-body { padding: 0; }
          .land101-wrap { width: 100vw; }
          .land101-hotspot:hover { background-color: transparent; box-shadow: none; transform: none; }
        }
      `}</style>

      <div className="land101-body">
        <main className="land101-wrap" aria-label="The People's Chamber clickable newspaper landing page">
          <img
            className="land101-img"
            src="/land101-art.png"
            alt="The People's Chamber vintage newspaper landing page"
          />

          {OVERLAYS.map((o, i) => (
            <div
              key={i}
              className="land101-overlay"
              style={{ left: `${o.left}%`, top: `${o.top}%`, fontSize: o.size }}
            >
              {o.text}
            </div>
          ))}

          {HOTSPOTS.map((h) => (
            <a
              key={h.cls}
              className="land101-hotspot"
              href={h.href}
              aria-label={h.label}
              style={{
                left: `${h.left}%`,
                top: `${h.top}%`,
                width: `${h.width}%`,
                height: `${h.height}%`,
              }}
            />
          ))}
        </main>
      </div>
    </>
  );
}
