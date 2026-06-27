// New page — built from ~/Downloads/blank ("blank body" build).
// Route: /newspaper-blank (separate; does not touch any other page).
// Image: public/newspaper-blank.png (1033x1523, blank-body artwork — story
// content and story images removed; header, issue box, truth box, navbar and
// footer retained).
//
// Per the blank README only the issue box + 9 navbar links are active hotspots
// (no story cards, no overlay text). Reproduced verbatim from blank's
// index.html + styles.css. aspect-ratio 1033/1523 + object-fit: fill.
// Visit /newspaper-blank?debug=1 for the red alignment boxes.

type Hotspot = { label: string; href: string; left: string; top: string; width: string; height: string };

const hotspots: Hotspot[] = [
  { label: 'Issue box', href: '/issue', left: '2.8%', top: '3.0%', width: '14.8%', height: '5.4%' },
  // --- Navbar hotspots (all top 18.8%, height 3.2%) ---
  { label: 'Home', href: '/', left: '2.4%', top: '18.8%', width: '8.4%', height: '3.2%' },
  { label: 'Bills', href: '/bills', left: '10.8%', top: '18.8%', width: '8.4%', height: '3.2%' },
  { label: 'Laws', href: '/laws', left: '19.2%', top: '18.8%', width: '8.8%', height: '3.2%' },
  { label: 'Peoples Polls', href: '/peoples-polls', left: '28.0%', top: '18.8%', width: '15.3%', height: '3.2%' },
  { label: 'MPs', href: '/mps', left: '43.3%', top: '18.8%', width: '7.3%', height: '3.2%' },
  { label: 'Departments', href: '/departments', left: '50.6%', top: '18.8%', width: '15.0%', height: '3.2%' },
  { label: 'Login', href: '/login', left: '65.6%', top: '18.8%', width: '8.0%', height: '3.2%' },
  { label: 'About', href: '/about', left: '73.6%', top: '18.8%', width: '9.2%', height: '3.2%' },
  { label: 'Contact Donate', href: '/contact-donate', left: '82.8%', top: '18.8%', width: '14.6%', height: '3.2%' },
];

// blank's styles.css, reproduced (body rules moved onto .preview-root).
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

// Mirrors blank's debug-hotspots.html: visible red boxes for alignment checking.
const debugCss = `
  .preview-root .hotspot {
    background: rgba(255, 0, 0, 0.14);
    box-shadow: inset 0 0 0 2px rgba(255, 0, 0, 0.7);
  }
`;

export default async function NewspaperBlank({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const { debug } = await searchParams;
  const isDebug = debug === '1' || debug === 'true';

  return (
    <div className="preview-root">
      <style dangerouslySetInnerHTML={{ __html: isDebug ? baseCss + debugCss : baseCss }} />
      <main className="page-wrap" aria-label="Open Govt clickable newspaper landing page">
        <img
          className="newspaper-image"
          src="/newspaper-blank.png"
          alt="Open Govt vintage newspaper landing page"
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
      </main>
    </div>
  );
}
