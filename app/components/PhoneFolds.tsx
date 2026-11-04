'use client';

// Fold away sections on phones (owner, 4 Nov 2026; the GOV.UK accordion). Under 480px: "On this page", "Show all
// sections", then each section as a button heading with a one line summary, closed until tapped. Tapping an "On this
// page" item, or arriving with #<id> or ?section=<id> in the address, opens that section and scrolls to it. From 480px
// up none of this shows: the buttons, list and folds are display:none and each section's content is as it was.
//
// The closed state is in the page HTML and the stylesheet below applies only under 480px, so nothing moves when the
// script runs. The rules are here, not in globals.css, so they always arrive with the markup they style. The MP page folds
// under 640px (owner, 4 Nov 2026): phoneMax sets the width, 479 for every other page.

import { useEffect, useState, type ReactNode } from 'react';

export type Fold = {
  id: string;
  /** The button heading, in sentence case. */
  label: string;
  /** One line after the label, from figures already in the page; none when there is no honest count to give. */
  summary?: string | null;
  node: ReactNode;
  /** From 480px up, a section that is not the open tab (the MP page's tabs). */
  hiddenWide?: boolean;
};

const css = (phoneMax: number) => `
.pf-contents, .pf-all, .pf-h { display: none; }
@media (min-width: ${phoneMax + 1}px) { .pf-off { display: none !important; } }
@media (max-width: ${phoneMax}px) {
  .pf-contents { display: block; margin-bottom: 12px; font-size: 15px; }
  .pf-contents h2 { font-size: 17px; font-weight: bold; margin: 0 0 4px; }
  .pf-contents ul { list-style: none; padding: 0; margin: 0; }
  .pf-contents a { display: flex; align-items: center; min-height: 44px; color: #7a1612; text-decoration: underline; text-underline-offset: 3px; }
  .pf-all { display: block; min-height: 44px; margin: 0 0 8px auto; padding: 0 4px; background: none; border: none; color: #7a1612; font: inherit; font-size: 15px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .pf-sec { border-top: 1px solid rgba(20,16,13,0.35); scroll-margin-top: 8px; }
  .pf-list .pf-sec:last-child { border-bottom: 1px solid rgba(20,16,13,0.35); }
  .pf-h { display: block; margin: 0; font-size: 16px; font-weight: bold; }
  .pf-btn { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; min-height: 48px; padding: 8px 2px; background: none; border: none; color: #14100d; font: inherit; text-align: left; cursor: pointer; }
  .pf-sum { font-weight: normal; }
  .pf-mark { flex: 0 0 auto; font-size: 20px; line-height: 1; color: #7a1612; }
  .pf-sec:not(.pf-open) > .pf-body { display: none; }
  .pf-body { padding: 16px 0 12px; }
  .pf-body > h2:first-child, .pf-body > div:first-child > h2:first-child { display: none; }
  .pf-list .pf-body > .pf-sub > h2:first-child { display: block; }
}`;

export default function PhoneFolds({ folds, contentsLabel = 'On this page', phoneMax = 479 }: { folds: Fold[]; contentsLabel?: string; phoneMax?: number }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const allOpen = folds.length > 0 && folds.every((f) => open.has(f.id));
  const add = (id: string) => setOpen((cur) => (cur.has(id) ? cur : new Set(cur).add(id)));
  const toggle = (id: string) => setOpen((cur) => {
    const next = new Set(cur);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  // The address names a section, or something inside one (a link from elsewhere on the site): open it and go there.
  useEffect(() => {
    const reveal = () => {
      if (!window.matchMedia(`(max-width: ${phoneMax}px)`).matches) return;
      const named = new URLSearchParams(window.location.search).get('section');
      const hash = window.location.hash.slice(1);
      const el = (named && document.getElementById(`section-${named}`))
        || (hash && (document.getElementById(`section-${hash}`) || document.getElementById(hash)));
      const sec = el ? el.closest<HTMLElement>('[data-fold]') : null;
      if (!sec?.dataset.fold) return;
      add(sec.dataset.fold);
      requestAnimationFrame(() => (el as HTMLElement).scrollIntoView());
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, [phoneMax]);

  return (
    <>
      <style>{css(phoneMax)}</style>
      <nav aria-label={contentsLabel} className="pf-contents">
        <h2>{contentsLabel}</h2>
        <ul>
          {folds.map((f) => (
            <li key={f.id}>
              <a href={`#section-${f.id}`} onClick={() => add(f.id)}>{f.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <button type="button" className="pf-all" aria-expanded={allOpen} onClick={() => setOpen(allOpen ? new Set() : new Set(folds.map((f) => f.id)))}>
        {allOpen ? 'Hide all sections' : 'Show all sections'}
      </button>
      <div className="pf-list">
        {folds.map((f) => {
          const isOpen = open.has(f.id);
          return (
            <section key={f.id} id={`section-${f.id}`} data-fold={f.id} className={`pf-sec${isOpen ? ' pf-open' : ''}${f.hiddenWide ? ' pf-off' : ''}`}>
              <h2 className="pf-h">
                <button type="button" className="pf-btn" aria-expanded={isOpen} aria-controls={`fold-${f.id}`} onClick={() => toggle(f.id)}>
                  <span>{f.label}{f.summary ? <span className="pf-sum">: {f.summary}</span> : null}</span>
                  <span aria-hidden className="pf-mark">{isOpen ? '−' : '+'}</span>
                </button>
              </h2>
              <div id={`fold-${f.id}`} className="pf-body" data-section-block={f.id}>{f.node}</div>
            </section>
          );
        })}
      </div>
    </>
  );
}
