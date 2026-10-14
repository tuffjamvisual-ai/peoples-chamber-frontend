'use client';

// Search the Register of Consultant Lobbyists by client name: which firms lobbied for it,
// and in which quarters.

import { useState, type FormEvent } from 'react';

type Result = { client: string; firms: { firm: string; quarters: string[] }[] };

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const FONT = 'Special Elite, monospace';

export default function ClientSearch() {
  const [q, setQ] = useState('');
  const [state, setState] = useState<{ loading: boolean; error: string | null; results: Result[] | null; truncated: boolean; query: string }>({ loading: false, error: null, results: null, truncated: false, query: '' });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 3) { setState((s) => ({ ...s, error: 'Type at least 3 letters.', results: null })); return; }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`/api/lobbying/clients?q=${encodeURIComponent(term)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Search failed.');
      setState({ loading: false, error: null, results: j.results, truncated: j.truncated, query: term });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message || 'Search failed.' }));
    }
  }

  return (
    <div style={{ maxWidth: '46em' }}>
      <h3 style={{ fontFamily: FONT, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK, margin: '0 0 8px', fontWeight: 'bold' }}>
        Who lobbies for…
      </h3>
      <form onSubmit={onSubmit} role="search" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <label htmlFor="lb-client-q" style={{ position: 'absolute', left: '-9999px' }}>Client name</label>
        <input
          id="lb-client-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Company or organisation, e.g. Heathrow"
          style={{ flex: '1 1 220px', minWidth: 0, fontFamily: FONT, fontSize: '16px', padding: '8px 10px', border: `1px solid ${INK}`, background: 'transparent', color: INK }}
        />
        <button type="submit" disabled={state.loading} style={{ fontFamily: FONT, fontSize: '15px', padding: '8px 14px', border: `1px solid ${INK}`, background: INK, color: '#f4ecd8', cursor: 'pointer' }}>
          {state.loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {state.error && <p style={{ fontFamily: FONT, fontSize: '15px', color: INK }}>{state.error}</p>}
      {state.results && state.results.length === 0 && (
        <p style={{ fontFamily: FONT, fontSize: '15px', color: INK }}>No client names containing “{state.query}” on the register.</p>
      )}
      {state.results && state.results.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: `1px solid ${INK_HAIRLINE}` }}>
          {state.results.map((r) => (
            <li key={r.client} style={{ padding: '10px 2px', borderBottom: `1px solid ${INK_HAIRLINE}`, fontFamily: FONT, color: INK }}>
              <div style={{ fontSize: '16px', fontWeight: 700, overflowWrap: 'anywhere' }}>{r.client}</div>
              {r.firms.map((f) => (
                <div key={f.firm} style={{ fontSize: '15px', lineHeight: 1.6, marginTop: '4px', overflowWrap: 'anywhere' }}>
                  {f.firm} <span style={{ fontSize: '13px' }}>({f.quarters.join('; ')})</span>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
      {state.truncated && <p style={{ fontFamily: FONT, fontSize: '13px', color: INK, marginTop: '8px' }}>Showing the first matches only. Type more of the name to narrow it down.</p>}
    </div>
  );
}
