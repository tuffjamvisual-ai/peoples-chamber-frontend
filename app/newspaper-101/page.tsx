// New version — built from ~/Downloads/101 ("no text boxes" investigation build).
// Route: /newspaper-101 (separate; does not touch /newspaper-demo, /newspaper-112,
// or /newspaper-preview). Image: public/newspaper-101.png (1033x1523, identical
// bytes to 112's image).
//
// 101's changes vs 112/121:
//  - recalculated hotspot coords (navbar at top 22.6%, cards at 68.5%, h 24%)
//  - click-interception fix: hotspots z-index 30, overlay text z-index 20 +
//    pointer-events: none, so labels can never block a click
//  - "no text boxes": overlay labels are de-boxed (transparent background, no
//    padding) — plain red text rather than the cream masking boxes 112 used
//
// Reproduced verbatim from 101's index.html + styles.css. aspect-ratio
// 1033/1523 + object-fit: fill are mandated by 101's README.
// Visit /newspaper-101?debug=1 for the red alignment boxes.

type Hotspot = { label: string; href: string; left: string; top: string; width: string; height: string };

const hotspots: Hotspot[] = [
  // --- Content hotspots ---
  { label: 'Issue box', href: '/issue', left: '2.8%', top: '3.0%', width: '14.8%', height: '5.4%' },
  { label: 'Top story and image', href: '/stories/parliament-returns-after-easter-recess', left: '2.8%', top: '27.0%', width: '94.4%', height: '40.0%' },
  { label: 'Cost of Living card', href: '/economy', left: '2.8%', top: '68.5%', width: '29.6%', height: '24.0%' },
  { label: 'NHS card', href: '/public-services/nhs', left: '32.8%', top: '68.5%', width: '31.0%', height: '24.0%' },
  { label: 'Voices card', href: '/voices', left: '64.5%', top: '68.5%', width: '32.7%', height: '24.0%' },
  // --- Navbar hotspots (all top 22.6%, height 3.3%) ---
  { label: 'Home', href: '/', left: '2.6%', top: '22.6%', width: '8.0%', height: '3.3%' },
  { label: 'Bills', href: '/bills', left: '10.8%', top: '22.6%', width: '8.0%', height: '3.3%' },
  { label: 'Laws', href: '/laws', left: '19.0%', top: '22.6%', width: '8.0%', height: '3.3%' },
  { label: 'Peoples Polls', href: '/peoples-polls', left: '27.0%', top: '22.6%', width: '14.0%', height: '3.3%' },
  { label: 'MPs', href: '/mps', left: '41.0%', top: '22.6%', width: '7.2%', height: '3.3%' },
  { label: 'Departments', href: '/departments', left: '48.2%', top: '22.6%', width: '14.4%', height: '3.3%' },
  { label: 'Login', href: '/login', left: '62.6%', top: '22.6%', width: '8.0%', height: '3.3%' },
  { label: 'About', href: '/about', left: '70.6%', top: '22.6%', width: '8.3%', height: '3.3%' },
  { label: 'Contact Donate', href: '/contact-donate', left: '78.9%', top: '22.6%', width: '18.5%', height: '3.3%' },
];

// Overlay text labels — verbatim positions from 101's styles.css (transparent).
const overlays = [
  { text: 'FULL STORY →', left: '3.3%', top: '61.2%', fontSize: 'clamp(12px, 1.2vw, 22px)' },
  { text: 'MORE INFO →', left: '3.1%', top: '90.7%', fontSize: 'clamp(11px, 1vw, 20px)' },
  { text: 'MORE INFO →', left: '34.8%', top: '90.7%', fontSize: 'clamp(11px, 1vw, 20px)' },
  { text: 'MORE INFO →', left: '66.0%', top: '90.7%', fontSize: 'clamp(11px, 1vw, 20px)' },
];

// 101's styles.css, reproduced (body rules moved onto .preview-root).
const baseCss = `
  .preview-root {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: #120d09;
    font-family: Georgia, "Times New Roman", serif;
  }

  .preview-root .page-wrap {
    position: relative;
    width: min(100%, 1040px);
    aspect-ratio: 1033 / 1523;
    filter: drop-shadow(0 24px 42px rgba(0, 0, 0, 0.48));
  }

  .preview-root .newspaper-image {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: fill;
    user-select: none;
    pointer-events: none;
  }

  .preview-root .hotspot {
    position: absolute;
    z-index: 30;
    display: block;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
    transition:
      background-color 150ms ease,
      box-shadow 150ms ease,
      transform 150ms ease;
  }

  .preview-root .hotspot:hover,
  .preview-root .hotspot:focus-visible {
    background-color: rgba(90, 45, 22, 0.12);
    box-shadow: inset 0 0 0 2px rgba(80, 32, 18, 0.28);
    transform: translateY(-1px);
    outline: none;
  }

  .preview-root .overlay-text {
    position: absolute;
    z-index: 20;
    pointer-events: none;
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #6b1f14;
    background: transparent;
    padding: 0;
    line-height: 1;
  }

  @media (max-width: 720px) {
    .preview-root { padding: 0; }
    .preview-root .page-wrap { width: 100vw; }
    .preview-root .hotspot:hover {
      background-color: transparent;
      box-shadow: none;
      transform: none;
    }
  }
`;

// Mirrors 101's debug-hotspots.html: visible red boxes for alignment checking.
const debugCss = `
  .preview-root .hotspot {
    background: rgba(255, 0, 0, 0.14);
    box-shadow: inset 0 0 0 2px rgba(255, 0, 0, 0.7);
  }
`;

export default async function Newspaper101Demo({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const { debug } = await searchParams;
  const isDebug = debug === '1' || debug === 'true';

  return (
    <div className="preview-root">
      <style dangerouslySetInnerHTML={{ __html: isDebug ? baseCss + debugCss : baseCss }} />
      <main className="page-wrap" aria-label="The People's Chamber clickable newspaper landing page">
        <img
          className="newspaper-image"
          src="/newspaper-101.png"
          alt="The People's Chamber vintage newspaper landing page"
        />
        {hotspots.map((spot) => (
          <a
            key={spot.label}
            className="hotspot"
            href={spot.href}
            aria-label={spot.label}
            style={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }}
          />
        ))}
        {overlays.map((o, i) => (
          <div
            key={i}
            className="overlay-text"
            style={{ left: o.left, top: o.top, fontSize: o.fontSize }}
          >
            {o.text}
          </div>
        ))}
      </main>
    </div>
  );
}
