'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

// Filter controls for the Register of Interests search page. State is held here,
// pushed into the URL on submit so the server re-renders the results (shareable,
// no-JS-friendly URLs). MP filter is a type-ahead autocomplete over the 650
// current MPs — a 650-entry <select> would be a poor experience.

const INK = '#14100d';
const ACCENT = '#6b2417';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#f4e8d4';
const MONO = "'Special Elite', monospace";

interface MpOption {
  id: number;
  name: string;
}
interface Props {
  mps: MpOption[];
  buckets: { key: string; label: string }[];
  initial: { q: string; mp: string; mpName: string; cat: string; from: string; to: string };
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontFamily: MONO,
  fontSize: '15px',
  color: INK,
  border: `1px solid ${HAIRLINE}`,
  background: CREAM,
  boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: MONO,
  fontSize: '15px',
  color: INK,
  marginBottom: '5px',
  letterSpacing: '0.02em',
};

export default function RegisterSearchClient({ mps, buckets, initial }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [cat, setCat] = useState(initial.cat);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  // MP autocomplete state.
  const [mpId, setMpId] = useState(initial.mp);
  const [mpQuery, setMpQuery] = useState(initial.mpName);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const term = mpQuery.trim().toLowerCase();
    if (!term) return [];
    return mps.filter((m) => m.name.toLowerCase().includes(term)).slice(0, 8);
  }, [mpQuery, mps]);

  function selectMp(m: MpOption) {
    setMpId(String(m.id));
    setMpQuery(m.name);
    setOpen(false);
  }
  function clearMp() {
    setMpId('');
    setMpQuery('');
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (mpId) params.set('mp', mpId);
    if (cat) params.set('cat', cat);
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) params.set('from', from);
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) params.set('to', to);
    const qs = params.toString();
    router.push(qs ? `/transparency/register-of-interests?${qs}` : '/transparency/register-of-interests');
  }

  function clearAll() {
    setQ('');
    setCat('');
    setFrom('');
    setTo('');
    clearMp();
    router.push('/transparency/register-of-interests');
  }

  function onMpKeyDown(e: React.KeyboardEvent) {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectMp(matches[active] ?? matches[0]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const hasAny = q || mpId || cat || from || to;

  return (
    <form
      onSubmit={submit}
      style={{ border: `1px solid ${HAIRLINE}`, background: 'rgba(20,16,13,0.03)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Search + MP row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div>
          <label htmlFor="roi-q" style={labelStyle}>
            Search donor, organisation or keyword
          </label>
          <input
            id="roi-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. BAE Systems, Unite, football tickets"
            style={inputStyle}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <label htmlFor="roi-mp" style={labelStyle}>
            Filter by MP
          </label>
          <input
            id="roi-mp"
            type="text"
            autoComplete="off"
            value={mpQuery}
            onChange={(e) => {
              setMpQuery(e.target.value);
              setMpId('');
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => mpQuery && setOpen(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 150);
            }}
            onKeyDown={onMpKeyDown}
            placeholder="Start typing a name…"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            style={inputStyle}
          />
          {mpId && (
            <button
              type="button"
              onClick={clearMp}
              aria-label="Clear MP filter"
              style={{ position: 'absolute', right: '8px', top: '31px', border: 'none', background: 'transparent', color: INK, cursor: 'pointer', fontFamily: MONO, fontSize: '16px' }}
            >
              ✕
            </button>
          )}
          {open && matches.length > 0 && (
            <ul
              role="listbox"
              style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, margin: '2px 0 0', padding: 0, listStyle: 'none', background: CREAM, border: `1px solid ${HAIRLINE}`, maxHeight: '260px', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.22)' }}
            >
              {matches.map((m, i) => (
                <li key={m.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (blurTimer.current) clearTimeout(blurTimer.current);
                      selectMp(m);
                    }}
                    onMouseEnter={() => setActive(i)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: i === active ? 'rgba(107,36,23,0.12)' : 'transparent', color: INK, fontFamily: MONO, fontSize: '15px', cursor: 'pointer' }}
                  >
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div>
        <span style={labelStyle}>Category</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {buckets.map((b) => {
            const on = cat === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setCat(on ? '' : b.key)}
                aria-pressed={on}
                style={{ fontFamily: MONO, fontSize: '15px', padding: '6px 12px', cursor: 'pointer', color: on ? CREAM : INK, background: on ? ACCENT : 'transparent', border: `1px solid ${on ? ACCENT : HAIRLINE}`, letterSpacing: '0.02em' }}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date range */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div>
          <label htmlFor="roi-from" style={labelStyle}>
            Registered from
          </label>
          <input id="roi-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="roi-to" style={labelStyle}>
            Registered to
          </label>
          <input id="roi-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="submit"
          style={{ fontFamily: MONO, fontSize: '15px', padding: '9px 22px', cursor: 'pointer', color: CREAM, background: INK, border: `1px solid ${INK}`, letterSpacing: '0.04em' }}
        >
          Search
        </button>
        {hasAny && (
          <button
            type="button"
            onClick={clearAll}
            style={{ fontFamily: MONO, fontSize: '15px', padding: '9px 22px', cursor: 'pointer', color: INK, background: 'transparent', border: `1px solid ${HAIRLINE}`, letterSpacing: '0.04em' }}
          >
            Clear all
          </button>
        )}
      </div>
    </form>
  );
}
