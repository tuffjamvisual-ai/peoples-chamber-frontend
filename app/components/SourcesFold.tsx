'use client';

// ART-SOURCES (owner approved 18 Nov 2026, Cowork ENTRY 290): an article's sources folded at its end, closed, titled
// "Sources (N)", opening in place, so the reader never leaves the article to see them. It replaced the one "Sources (N)"
// link to /<section>/<slug>/sources (2 Nov 2026); those addresses now redirect here, to #sources, which opens the fold.
// A native <details>: it opens and closes without JavaScript; the script only opens it for #sources. The list inside is
// SourcesList, as on the old page, whose outside links open in a new tab (target=_blank rel=noopener noreferrer).
// data-og-sources: the marked Sources place of the page (A9, owner rule D6).
import { useEffect, useRef, type ReactNode } from 'react';

const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';

const CSS = `
.art-sources > summary { list-style: none; display: inline-flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; color: ${ACCENT}; text-decoration: underline; text-underline-offset: 3px; }
.art-sources > summary::-webkit-details-marker { display: none; }
.art-sources > summary::after { content: "+"; font-size: 18px; line-height: 1; text-decoration: none; }
.art-sources[open] > summary::after { content: "\\2212"; }
.art-sources > summary:focus-visible { outline: 3px solid ${ACCENT}; outline-offset: 2px; }
`;

// plain: inside a box that already has its own rule and spacing (a database briefing's 'Sources checked'), so no rule or
// margins of its own; the line takes the place of the link with no change in height.
export default function SourcesFold({ count, plain = false, children }: { count: number; plain?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const open = () => {
      const d = ref.current;
      if (!d || location.hash !== '#sources') return;
      d.open = true;
      requestAnimationFrame(() => d.scrollIntoView({ block: 'start' }));
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return (
    <details ref={ref} id="sources" className="art-sources" data-og-sources="" style={plain ? { scrollMarginTop: '24px' } : { borderTop: `1px solid ${HAIRLINE}`, paddingTop: '8px', margin: '8px 0 24px', fontSize: '15px', scrollMarginTop: '24px' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <summary>Sources ({count.toLocaleString('en-GB')})</summary>
      <div style={{ margin: '8px 0 0', lineHeight: 1.6 }}>{children}</div>
    </details>
  );
}
