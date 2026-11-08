'use client';

// "Skip to main content" (owner, 8 Nov 2026, A11Y1): the first thing a keyboard reaches on every page, hidden until it has
// focus (globals.css .og-skip). It is a plain link to #main-content, the page's own content (OpenGovShell.tsx), so it works
// with JavaScript off. With JavaScript on it moves focus there itself and leaves the address alone: a #main-content entry
// in the history would take focus back to the content when the phone menu closes with Escape (it closes by going back).
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="og-skip"
      onClick={(e) => {
        const main = document.getElementById('main-content');
        if (!main) return;
        e.preventDefault();
        main.focus({ preventScroll: true });
        main.scrollIntoView();
      }}
    >
      Skip to main content
    </a>
  );
}
