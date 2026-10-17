'use client';

// Homepage "Your area" search: a postcode, town or council name.
// Submitting sends a postcode or town to /api/area/lookup: a postcode or a single
// matching town goes straight to /your-area; several towns with the same name are
// listed for the reader to pick from. While typing a name, matching councils are
// suggested (from /api/councils/search, as the old homepage council search did);
// picking one goes straight to that council's page. The results address carries
// area codes only, never the postcode.

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = "'Special Elite', monospace";

type Area = { kind: 'area'; place: string | null; councilCode: string | null; constituencyCode: string | null };
type Choice = { name: string; label: string; lat: number; lon: number };
type CouncilHit = { slug: string; name: string; typeLabel: string | null; country?: string | null };
const POSTCODE_LIKE = /^[A-Za-z]{1,2}\d/;

// tight: pull the box up under the site search on the homepage.
export default function AreaSearch({ tight = false }: { tight?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [councils, setCouncils] = useState<CouncilHit[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The box is uncontrolled, so anything typed before the page finishes loading
  // stays in it; pick that text up once the script is running.
  useEffect(() => {
    const v = inputRef.current?.value ?? '';
    if (v) setQ(v);
  }, []);

  // Council suggestions while a name is typed (not for postcodes).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const t = q.trim();
    if (t.length < 2 || POSTCODE_LIKE.test(t)) { setCouncils([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/councils/search?q=${encodeURIComponent(t)}`);
        const j = await r.json();
        setCouncils(r.ok ? ((j.results || []) as CouncilHit[]) : []);
        setOpen(true);
      } catch {
        setCouncils([]);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // Close the suggestions on an outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function go(a: Area) {
    if (!a.councilCode && !a.constituencyCode) {
      setError('We could not find a council or constituency for that search. Try a postcode.');
      return;
    }
    const p = new URLSearchParams();
    if (a.councilCode) p.set('council', a.councilCode);
    if (a.constituencyCode) p.set('constituency', a.constituencyCode);
    if (a.place) p.set('place', a.place);
    router.push(`/your-area?${p.toString()}`);
  }

  async function lookup(url: string) {
    setBusy(true); setError(null);
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok) {
        const msg = j?.message || 'Lookup failed. Please try again.';
        setError(j?.error === 'notfound' && councils.length > 0 ? 'No town or village has that name. Pick a council from the list, or enter a postcode.' : msg);
        if (councils.length > 0) setOpen(true);
        return;
      }
      if (j.kind === 'choices') { setChoices(j.choices as Choice[]); setOpen(false); return; }
      setChoices([]);
      go(j as Area);
    } catch {
      setError('Lookup is unavailable right now. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = (inputRef.current?.value ?? q).trim();
    if (!text) return;
    setChoices([]);
    setOpen(false);
    lookup(`/api/area/lookup?q=${encodeURIComponent(text)}`);
  }

  return (
    <section ref={boxRef} aria-label="Your area" style={{ marginTop: tight ? '-16px' : 0, marginBottom: '28px' }}>
      {/* Without the script (or before it has loaded) the form still works: it goes to
          /your-area?q=..., which does the same lookup on the server. */}
      <form action="/your-area" method="get" onSubmit={onSubmit}>
        <div style={{ position: 'relative' }}>
          <input
            aria-label="Your postcode, town or council"
            ref={inputRef}
            type="text"
            name="q"
            defaultValue=""
            onChange={(e) => { setQ(e.target.value); setError(null); }}
            onFocus={() => councils.length > 0 && setOpen(true)}
            autoComplete="postal-code"
            placeholder="Your area: enter a postcode, town or council to see your MP, council and local figures"
            style={{
              width: '100%', padding: '12px 48px 12px 14px', fontFamily: MONO, fontSize: '15px', color: INK,
              background: '#f4e8d4', border: '1px solid rgba(20,16,13,0.18)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            aria-label="Find your area"
            disabled={busy}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none',
              cursor: busy ? 'default' : 'pointer', color: ACCENT, fontSize: '18px', lineHeight: 1, padding: '4px',
            }}
          >
            {busy ? '…' : '→'}
          </button>
        </div>
        {open && councils.length > 0 && (
          <ul role="listbox" aria-label="Councils" style={{ listStyle: 'none', margin: 0, padding: '6px 0', border: '1px solid rgba(20,16,13,0.18)', borderTop: 'none', background: '#f4e8d4' }}>
            <li style={{ fontFamily: MONO, fontSize: '13px', color: INK, opacity: 0.7, padding: '2px 14px 4px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Councils</li>
            {councils.map((c) => (
              <li key={c.slug}>
                <a href={`/councils/${c.slug}`} style={{ display: 'block', padding: '6px 14px', fontFamily: MONO, fontSize: '15px', color: INK, textDecoration: 'none' }}>
                  {c.name}{c.typeLabel ? <span style={{ opacity: 0.65 }}> · {c.typeLabel}</span> : null}
                </a>
              </li>
            ))}
            <li style={{ fontFamily: MONO, fontSize: '13px', color: INK, opacity: 0.7, padding: '6px 14px 2px' }}>Or press Enter to search for a town or village with this name</li>
          </ul>
        )}
      </form>
      {error && <p role="alert" style={{ fontFamily: MONO, fontSize: '14px', color: ACCENT, margin: '8px 0 0' }}>{error}</p>}
      {choices.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <p style={{ fontFamily: MONO, fontSize: '14px', color: INK, margin: '0 0 6px' }}>More than one place has that name. Which one?</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {choices.map((c) => (
              <li key={c.label} style={{ marginBottom: '4px' }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => lookup(`/api/area/lookup?lat=${c.lat}&lon=${c.lon}&place=${encodeURIComponent(c.name)}`)}
                  style={{ fontFamily: MONO, fontSize: '15px', color: INK, background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
