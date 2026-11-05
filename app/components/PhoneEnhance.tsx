'use client';

// See lib/phone-enhance.ts. After hydration: the Show more buttons, then the same work again whenever the page's content
// changes (a tab, a filter, a client navigation) or the screen crosses into phone width.
import { useEffect } from 'react';

declare global {
  interface Window { __ogPhone?: (buttons?: boolean) => void; __ogBack?: string }
}

export default function PhoneEnhance() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => window.__ogPhone?.(true);
    const soon = () => { clearTimeout(timer); timer = setTimeout(run, 150); };
    run();
    const observer = new MutationObserver((records) => {
      if (records.some((r) => [...r.addedNodes, ...r.removedNodes].some((n) => !(n instanceof HTMLElement && n.classList.contains('og-phone-more'))))) soon();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', soon);
    window.addEventListener('load', run);
    return () => { clearTimeout(timer); observer.disconnect(); window.removeEventListener('resize', soon); window.removeEventListener('load', run); };
  }, []);
  return null;
}
