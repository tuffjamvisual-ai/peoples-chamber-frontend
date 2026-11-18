'use client';

// ART-SUMMARY (owner approved 17 Nov 2026, Cowork ENTRY 263 and 268): an article's key points as a "Summary" tab beside
// "Full article". Summary opens first; "Read the full article" switches tabs and moves focus to the article's first heading
// (or the start of its text). #full or ?view=full opens the full article; both are read here in the browser, so the page
// itself stays static (A16). Tabs follow the WAI-ARIA tab pattern (tablist, aria-selected, aria-controls, Left/Right/Home/End;
// only the selected tab is in the Tab order). The full text is always in the page HTML, hidden with its tab by CSS, never left
// out, so search engines and the reading time are unchanged.
// Without JavaScript there are no tabs: the summary list shows, then the full article, nothing hidden. With it, the tabs and
// the hiding apply from the first paint (html.og-js, set in the page head), so nothing flashes; the tab roles are added once
// this has run. If it never runs, 'Read the full article' is a #full link that opens the text (:target).
// The key points list stays whole (owner, 17 Nov 2026, ENTRY 265): data-own-more.
import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';

type Tab = 'summary' | 'full';

const CSS = `
.art-tablist { display: none; }
html.og-js .art-tablist { display: flex; gap: 8px; margin: 0 0 20px; border-bottom: 1px solid rgba(20,16,13,0.25); }
.art-tab { min-height: 44px; padding: 0 16px; font: inherit; font-size: 16px; color: #14100d; background: none; border: 1px solid rgba(20,16,13,0.25); border-bottom: none; cursor: pointer; }
.art-tab[aria-selected="true"] { font-weight: bold; background: rgba(20,16,13,0.06); border-color: #14100d; }
.art-tab:focus-visible, .art-read-full:focus-visible { outline: 3px solid #7a1612; outline-offset: 2px; }
.art-tabs .art-points { list-style: disc outside; margin: 0 0 18px; padding-left: 1.3em; font-size: 16px; line-height: 1.6; }
.art-tabs .art-points li { display: list-item; }
.art-points li { margin: 0 0 10px; }
.art-read-full { display: none; }
html.og-js .art-read-full { display: inline-flex; text-decoration: none; align-items: center; min-height: 44px; padding: 0 16px; margin: 0 0 8px; font: inherit; font-size: 16px; font-weight: bold; color: #7a1612; background: none; border: 2px solid #7a1612; cursor: pointer; }
html.og-js .art-tabs[data-tab="summary"] .art-panel-full, html.og-js .art-tabs[data-tab="full"] .art-panel-summary { display: none; }
/* If JavaScript stops after html.og-js is set, 'Read the full article' is a plain #full link and this opens the text; once the
   script runs (data-ready) the tabs decide, so choosing Summary after arriving at #full hides the text (T2, 01:10). */
html.og-js .art-tabs:not([data-ready]):has(#full:target) .art-panel-full { display: block; }
html:not(.og-js) .art-panel-summary { margin-bottom: 24px; padding-bottom: 8px; border-bottom: 1px solid rgba(20,16,13,0.25); }
`;

export default function ArticleTabs({ points, mainAction = false, children }: { points: string[]; mainAction?: boolean; children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('summary');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fromAddress = () => location.hash === '#full' || new URLSearchParams(location.search).get('view') === 'full';
    const raf = requestAnimationFrame(() => { if (fromAddress()) setTab('full'); setReady(true); });
    const onHash = () => { if (location.hash === '#full') setTab('full'); };
    window.addEventListener('hashchange', onHash);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('hashchange', onHash); };
  }, []);

  const select = useCallback((t: Tab, focusTab = false) => {
    setTab(t);
    if (focusTab) requestAnimationFrame(() => document.getElementById(`art-tab-${t}`)?.focus());
  }, []);

  const readFull = () => {
    setTab('full');
    requestAnimationFrame(() => {
      const root = document.getElementById('full');
      if (!root) return;
      const target = (root.querySelector('h2, h3') as HTMLElement | null) ?? (root.querySelector('#article-text') as HTMLElement | null) ?? root;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start' });
    });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const order: Tab[] = ['summary', 'full'];
    const i = order.indexOf(tab);
    let next: Tab | null = null;
    if (e.key === 'ArrowRight') next = order[(i + 1) % 2];
    else if (e.key === 'ArrowLeft') next = order[(i + 1) % 2];
    else if (e.key === 'Home') next = 'summary';
    else if (e.key === 'End') next = 'full';
    if (next) { e.preventDefault(); select(next, true); }
  };

  const tabProps = (t: Tab, label: string) => ({
    type: 'button' as const,
    role: 'tab',
    id: `art-tab-${t}`,
    'aria-selected': tab === t,
    'aria-controls': t === 'full' ? 'full' : 'art-panel-summary',
    tabIndex: tab === t ? 0 : -1,
    className: 'art-tab',
    onClick: () => select(t),
    children: label,
  });

  return (
    <div className="art-tabs" data-tab={tab} {...(ready ? { 'data-ready': '' } : {})}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="art-tablist" {...(ready ? { role: 'tablist', 'aria-label': 'Article' } : {})} onKeyDown={onKey}>
        <button {...tabProps('summary', 'Summary')} />
        <button {...tabProps('full', 'Full article')} />
      </div>
      <div className="art-panel art-panel-summary" id="art-panel-summary" {...(ready ? { role: 'tabpanel', 'aria-labelledby': 'art-tab-summary' } : {})}>
        <ul className="art-points" data-own-more="" {...(mainAction ? { 'data-main-action': '' } : {})}>
          {points.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <a href="#full" className="art-read-full" onClick={(e) => { e.preventDefault(); readFull(); }}>Read the full article</a>
      </div>
      <div className="art-panel art-panel-full" id="full" {...(ready ? { role: 'tabpanel', 'aria-labelledby': 'art-tab-full' } : {})}>
        {children}
      </div>
    </div>
  );
}

