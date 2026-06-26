import type { Metadata } from 'next';
import './landing-demo2.css';

// /landing-demo2 — DEMO ONLY (noindex). The folders-pile backdrop (folders.webp)
// with a single empty "clean folder" centred on it. No masthead, nav, or article
// content — left unpopulated per request. The live landing page is untouched.

export const metadata: Metadata = {
  title: 'Landing demo — clean folder (preview)',
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
      <div style={{ position: 'relative', zIndex: 1, width: 'min(94vw, 1144px)' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1085 / 1450' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/clean-folder.webp"
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
              filter: 'drop-shadow(0 18px 38px rgba(0,0,0,0.55))',
            }}
          />
        </div>
      </div>
    </div>
  );
}
