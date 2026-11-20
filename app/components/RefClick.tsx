'use client';
// Ref tag click counter (owner approved 20 Nov 2026, Cowork ENTRY 440), mounted once in the root layout. On a visit
// without "ref=" in the address it does nothing but that one check. With ?ref=x11 (one of our tags, lib/ref-clicks.ts):
// once the page has loaded and the browser is idle, one request to /api/ref-click with the tag and the page path only
// (no cookie is read, nothing is kept in the browser's storage), failures silent; then ?ref= is taken out of the address
// (other parameters and the #fragment kept), so a copied link or a reload is not counted again. replaceState is given
// null, as the Next.js docs show, so the App Router keeps its own state and useSearchParams follows the new address.
// Renders nothing.
import { useEffect } from 'react';
import { cleanPath, cleanRef } from '@/lib/ref-clicks';

let done = false;

export default function RefClick() {
  useEffect(() => {
    if (done || location.search.indexOf('ref=') < 0) return;
    done = true;
    const start = new URL(location.href);
    const ref = cleanRef(start.searchParams.get('ref'));
    const path = cleanPath(start.pathname);
    const run = () => {
      try {
        if (ref && path) {
          const body = JSON.stringify({ ref, path });
          let queued = false;
          try { queued = navigator.sendBeacon('/api/ref-click', body); } catch { /* fall back to fetch */ }
          if (!queued) fetch('/api/ref-click', { method: 'POST', body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
        }
        const url = new URL(location.href);
        if (url.searchParams.has('ref')) {
          url.searchParams.delete('ref');
          history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
      } catch { /* not counted, address unchanged */ }
    };
    const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 5000 }) : setTimeout(run, 200));
    if (document.readyState === 'complete') idle();
    else addEventListener('load', idle, { once: true });
  }, []);
  return null;
}
