'use client';

// The MP biography in pages on phones (owner approved 20 Nov 2026, Cowork ENTRY 445 B: "the mobile view may need to split
// into pages"). Under 768px (and on a phone held sideways: PHONE, lib/breakpoints.ts, as the phone script and the section
// folds use), a biography of more than 200 words shows one page of about 150 to 200 words at a time, split only where a
// paragraph ends (bioPages, BioText.tsx), with "Page 1 of N" and Previous and Next at the foot of the section. The
// "Last reviewed" line and the Sources fold (the `after` content) come after the last page only. From 768px up, and
// whenever the script has not run (JavaScript off, or before it loads), the whole biography shows exactly as before: the
// server's HTML holds every page, none hidden, and no pager.
//
// No network request: every page is in the HTML; the others carry the hidden attribute.
// Address: the page is in the section's own anchor, #bio-page-<n>, added with history.pushState, so Back and Forward step
// through the pages; arriving with #bio-page-<n> opens that page (the section fold opens for it: PhoneFolds).
// Screen readers: a hidden page is hidden from them too, so the reader moves on with the Next button, which follows the
// page's last paragraph ("Next page of the biography"). The "Page 2 of 6" line is a polite live region, so the change is
// announced, and focus moves to the start of the new page (a labelled group, "Biography, page 2 of 6"), which is read
// from its first paragraph.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PHONE } from '@/lib/breakpoints';
import { bioBlocks, bioPages, BioBlockView } from './BioText';

const HASH = /^#bio-page-(\d+)$/;
const pageFromHash = (n: number) => {
  const m = HASH.exec(window.location.hash);
  return m ? Math.min(Math.max(1, Number(m[1])), n) : 1;
};

// 15px and up, 44px tap targets (the site's phone minimums).
const CSS = `
.mp-bio-pager { margin: 20px 0 4px; padding-top: 12px; border-top: 1px solid rgba(20,16,13,0.18); }
.mp-bio-pager-count { margin: 0 0 8px; font-size: 15px; font-weight: bold; }
.mp-bio-pager-row { display: flex; gap: 12px; }
.mp-bio-pager button { flex: 1 1 0; min-height: 44px; padding: 8px 12px; font-family: inherit; font-size: 16px; font-weight: bold; color: #14100d; background: transparent; border: 1px solid #14100d; cursor: pointer; }
.mp-bio-pager button:disabled { opacity: 0.4; cursor: default; }
.mp-bio-page { scroll-margin-top: 12px; }
.mp-bio-page:focus:not(:focus-visible) { outline: none; }
`;

export default function BioPager({ paragraphs, paragraphStyle, after }: { paragraphs: string[]; paragraphStyle?: (index: number) => CSSProperties; after?: ReactNode }) {
  const blocks = bioBlocks(paragraphs);
  const pages = bioPages(blocks);
  const n = pages.length;
  // false on the server and in the first render in the browser, so the page hydrates as the server drew it.
  const [phone, setPhone] = useState(false);
  const [page, setPage] = useState(1);
  const paged = phone && n > 1;
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  // After a change: 'focus' (a button press) moves focus to the new page; 'scroll' (Back, Forward, an address) only
  // brings it into view.
  const moved = useRef<'focus' | 'scroll' | null>(null);

  useEffect(() => {
    if (n <= 1) return;
    const mq = window.matchMedia(PHONE);
    const onMedia = () => setPhone(mq.matches);
    onMedia();
    mq.addEventListener('change', onMedia);
    // Back, Forward, or a link to #bio-page-<n>: show the page the address names (the first when it names none).
    const onAddress = () => {
      const want = pageFromHash(n);
      setPage((cur) => {
        if (cur !== want) moved.current = 'scroll';
        return want;
      });
    };
    const first = pageFromHash(n);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is read once in the browser, which the server cannot see
    if (first > 1) { moved.current = 'scroll'; setPage(first); }
    window.addEventListener('popstate', onAddress);
    window.addEventListener('hashchange', onAddress);
    return () => {
      mq.removeEventListener('change', onMedia);
      window.removeEventListener('popstate', onAddress);
      window.removeEventListener('hashchange', onAddress);
    };
  }, [n]);

  // Once the new page shows: its start at the top of the screen, after the section folds have done their own scrolling
  // on an address change (PhoneFolds), hence two frames.
  useEffect(() => {
    const how = moved.current;
    if (!how || !paged) return;
    moved.current = null;
    const el = pageRefs.current[page - 1];
    if (!el) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!el.offsetParent) return; // the section is folded away or not the open tab: nothing to bring into view
      if (how === 'focus') el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'start' });
    }));
  }, [page, paged]);

  const go = useCallback((to: number) => {
    if (to < 1 || to > n || to === page) return;
    moved.current = 'focus';
    setPage(to);
    window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#bio-page-${to}`);
  }, [n, page]);

  return (
    <>
      {/* data-article-body: the biography's inline source links are citations in its text, which A9 allows there
          (rendered-checks.mjs). Without the mark, an MP whose biography shows first failed A9 (/mps/206, 16 Nov 2026). */}
      <div data-article-body="" style={{ lineHeight: '1.8', fontSize: '16px', letterSpacing: '0.01em' }}>
        {n <= 1
          ? blocks.map((b, idx) => <BioBlockView key={idx} block={b} idx={idx} paragraphStyle={paragraphStyle} />)
          : pages.map((ids, i) => (
            <div
              key={i}
              id={`bio-page-${i + 1}`}
              className="mp-bio-page"
              ref={(el) => { pageRefs.current[i] = el; }}
              hidden={paged && page !== i + 1}
              role={paged ? 'group' : undefined}
              aria-label={paged ? `Biography, page ${i + 1} of ${n}` : undefined}
              tabIndex={paged ? -1 : undefined}
            >
              {ids.map((idx) => <BioBlockView key={idx} block={blocks[idx]} idx={idx} paragraphStyle={paragraphStyle} />)}
            </div>
          ))}
      </div>
      {(!paged || page === n) && after}
      {paged && (
        <nav className="mp-bio-pager" aria-label="Biography pages">
          <style>{CSS}</style>
          <p className="mp-bio-pager-count" aria-live="polite">Page {page} of {n}</p>
          <div className="mp-bio-pager-row">
            <button type="button" onClick={() => go(page - 1)} disabled={page === 1} aria-label="Previous page of the biography">Previous</button>
            <button type="button" onClick={() => go(page + 1)} disabled={page === n} aria-label="Next page of the biography">Next</button>
          </div>
        </nav>
      )}
    </>
  );
}
