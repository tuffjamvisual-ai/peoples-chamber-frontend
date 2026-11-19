'use client';

// Homepage "Find your MP" box (owner, 19 Nov 2026, Cowork ENTRY 374: MP pages are the most visited kind). The uniform
// search box (ENTRY 336) with the site search's suggestions narrowed to MPs, former MPs and constituencies
// (/api/suggest/mps; a constituency opens its MP). A full postcode goes straight to its MP through /api/find-mp, as on /mps;
// any other text opens the /mps list searched for it (/mps?q=, which /mps reads). No new data source.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SuggestInput from './SuggestInput';
import '@/app/components/search-box-desk.css';

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;

export default function HomeMpSearch() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    const pc = q.toUpperCase().replace(/\s+/g, '');
    if (!POSTCODE_RE.test(pc)) return; // the form's own GET to /mps?q=
    e.preventDefault();
    setErr(null);
    try {
      const res = await fetch('/api/find-mp?postcode=' + encodeURIComponent(pc));
      const data = await res.json();
      if (!res.ok || !data.memberId) { setErr(data.message || 'No MP found for that postcode.'); return; }
      router.push('/mps/' + data.memberId);
    } catch {
      setErr('The postcode lookup did not answer. Please try again.');
    }
  };
  return (
    <form action="/mps" method="get" onSubmit={onSubmit} style={{ margin: 0 }}>
      <label htmlFor="home-mp-q" className="og-kicker og-search-label">Find your MP</label>
      <div className="og-sbox-row" style={{ position: 'relative' }}>
        <SuggestInput suggestPath="/api/suggest/mps"
          id="home-mp-q"
          name="q"
          placeholder="Name, constituency or postcode"
          className="og-search-input og-sbox-input"
          listLabel="Suggested MPs"
          ariaLabel="Find your MP by name, constituency or postcode"
          style={{
            width: '100%',
            padding: '12px 36px 12px 14px',
            fontFamily: "var(--font-special-elite), monospace",
            fontSize: '15px',
            color: '#14100d',
            background: '#f4e8d4',
            border: '1px solid rgba(20,16,13,0.18)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button type="submit" className="og-search-go og-sbox-btn" aria-label="Find your MP"
          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7a1612', fontSize: '18px', lineHeight: 1, padding: '4px' }}>
          <span className="og-sbox-arrow">→</span><span className="og-sbox-word">Search</span>
        </button>
      </div>
      {err && <p role="alert" style={{ margin: '6px 0 0', fontFamily: "var(--font-special-elite), monospace", fontSize: '15px', color: '#7a1612' }}>{err}</p>}
    </form>
  );
}
