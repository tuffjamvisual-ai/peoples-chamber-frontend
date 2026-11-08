'use client';

// Fold away sections on phones (owner, 4 Nov 2026; the GOV.UK accordion). Under 480px: "On this page", "Show all
// sections", then each section as a heading with a one line summary, closed until tapped. Tapping an "On this page" item,
// or arriving with #<id> or ?section=<id> in the address, opens that section and scrolls to it. From 480px up none of this
// shows: the headings, list and folds are display:none and each section's content is as it was.
//
// Native details and summary (owner, 5 Nov 2026), so a fold opens without JavaScript. The section's content sits beside
// the details, not in it, because from 480px up it must show whether or not the fold is open: a rule on .pf-d[open] + .pf-body
// shows it. Folds left open come back on Back and Forward (sessionStorage; window.__ogBack is set in lib/phone-enhance.ts).
//
// The closed state is in the page HTML and the stylesheet below applies only under 480px, so nothing moves when the
// script runs. The rules are here, not in globals.css, so they always arrive with the markup they style. The MP page folds
// under 640px (owner, 4 Nov 2026): phoneMax sets the width, 479 for every other page. A phone held sideways folds too,
// whatever its width (RT1, lib/breakpoints.ts).

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { phoneUpTo, wideFrom } from '@/lib/breakpoints';

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
.pf-contents, .pf-all, .pf-d, .pf-sd { display: none; }
@media ${wideFrom(phoneMax + 1)} { .pf-off { display: none !important; } .pf-off:has(:target) { display: block !important; } .pf-sb { display: contents; } }
@media ${phoneUpTo(phoneMax)} {
  .pf-contents { display: block; margin-bottom: 12px; font-size: 15px; }
  .pf-contents h2 { font-size: 17px; font-weight: bold; margin: 0 0 4px; }
  .pf-contents ul { list-style: none; padding: 0; margin: 0; }
  .pf-contents a { display: flex; align-items: center; min-height: 44px; color: #7a1612; text-decoration: underline; text-underline-offset: 3px; }
  html.og-js .pf-all { display: block; min-height: 44px; margin: 0 0 8px auto; padding: 0 4px; background: none; border: none; color: #7a1612; font: inherit; font-size: 15px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .pf-sec { border-top: 1px solid rgba(20,16,13,0.35); scroll-margin-top: 8px; }
  .pf-list .pf-sec:last-child { border-bottom: 1px solid rgba(20,16,13,0.35); }
  .pf-d { display: block; }
  .pf-d > summary { display: block; list-style: none; cursor: pointer; }
  .pf-d > summary::-webkit-details-marker { display: none; }
  .pf-d > summary::after { content: none !important; }
  .pf-h { display: block; margin: 0; font-size: 16px; font-weight: bold; }
  .pf-btn { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; min-height: 48px; padding: 8px 2px; color: #14100d; text-align: left; }
  .pf-sum { font-weight: normal; }
  .pf-mark { flex: 0 0 auto; font-size: 20px; line-height: 1; color: #7a1612; }
  .pf-mark::before { content: '+'; }
  .pf-d[open] .pf-mark::before { content: '\\2212'; }
  .pf-d:not([open]) + .pf-body { display: none; }
  .pf-body { padding: 16px 0 12px; }
  .pf-body > h2:first-child, .pf-body > div:first-child > h2:first-child { display: none; }
  .pf-list .pf-body > .pf-sub > h2:first-child { display: block; }
  /* Folds inside a fold (SubFold below; owner, 7 Nov 2026, PF3): closed at first, the content beside the details as above. */
  .pf-sd { display: block; border-top: 1px dashed rgba(20,16,13,0.3); }
  .pf-sd > summary { display: block; list-style: none; cursor: pointer; }
  .pf-sd > summary::-webkit-details-marker { display: none; }
  .pf-sd > summary::after { content: none !important; }
  .pf-sbtn { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 44px; padding: 6px 2px; font-size: 15px; font-weight: bold; color: #14100d; text-align: left; }
  .pf-sd[open] .pf-mark::before { content: '\\2212'; }
  .pf-sd:not([open]) + .pf-sb { display: none; }
  /* A link to something inside a closed fold (/mps/<id>#register-history) shows it, with JavaScript off as well (MP1). */
  .pf-d:not([open]) + .pf-body:has(:target), .pf-sd:not([open]) + .pf-sb:has(:target) { display: block; }
  .pf-sb { display: block; padding: 4px 0 12px; }
  .pf-sb > h2:first-child, .pf-sb > h3:first-child, .pf-list .pf-body > .pf-sub > .pf-sb > h2:first-child { display: none; }
}`;

const memoryKey = () => `og-folds:${window.location.pathname}${window.location.search}`;

export default function PhoneFolds({ folds, showContents = true, contentsLabel = 'On this page', phoneMax = 479 }: { folds: Fold[]; showContents?: boolean; contentsLabel?: string; phoneMax?: number }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const allOpen = folds.length > 0 && folds.every((f) => open.has(f.id));
  const add = (id: string) => setOpen((cur) => (cur.has(id) ? cur : new Set(cur).add(id)));
  // The browser has already opened or closed the details; this keeps the state in step and does nothing if it already is.
  const toggled = (id: string, isOpen: boolean) => setOpen((cur) => {
    if (cur.has(id) === isOpen) return cur;
    const next = new Set(cur);
    if (isOpen) next.add(id); else next.delete(id);
    return next;
  });
  const ready = useRef(false);

  // Folds opened before the page script ran, and on the way back the folds left open.
  useEffect(() => {
    const now = new Set([...document.querySelectorAll<HTMLElement>('.pf-d[open]')].map((d) => d.parentElement?.dataset.fold ?? ''));
    now.delete('');
    if (window.__ogBack === `${window.location.pathname}${window.location.search}`) {
      try { for (const id of JSON.parse(sessionStorage.getItem(memoryKey()) ?? '[]') as string[]) now.add(id); } catch { /* no memory, folds stay closed */ }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the page and from sessionStorage, which the server cannot see
    if (now.size) setOpen((cur) => new Set([...cur, ...now]));
    ready.current = true;
  }, []);
  useEffect(() => {
    if (!ready.current) return;
    try { sessionStorage.setItem(memoryKey(), JSON.stringify([...open])); } catch { /* private window: no memory */ }
  }, [open]);

  // The address names a section, or something inside one (a link from elsewhere on the site): open it and go there.
  useEffect(() => {
    const reveal = () => {
      if (!window.matchMedia(phoneUpTo(phoneMax)).matches) return;
      const named = new URLSearchParams(window.location.search).get('section');
      const hash = window.location.hash.slice(1);
      const el = (named && document.getElementById(`section-${named}`))
        || (hash && (document.getElementById(`section-${hash}`) || document.getElementById(hash)));
      const sec = el ? el.closest<HTMLElement>('[data-fold]') : null;
      if (!sec?.dataset.fold) return;
      add(sec.dataset.fold);
      // A target inside a sub-fold (SubFold) opens that too (MP1).
      const sb = (el as HTMLElement).closest('.pf-sb');
      if (sb?.previousElementSibling instanceof HTMLDetailsElement) sb.previousElementSibling.open = true;
      requestAnimationFrame(() => (el as HTMLElement).scrollIntoView());
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, [phoneMax]);

  return (
    <>
      <style>{css(phoneMax)}</style>
      {showContents && (
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
      )}
      <button type="button" className="pf-all" aria-expanded={allOpen} onClick={() => setOpen(allOpen ? new Set() : new Set(folds.map((f) => f.id)))}>
        {allOpen ? 'Hide all sections' : 'Show all sections'}
      </button>
      <div className="pf-list">
        {folds.map((f) => {
          const isOpen = open.has(f.id);
          return (
            <section key={f.id} id={`section-${f.id}`} data-fold={f.id} className={`pf-sec${isOpen ? ' pf-open' : ''}${f.hiddenWide ? ' pf-off' : ''}`}>
              <details className="pf-d" open={isOpen} onToggle={(e) => toggled(f.id, e.currentTarget.open)}>
                <summary>
                  <h2 className="pf-h">
                    <span className="pf-btn">
                      <span>{f.label}{f.summary ? <span className="pf-sum">: {f.summary}</span> : null}</span>
                      <span aria-hidden className="pf-mark" />
                    </span>
                  </h2>
                </summary>
              </details>
              <div id={`fold-${f.id}`} className="pf-body" data-section-block={f.id}>{f.node}</div>
            </section>
          );
        })}
      </div>
    </>
  );
}

// A fold inside a phone fold (owner, 7 Nov 2026, PF3): a native details holding only its summary, a 44px tap target with
// 15px text naming the part and its count, closed at first, and the content beside it, shown when it is open. Its own
// heading is hidden on phones, as the summary names it. From the phone width up the details is hidden and the content's
// box is display: contents, so the page renders exactly as without it. The styles are in PhoneFolds' stylesheet above.
export function SubFold({ label, summary, children }: { label: string; summary?: string | null; children: ReactNode }) {
  return (
    <>
      <details className="pf-sd">
        <summary>
          <span className="pf-sbtn">
            <span>{label}{summary ? <span className="pf-sum">: {summary}</span> : null}</span>
            <span aria-hidden className="pf-mark" />
          </span>
        </summary>
      </details>
      <div className="pf-sb">{children}</div>
    </>
  );
}
