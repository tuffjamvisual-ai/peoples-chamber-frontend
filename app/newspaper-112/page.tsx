// Separate demo page — built from ~/Downloads/112 ("text-fixed" version).
// Route: /newspaper-112  (chosen because /newspaper-demo is already a real
// existing page in this app — do not overwrite that one).
//
// Same layout as 121 (aspect-ratio 1033/1523, object-fit: fill, same 14
// hotspots) PLUS 4 overlay-text labels that paint over the artwork's old text:
//   "FULL STORY ON PAGE 2" -> "FULL STORY ->"
//   "PAGE 4 / 6 / 10"       -> "MORE INFO ->"  (x3)
//
// Standalone route with its own image asset (public/newspaper-112.png) so it
// does not affect /newspaper-preview. Visit /newspaper-112?debug=1 to overlay
// red alignment boxes.
//
// The 3 bottom-card hotspots use the alignment-corrected top 68.5% / height
// 26% (carried over from the /newspaper-preview fix) rather than 112's
// verbatim top 66% / height 28%, which sat a little high on this artwork.

type Hotspot = {
  label: string;
  href: string;
  left: string;
  top: string;
  width: string;
  height: string;
};

const hotspots: Hotspot[] = [
  // --- Content hotspots ---
  { label: 'Issue box', href: '/issue', left: '2.8%', top: '5.7%', width: '14.2%', height: '4.8%' },
  { label: 'Top story and image', href: '/stories/parliament-returns-after-easter-recess', left: '2.7%', top: '23.0%', width: '94.5%', height: '41.5%' },
  // bottom 3 cards: alignment-corrected (112 verbatim was top 66% / height 28%)
  { label: 'Cost of Living card', href: '/economy', left: '2.7%', top: '68.5%', width: '29.7%', height: '26.0%' },
  { label: 'NHS card', href: '/public-services/nhs', left: '32.6%', top: '68.5%', width: '31.0%', height: '26.0%' },
  { label: 'Voices card', href: '/voices', left: '64.3%', top: '68.5%', width: '32.7%', height: '26.0%' },
  // --- Navbar hotspots (all top 18.8%, height 3.2%) ---
  { label: 'Home', href: '/', left: '2.4%', top: '18.8%', width: '8.4%', height: '3.2%' },
  { label: 'Bills', href: '/bills', left: '10.8%', top: '18.8%', width: '8.4%', height: '3.2%' },
  { label: 'Laws', href: '/laws', left: '19.2%', top: '18.8%', width: '8.8%', height: '3.2%' },
  { label: 'opengovt Polls', href: '/peoples-polls', left: '28.0%', top: '18.8%', width: '15.3%', height: '3.2%' },
  { label: 'MPs', href: '/mps', left: '43.3%', top: '18.8%', width: '7.3%', height: '3.2%' },
  { label: 'Departments', href: '/departments', left: '50.6%', top: '18.8%', width: '15.0%', height: '3.2%' },
  { label: 'Login', href: '/login', left: '65.6%', top: '18.8%', width: '8.0%', height: '3.2%' },
  { label: 'About', href: '/about', left: '73.6%', top: '18.8%', width: '9.2%', height: '3.2%' },
  { label: 'Contact Donate', href: '/contact-donate', left: '82.8%', top: '18.8%', width: '14.6%', height: '3.2%' },
];

// Overlay text labels. 112's verbatim positions (full-story top 58.9%,
// more-info top 90.1%) floated ABOVE the artwork's old text, leaving both
// visible — repositioned here to sit directly over the originals. The
// FULL STORY box is widened so its opaque background masks the longer
// original "FULL STORY ON PAGE 2 ->".
const overlays: {
  text: string;
  left: string;
  top: string;
  width: string;
  height: string;
  fontSize: string;
}[] = [
  // measured against the artwork: original text bands are ~62.3-63.9% (full story)
  // and ~90.3-91.8% (page links). Boxes sized to cover those bands.
  { text: 'FULL STORY →', left: '2.4%', top: '62.0%', width: '24%', height: '2.3%', fontSize: 'clamp(15px, 1.4vw, 24px)' },
  { text: 'MORE INFO →', left: '2.5%', top: '93.0%', width: '13%', height: '2.2%', fontSize: 'clamp(15px, 1vw, 20px)' },
  { text: 'MORE INFO →', left: '34.0%', top: '93.0%', width: '13%', height: '2.2%', fontSize: 'clamp(15px, 1vw, 20px)' },
  { text: 'MORE INFO →', left: '64.5%', top: '93.0%', width: '14%', height: '2.2%', fontSize: 'clamp(15px, 1vw, 20px)' },
];

// 112's styles.css, reproduced (body rules moved onto .preview-root). Scoped
// under .preview-root. aspect-ratio 1033/1523 + object-fit: fill per README.
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
    display: flex;
    align-items: center;
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #6b1f14;
    background: #f0e3cc;
    padding: 0 8px;
    line-height: 1;
    white-space: nowrap;
    pointer-events: none;
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

// Mirrors 112's debug-hotspots.html: visible red boxes for alignment checking.
const debugCss = `
  .preview-root .hotspot {
    background: rgba(255, 0, 0, 0.14);
    box-shadow: inset 0 0 0 2px rgba(255, 0, 0, 0.7);
  }
`;

export default async function Newspaper112Demo({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const { debug } = await searchParams;
  const isDebug = debug === '1' || debug === 'true';

  return (
    <div className="preview-root">
      <style dangerouslySetInnerHTML={{ __html: isDebug ? baseCss + debugCss : baseCss }} />
      <main className="page-wrap" aria-label="opengovt clickable newspaper landing page">
        <img
          className="newspaper-image"
          src="/newspaper-112.png"
          alt="opengovt vintage newspaper landing page"
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
            style={{ left: o.left, top: o.top, width: o.width, height: o.height, fontSize: o.fontSize }}
          >
            {o.text}
          </div>
        ))}
      </main>
    </div>
  );
}
