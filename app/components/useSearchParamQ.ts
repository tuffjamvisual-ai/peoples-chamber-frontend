'use client';

import { useEffect, useRef } from 'react';

// Keeps a search term in the address bar as ?q= (23 Oct 2026), so Back from a bill brings the search back. Uses
// history.replaceState so no history entries are added and the server pages stay cached (no searchParams on the
// server). On first load, a ?q= already in the address is handed to onRestore once, after mount. Writes wait until
// that term has reached the caller's state, so the two bill grids on /bills (one hidden by screen width) never clear
// each other's ?q=. onRestore should be stable (a state setter).
export function useSearchParamQ(term: string, onRestore: (q: string) => void): void {
  const pending = useRef<string | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q') || '';
    pending.current = q || null;
    ready.current = true;
    if (!q) return;
    const t = setTimeout(() => onRestore(q), 0);
    return () => clearTimeout(t);
  }, [onRestore]);

  useEffect(() => {
    if (!ready.current) return;
    if (pending.current !== null) {
      if (term !== pending.current) return;
      pending.current = null;
    }
    const url = new URL(window.location.href);
    const t = term.trim();
    if (t) url.searchParams.set('q', t); else url.searchParams.delete('q');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.href);
  }, [term]);
}
