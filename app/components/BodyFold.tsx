// A closed fold inside an article's body (owner, 26 Nov 2026, Cowork ENTRY 705 and 706): the 'fold' block, a label and a list
// of lines, shown under the line it belongs to (first use: every register entry under each MP of a top ten). It looks and
// works like the Sources fold at the article's end (SourcesFold): closed at every width, the label underlined with + beside
// it (minus when open). A native <details>: it opens and closes with no JavaScript, by mouse, touch, Enter or Space; its
// <summary> is a button to screen readers, which also say whether it is expanded or collapsed. The lines are in the HTML
// when closed, so search engines and the page's own search read them.
import type { ReactNode } from 'react';

const ACCENT = '#7a1612';

// On phones every .ng-page summary::after is the invisible 44px tap layer (globals.css, absolute); the + / minus here is drawn
// static beside the words instead, as SourcesFold, .rf-d and .pg-d do; the summary is 44px itself.
const CSS = `
.art-fold > summary { list-style: none; display: inline-flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; color: ${ACCENT}; }
.art-fold > summary > span { text-decoration: underline; text-underline-offset: 3px; }
.art-fold > summary::-webkit-details-marker { display: none; }
.art-fold > summary::after, .ng-page .art-fold > summary::after { content: "+"; position: static; transform: none; height: auto; min-width: 0; flex: none; font-size: 18px; line-height: 1; text-decoration: none; }
.art-fold[open] > summary::after, .ng-page .art-fold[open] > summary::after { content: "\\2212"; }
.art-fold > summary:focus-visible { outline: 3px solid ${ACCENT}; outline-offset: 2px; }
`;

export default function BodyFold({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="art-fold" data-body-fold="" style={{ margin: '-14px 0 20px', fontSize: '15px' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <summary><span>{label}</span></summary>
      <ul style={{ margin: '4px 0 8px', paddingLeft: '1.4em', listStyle: 'disc', lineHeight: 1.6 }}>{children}</ul>
    </details>
  );
}
