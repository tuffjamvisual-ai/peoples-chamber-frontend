// Temp preview — built fresh from ~/Downloads/121 ("CHECKED HOTSPOTS" version).
// Per 121's README the prior aspect-ratio was wrong: the image is 1033x1523,
// so this uses aspect-ratio 1033/1523 + object-fit: fill, and the recalculated
// hotspot percentages (navbar at top 18.8%). hrefs/labels verbatim from 121.
//
// Visit /newspaper-preview?debug=1 to overlay the red alignment boxes from
// 121's debug-hotspots.html.
// Image: public/newspaper-landing.png (121's peoples-chamber-newspaper.png, 1033x1523).

type Hotspot = {
  label: string;
  href: string;
  left: string;
  top: string;
  width: string;
  height: string;
};

// Verbatim from 121's index.html + styles.css.
const hotspots: Hotspot[] = [
  // --- Content hotspots ---
  { label: 'Issue box', href: '/issue', left: '2.8%', top: '5.7%', width: '14.2%', height: '4.8%' },
  { label: 'Top story and image', href: '/stories/parliament-returns-after-easter-recess', left: '2.7%', top: '23.0%', width: '94.5%', height: '41.5%' },
  { label: 'Cost of Living card', href: '/economy', left: '2.7%', top: '68.5%', width: '29.7%', height: '26.0%' },
  { label: 'NHS card', href: '/public-services/nhs', left: '32.6%', top: '68.5%', width: '31.0%', height: '26.0%' },
  { label: 'Voices card', href: '/voices', left: '64.3%', top: '68.5%', width: '32.7%', height: '26.0%' },
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

// 121's styles.css, reproduced verbatim (body rules moved onto .preview-root
// since a route page cannot own <body>). aspect-ratio 1033/1523 + object-fit fill
// are mandated by the 121 README. Scoped under .preview-root.
const baseCss = `
  .preview-root {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 16px;
    box-sizing: border-box;
    background: #120d09;
    font-family: Georgia, "Times New Roman", serif;
  }

  .preview-root .page-wrap {
    position: relative;
    aspect-ratio: 1033 / 1523;
    /* Fit the whole newspaper inside the viewport, preserving aspect ratio.
       On a 16:9 (landscape) screen the height is the limit; on a tall/portrait
       screen the width is. 32px = 2 x 16px page padding. */
    height: min(calc(100vh - 32px), calc((100vw - 32px) * 1523 / 1033));
    width: auto;
    max-width: calc(100vw - 32px);
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
    .preview-root .hotspot:hover {
      background-color: transparent;
      box-shadow: none;
      transform: none;
    }
  }
`;

// Mirrors 121's debug-hotspots.html: visible red boxes for alignment checking.
const debugCss = `
  .preview-root .hotspot {
    background: rgba(255, 0, 0, 0.14);
    box-shadow: inset 0 0 0 2px rgba(255, 0, 0, 0.7);
  }
`;

export default async function NewspaperPreview({
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
          src="/newspaper-landing-blank.png"
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
