'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import type { DonorNameResult } from '@/lib/donor-search';

// Search box for /donors (24 Oct 2026). Searches every donor record held through /api/donors/search, not only the 200
// biggest donors listed below. The term lives in the address bar as ?q= (history.replaceState, as on /reports), so it
// survives Back and can be shared.

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';
const MONO = '"Special Elite", monospace';

// Parchment form control, as on the /reports filter bar.
const field: CSSProperties = {
  padding: '10px 14px',
  background: 'rgba(20,16,13,0.05)',
  color: INK,
  border: `1px solid ${INK_HAIRLINE}`,
  borderRadius: 0,
  fontFamily: MONO,
  fontSize: '15px',
  outline: 'none',
  width: '100%',
  maxWidth: '420px',
  boxSizing: 'border-box',
};

type State = { status: 'idle' | 'loading' | 'done' | 'error'; term: string; results: DonorNameResult[]; more: boolean };

export default function DonorSearch() {
  const [q, setQ] = useState('');
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<State>({ status: 'idle', term: '', results: [], more: false });

  // Read ?q= once, after mount (the server renders the page without a search).
  useEffect(() => {
    const t = setTimeout(() => { setQ(new URLSearchParams(window.location.search).get('q') ?? ''); setReady(true); }, 0);
    return () => clearTimeout(t);
  }, []);

  // Keep ?q= in step (no new history entries), and search after a short pause in typing.
  useEffect(() => {
    if (!ready) return;
    const term = q.trim();
    const url = new URL(window.location.href);
    if (term) url.searchParams.set('q', term); else url.searchParams.delete('q');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.href);
    if (term.length < 2) return; // shown as no search (below); nothing to fetch
    let cancelled = false;
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, status: 'loading', term }));
      try {
        const res = await fetch(`/api/donors/search?q=${encodeURIComponent(term)}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) { setState({ status: 'error', term, results: [], more: false }); return; }
        setState({ status: 'done', term, results: body.results ?? [], more: !!body.more });
      } catch {
        if (!cancelled) setState({ status: 'error', term, results: [], more: false });
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, ready]);

  // A term of under two characters is no search, whatever the last answer was.
  const shown: State = q.trim().length >= 2 ? state : { status: 'idle', term: '', results: [], more: false };

  return (
    <section aria-label="Search donors" style={{ marginBottom: '28px', fontFamily: MONO, color: INK }}>
      <input
        aria-label="Search all donor names"
        type="search"
        placeholder="Search all donor names…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={field}
      />
      <p style={{ fontSize: '14px', margin: '6px 0 0', opacity: 0.75 }}>
        Searches every donor name in the Electoral Commission register held here, not only the 200 listed below.
      </p>

      {shown.status === 'loading' && <p aria-live="polite" style={{ fontSize: '15px', marginTop: '14px' }}>Searching…</p>}
      {shown.status === 'error' && <p role="alert" style={{ fontSize: '15px', marginTop: '14px', color: ACCENT }}>Search is unavailable right now. Please try again.</p>}
      {shown.status === 'done' && shown.results.length === 0 && (
        <p aria-live="polite" style={{ fontSize: '15px', marginTop: '14px', lineHeight: 1.6 }}>
          No donor names match &ldquo;{shown.term}&rdquo;.{' '}
          <Link href={`/transparency/donations?q=${encodeURIComponent(shown.term)}`} style={{ color: ACCENT, textDecoration: 'underline' }}>
            Search the donations dataset for &ldquo;{shown.term}&rdquo;
          </Link>
        </p>
      )}
      {shown.status === 'done' && shown.results.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          <p aria-live="polite" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.75, margin: '0 0 8px' }}>
            {shown.results.length}{shown.more ? '+' : ''} donor name{shown.results.length === 1 ? '' : 's'} matching &ldquo;{shown.term}&rdquo;
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: `1px solid ${HAIRLINE}` }}>
            {shown.results.map((r) => (
              <li key={r.slug ?? r.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: `1px solid ${HAIRLINE}`, fontSize: '15px' }}>
                {r.slug
                  ? <Link href={`/donors/${r.slug}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold', minWidth: 0, overflowWrap: 'anywhere' }}>{r.name}</Link>
                  : <span style={{ fontWeight: 'bold', minWidth: 0, overflowWrap: 'anywhere' }}>{r.name}</span>}
                <span style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>{r.records.toLocaleString('en-GB')} record{r.records === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
          {shown.more && <p style={{ fontSize: '14px', marginTop: '8px', opacity: 0.75 }}>Showing the names with the most records. Add a word to narrow the search.</p>}
        </div>
      )}
    </section>
  );
}
