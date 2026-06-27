// New page — built from ~/Downloads/new1 ("Blank Content V2").
// Route: /newspaper-new1 (separate; touches no other page).
// Image: public/newspaper-new1.png (1033x1523, blank-content artwork — story
// text/images removed below the nav; header, navbar and footer kept).
//
// Keeps all 15 hotspots: issue box, top-story TEXT and top-story IMAGE as two
// separate hotspots, the 3 article cards (cost/nhs/voices), and 9 navbar links.
// No overlay text. Reproduced verbatim from new1's index.html + styles.css.
// aspect-ratio 1033/1523 + object-fit: fill. Visit ?debug=1 for red boxes.

type Hotspot = { label: string; href: string; left: string; top: string; width: string; height: string };

const hotspots: Hotspot[] = [
  // --- Content hotspots ---
  { label: 'Issue box', href: '/issue', left: '2.8%', top: '3.0%', width: '14.8%', height: '5.4%' },
  { label: 'Top story text', href: '/stories/parliament-returns-after-easter-recess', left: '2.7%', top: '23.3%', width: '33.8%', height: '41.0%' },
  { label: 'Top story image', href: '/stories/unite-the-kingdom-protest', left: '36.5%', top: '23.3%', width: '60.7%', height: '41.0%' },
  { label: 'Cost of Living card', href: '/economy', left: '2.7%', top: '64.4%', width: '29.7%', height: '28.5%' },
  { label: 'NHS card', href: '/public-services/nhs', left: '32.6%', top: '64.4%', width: '31.0%', height: '28.5%' },
  { label: 'Voices card', href: '/voices', left: '64.3%', top: '64.4%', width: '32.7%', height: '28.5%' },
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

// new1's styles.css, reproduced (body rules moved onto .preview-root).
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

// Mirrors new1's debug-hotspots.html: visible red boxes for alignment checking.
const debugCss = `
  .preview-root .hotspot {
    background: rgba(255, 0, 0, 0.14);
    box-shadow: inset 0 0 0 2px rgba(255, 0, 0, 0.7);
  }
`;

export default async function NewspaperNew1({
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
          src="/newspaper-new1.png"
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
