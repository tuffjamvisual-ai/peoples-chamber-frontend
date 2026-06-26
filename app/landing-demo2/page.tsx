import type { Metadata } from 'next';
import './landing-demo2.css';

// /landing-demo2 — DEMO ONLY (noindex). The folders-pile backdrop (folders.webp)
// with a single empty "oldfolder" centred on it. No masthead, nav, or article
// content — left unpopulated per request. The live landing page is untouched.

export const metadata: Metadata = {
  title: 'Landing demo — old folder (preview)',
  robots: { index: false, follow: false },
};

export default function LandingDemo2() {
  return (
    <div
      className="ng-page"
      style={{
        minHeight: '100vh',
        margin: 0,
        backgroundColor: '#140d07',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3vh 0 8vh',
      }}
    >
      {/* Folders-pile backdrop, pinned to the viewport. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#140d07',
          backgroundImage: 'url(/folders.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Empty clean folder, centred on the backdrop. */}
      <div style={{ position: 'relative', zIndex: 1, width: 'min(96vw, 1240px)' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1085 / 1450' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fold.webp"
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
              transform: 'rotate(-2.5deg)',
              // native goldenrod (~#CC944F / 204,148,79) — no tone muting.
              filter: 'drop-shadow(0 18px 38px rgba(0,0,0,0.55))',
            }}
          />

          {/* Main-site dossier folder template (folder-top/mid/bottom slices,
              assembled as in DossierShell) laid on top of the fold folder. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              width: '80%',
              height: '74%',
              display: 'flex',
              flexDirection: 'column',
              // darken + saturate so the (paler) dossier folder matches the
              // fold folder's muted goldenrod tone; then the drop shadows.
              filter: 'brightness(0.72) saturate(1.5) drop-shadow(0 14px 30px rgba(0,0,0,0.5)) drop-shadow(-9px 2px 10px rgba(0,0,0,0.4))',
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: '100%', aspectRatio: '1023 / 160', backgroundImage: 'url(/folder-top.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }} />
            <div style={{ flex: '1 1 auto', backgroundImage: 'url(/folder-mid.webp)', backgroundRepeat: 'repeat-y', backgroundSize: '100% auto' }} />
            <div style={{ width: '100%', aspectRatio: '1023 / 157', backgroundImage: 'url(/folder-bottom.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', marginTop: '-5%', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 34%)', maskImage: 'linear-gradient(180deg, transparent 0%, #000 34%)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
