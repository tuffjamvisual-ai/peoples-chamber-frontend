// Temp page — exact reproduction of ~/Downloads/land222/peoples-chamber-claude-exact
// (index.html + styles.css + hotspot-map.json). The approved render is used as the
// background artwork (public/blank-landing-art.png, 1023x1537) with 18 invisible
// absolute-positioned hotspots over it — so it matches the mockup exactly, with the
// typography baked into the image (no font substitution). Per the README: no visible
// borders on hotspots, object-fit contain, 1023/1537 aspect, no white behind corners.
//
// Markup + CSS reproduced verbatim, with the usual Next adaptation (the stylesheet's
// `html, body` rules applied to a `.frame-root` wrapper since a page can't own <body>;
// dark backdrop so the rounded corners show no white). Visit /blank-landing?debug=1
// to reveal the hotspot hitboxes.

type Hotspot = { cls: string; href: string; label: string; left: string; top: string; width: string; height: string };

// Verbatim from styles.css / hotspot-map.json (percentages of the 1023x1537 render).
const hotspots: Hotspot[] = [
  { cls: 'issue', href: '#issue', label: 'Issue 23', left: '4.4%', top: '6.8%', width: '16.3%', height: '8.0%' },
  { cls: 'nav-home', href: '#home', label: 'Home', left: '4.1%', top: '19.3%', width: '5.8%', height: '2.2%' },
  { cls: 'nav-bills', href: '#bills', label: 'Bills', left: '11.8%', top: '19.3%', width: '5.4%', height: '2.2%' },
  { cls: 'nav-laws', href: '#laws', label: 'Laws', left: '19.0%', top: '19.3%', width: '5.0%', height: '2.2%' },
  { cls: 'nav-polls', href: '#peoples-polls', label: 'Peoples Polls', left: '26.0%', top: '19.3%', width: '11.3%', height: '2.2%' },
  { cls: 'nav-mps', href: '#mps', label: 'MPs', left: '39.5%', top: '19.3%', width: '5.1%', height: '2.2%' },
  { cls: 'nav-departments', href: '#departments', label: 'Departments', left: '46.7%', top: '19.3%', width: '10.6%', height: '2.2%' },
  { cls: 'nav-transparency', href: '#transparency', label: 'Transparency', left: '59.5%', top: '19.3%', width: '12.6%', height: '2.2%' },
  { cls: 'nav-contact', href: '#contact', label: 'Contact', left: '75.3%', top: '19.3%', width: '8.0%', height: '2.2%' },
  { cls: 'nav-login', href: '#login', label: 'Login', left: '86.0%', top: '19.3%', width: '7.2%', height: '2.2%' },
  { cls: 'lead-left', href: '#lead-left', label: 'Large left feature hotspot', left: '3.7%', top: '23.2%', width: '44.5%', height: '36.2%' },
  { cls: 'lead-right', href: '#lead-right', label: 'Large right feature hotspot', left: '50.5%', top: '23.2%', width: '45.7%', height: '36.2%' },
  { cls: 'bottom-left', href: '#bottom-left', label: 'Bottom left hotspot', left: '3.7%', top: '65.8%', width: '28.7%', height: '24.5%' },
  { cls: 'bottom-centre', href: '#bottom-centre', label: 'Bottom centre hotspot', left: '34.2%', top: '65.8%', width: '29.4%', height: '24.5%' },
  { cls: 'bottom-right', href: '#bottom-right', label: 'Bottom right hotspot', left: '65.7%', top: '65.8%', width: '29.4%', height: '24.5%' },
  { cls: 'social', href: '#social', label: 'Social media icons', left: '13.8%', top: '94.7%', width: '25.8%', height: '2.8%' },
  { cls: 'support', href: '#support-us', label: 'Support us', left: '50.0%', top: '94.7%', width: '12.4%', height: '2.8%' },
  { cls: 'account', href: '#account-info', label: 'Account info', left: '69.2%', top: '94.7%', width: '16.9%', height: '2.8%' },
];

const baseCss = `
  .frame-root {
    min-height: 100vh;
    display: grid;
    place-items: center;
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    background: #1a1208;
  }

  .frame-root .frame {
    position: relative;
    width: min(100vw, 1023px);
    aspect-ratio: 1023 / 1537;
    overflow: hidden;
    background: transparent;
    border: 0;
  }

  .frame-root .page-art {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    pointer-events: none;
  }

  .frame-root .hotspot {
    position: absolute;
    display: block;
    border: 0;
    background: transparent;
    text-decoration: none;
    cursor: pointer;
  }

  .frame-root .hotspot:focus-visible {
    outline: 2px solid rgba(128, 22, 16, 0.85);
    outline-offset: 2px;
  }
`;

const debugCss = `
  .frame-root .hotspot {
    outline: 2px dashed rgba(170, 0, 0, 0.55);
    background: rgba(255, 0, 0, 0.06);
  }
`;

export default async function BlankLanding({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const { debug } = await searchParams;
  const isDebug = debug === '1' || debug === 'true';

  return (
    <div className="frame-root">
      <style dangerouslySetInnerHTML={{ __html: isDebug ? baseCss + debugCss : baseCss }} />
      <main className="frame" aria-label="Open Govt clickable front page">
        <img
          className="page-art"
          src="/blank-landing-art.png"
          alt="Open Govt vintage front page layout"
        />
        {hotspots.map((h) => (
          <a
            key={h.cls}
            className={`hotspot ${h.cls}`}
            href={h.href}
            aria-label={h.label}
            style={{ left: h.left, top: h.top, width: h.width, height: h.height }}
          />
        ))}
      </main>
    </div>
  );
}
