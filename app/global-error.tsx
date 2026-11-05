'use client';

// The last resort, shown when the root layout itself fails (Stage D, owner, 5 Nov 2026). It replaces the whole document,
// so it brings its own html and body and uses no site styles or fonts: nothing it needs can have failed.
const INK = '#14100d';
const ACCENT = '#7a1612';
const PAPER = '#ecd9a6';
const MONO = "'Courier New', Courier, monospace";

export default function GlobalError() {
  return (
    <html lang="en">
      <head>
        <title>This page could not be loaded | opengovt</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, minHeight: '100vh', background: PAPER, color: INK, fontFamily: MONO }}>
        <main style={{ maxWidth: '46em', margin: '0 auto', padding: 'clamp(32px, 8vw, 96px) 16px' }}>
          <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 24px' }}>opengovt</p>
          <h1 style={{ fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 'bold', margin: '0 0 12px' }}>
            This page could not be loaded
          </h1>
          <p style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 20px' }}>Please try again shortly.</p>
          <p style={{ fontSize: '16px', margin: 0 }}>
            {/* A plain link, not next/link: the app has failed, so this loads the homepage afresh. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Go to the homepage</a>
          </p>
        </main>
      </body>
    </html>
  );
}
