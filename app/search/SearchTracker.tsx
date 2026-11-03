'use client';

// Sends the "search" event once the results of a submitted search are shown (owner's brief, 3 Nov 2026): only when the
// visitor submitted the form for this query (SearchInput marks it), and only with consent (captureEvent does nothing
// otherwise). The query is cleaned (lib/search-analytics.ts) before it leaves the browser.
import { useEffect } from 'react';
import { captureEvent } from '../components/PostHogLoader';
import { SUBMITTED_SEARCH_KEY, cleanSearchQuery } from '@/lib/search-analytics';

export default function SearchTracker({ q, resultsCount }: { q: string; resultsCount: number }) {
  useEffect(() => {
    let submitted: string | null = null;
    try {
      submitted = window.sessionStorage.getItem(SUBMITTED_SEARCH_KEY);
      window.sessionStorage.removeItem(SUBMITTED_SEARCH_KEY);
    } catch {
      return; // storage unavailable: no way to tell a submitted search, so nothing is sent
    }
    if (submitted === null || submitted !== q || q.length < 2) return;
    captureEvent('search', { query: cleanSearchQuery(q), results_count: resultsCount });
  }, [q, resultsCount]);
  return null;
}
