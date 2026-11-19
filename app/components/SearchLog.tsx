'use client';
// Search term log (owner approved, Cowork ENTRY 375 item 2): after the results of a search are shown, one request to
// /api/search-log with the term, the box and the result count the page already shows. Nothing else is sent (no cookie is
// read, nothing is kept in the browser's storage). The term is cleaned here first (lib/search-terms.ts), so an email
// address, a phone number or the inward half of a postcode never leaves the browser; nothing is sent without a term.
// Renders nothing, so the page looks the same.
//
// Counted once: the same box and term again in this tab (a client side back, or a filter on the same search) is not
// sent again, and neither is a page that opened by reload or back/forward. The homepage's hidden via=home is taken out
// of the address once the search is logged, so a copied link or a reload is not counted as the homepage's.
import { useEffect } from 'react';
import { cleanTerm, type SearchBox } from '@/lib/search-terms';

const sent = new Set<string>();
let firstInDocument = true;

function send(body: string) {
  try {
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/search-log', body)) return;
  } catch { /* fall back to fetch */ }
  fetch('/api/search-log', { method: 'POST', body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
}

function reopened(): boolean {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === 'reload' || nav?.type === 'back_forward';
  } catch { return false; }
}

// One search from a box that shows its own results (the homepage council box), sent straight away; the same rules.
export function logSearch(term: string, box: SearchBox, results: number | null) {
  const clean = cleanTerm(term);
  if (!clean) return;
  const key = `${box.replace(/^home-/, '')}|${clean}`;
  if (sent.has(key)) return;
  sent.add(key);
  send(JSON.stringify({ term: clean, box, results }));
}

export default function SearchLog({ term, box, results }: { term: string; box: SearchBox; results: number | null }) {
  useEffect(() => {
    const first = firstInDocument;
    firstInDocument = false;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('via')) {
        url.searchParams.delete('via');
        window.history.replaceState(window.history.state, '', url.href);
      }
    } catch { /* address unchanged */ }
    const clean = cleanTerm(term);
    if (!clean) return;
    const key = `${box.replace(/^home-/, '')}|${clean}`;
    if (sent.has(key)) return;
    sent.add(key);
    if (first && reopened()) return;
    send(JSON.stringify({ term: clean, box, results }));
  }, [term, box, results]);
  return null;
}
