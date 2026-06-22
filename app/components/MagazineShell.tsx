import type { ReactNode, CSSProperties } from 'react';
import MagazineNav from './MagazineNav';
import MobileNav from './MobileNav';
import './magazine-layout.css';

// Reusable magazine-template shell: #2a1810 paper background with the
// preview-header / preview-footer / preview-middle.webp chrome, the grain
// overlay, the 8-hotspot MagazineNav, and the viewport-scaled content area.
//
// Extracted from the wrapper that was previously inlined across every
// magazine page (/bills, /mps, /departments, /preview, /laws, …) so chrome
// changes happen in one place. Server component — it renders the (client)
// MagazineNav as a child, so it stays usable in server-rendered pages.
//
// Usage:
//   <MagazineShell>
//     {/* page body — already inside .magazine-content-spacing */}
//   </MagazineShell>

const NOISE_OVERLAY =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")";

export default function MagazineShell({
  children,
  contentStyle,
}: {
  children: ReactNode;
  /** Optional overrides merged into the content area's inline style. */
  contentStyle?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1086px',
        margin: '0 auto',
        background: '#2a1810',
        backgroundImage:
          'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
        backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
        backgroundPosition: 'top center, bottom center, top center',
        backgroundSize: '100% auto, 100% auto, 100% auto',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage: NOISE_OVERLAY,
          pointerEvents: 'none',
        }}
      />
      <div className="magazine-desktop-nav">
        <MagazineNav />
      </div>
      <MobileNav />
      <div
        className="magazine-content-spacing"
        style={{
          position: 'relative',
          zIndex: 2,
          color: '#14100d',
          fontFamily: 'Special Elite, monospace',
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
