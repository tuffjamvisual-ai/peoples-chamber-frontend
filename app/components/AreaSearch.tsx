'use client';

// Homepage "Find your local council" search: a postcode, town or council name (councils only, owner, 11 Nov 2026, T1-MP;
// no exact match lists suggestions of councils and places).
// Submitting sends a postcode or town to /api/area/lookup: a postcode or a single
// matching town goes straight to /your-area; several towns with the same name are
// listed for the reader to pick from. While typing a name, matching councils are
// suggested (from /api/councils/search, as the old homepage council search did);
// picking one goes straight to that council's page. The results address carries
// area codes only, never the postcode.

import '@/app/components/search-box-desk.css';
import { useListNav } from '@/lib/search/use-list-nav';
import { markMatches } from '@/lib/search/words';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = "var(--font-special-elite), monospace";

type Area = { kind: 'area'; place: string | null; councilCode: string | null; constituencyCode: string | null };
type Choice = { name: string; label: string; lat: number; lon: number };
type CouncilHit = { slug: string; name: string; typeLabel: string | null; country?: string | null };
type Suggestion = { kind: string; name: string; href: string; tag: string | null };
const POSTCODE_LIKE = /^[A-Za-z]{1,2}\d/;

// tight: pull the box up under the site search on the homepage.
// label, placeholder: the homepage shows a visible label and a shorter placeholder; /your-area keeps the old wording.
export default function AreaSearch({ tight = false, label, placeholder }: { tight?: boolean; label?: string; placeholder?: string }) {
  const router = useRouter();
  const inputId = useId();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
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
    // Councils only (T1-MP, 11 Nov 2026): the results address carries the council, not the constituency.
    if (!a.councilCode) {
      setError('We could not find a council for that search. Try a postcode.');
      return;
    }
    // Each council has its own static page (F04 batch 4); the place is a label read in the browser there.
    router.push(`/your-area/${a.councilCode}${a.place ? `?place=${encodeURIComponent(a.place)}` : ''}`);
    // The space held while the results load is let go once they are in (or after 10 seconds).
    window.setTimeout(() => document.documentElement.classList.remove('ya-wait'), 10000);
  }

  async function lookup(url: string) {
    setBusy(true); setError(null);
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok) {
        document.documentElement.classList.remove('ya-wait');
        const msg = j?.message || 'Lookup failed. Please try again.';
        setError(j?.error === 'notfound' && councils.length > 0 ? 'No town or village has that name. Pick a council from the list, or enter a postcode.' : msg);
        if (councils.length > 0) setOpen(true);
        return;
      }
      // No exact match: suggestions of councils and places, or the "No council or place matches" message
      // (lib/area-resolve.ts; T1-MP, 11 Nov 2026).
      if (j.kind === 'suggest' || j.kind === 'choices') document.documentElement.classList.remove('ya-wait');
      if (j.kind === 'suggest') { setError(j.message as string); setSuggestions((j.suggestions || []) as Suggestion[]); setChoices([]); setOpen(false); return; }
      if (j.kind === 'choices') { setChoices(j.choices as Choice[]); setOpen(false); return; }
      setChoices([]);
      go(j as Area);
    } catch {
      document.documentElement.classList.remove('ya-wait');
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
    setSuggestions([]);
    setOpen(false);
    // Layout shift (ENTRY 135 L6: 0.399 at 375): as the search is sent, the page holds a full screen of space, so the
    // footer moves out of view at the tap (a move the reader caused) and nothing visible jumps when the results arrive.
    document.documentElement.classList.add('ya-wait');
    lookup(`/api/area/lookup?q=${encodeURIComponent(text)}`);
  }

  // Arrow keys, Enter and Escape in the council list (SEARCH-ALL batch 2); matched letters bold; rows 44px.
  const nav = useListNav(open ? councils.length : 0, (i) => { setOpen(false); router.push(`/councils/${councils[i].slug}`); }, () => setOpen(false), q);
  const listId = `${inputId}-councils`;

  return (
    <section ref={boxRef} aria-label="Your area" style={{ marginTop: tight ? '-16px' : 0, marginBottom: '28px' }}>
      {/* Without the script (or before it has loaded) the form still works: it goes to
          /your-area?q=..., which does the same lookup on the server. */}
      <form action="/your-area" method="get" onSubmit={onSubmit}>
        {label && <label htmlFor={inputId} className="og-kicker og-search-label">{label}</label>}
        <div className="og-sbox-row" style={{ position: 'relative' }}>
          <input
            id={inputId}
            aria-label={label ?? 'Your postcode, town or council'}
            ref={inputRef}
            type="text"
            name="q"
            defaultValue=""
            onChange={(e) => { setQ(e.target.value); setError(null); }}
            onFocus={() => councils.length > 0 && setOpen(true)}
            onKeyDown={nav.onKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && councils.length > 0}
            aria-controls={listId}
            aria-activedescendant={open && nav.active >= 0 ? `${listId}-${nav.active}` : undefined}
            autoComplete="postal-code"
            placeholder={placeholder ?? 'Your area: enter a postcode, town or council to see your council and local figures'}
            className={label ? 'og-search-input og-sbox-input' : 'og-sbox-input'}
            style={{
              width: '100%', padding: label ? '12px 36px 12px 14px' : '12px 48px 12px 14px', fontFamily: MONO, fontSize: '15px', color: INK,
              background: '#f4e8d4', border: '1px solid rgba(20,16,13,0.18)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            className="og-search-go og-sbox-btn"
            aria-label="Find your area"
            disabled={busy}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none',
              cursor: busy ? 'default' : 'pointer', color: ACCENT, fontSize: '18px', lineHeight: 1, padding: '4px',
            }}
          >
            <span className="og-sbox-arrow">{busy ? '…' : '→'}</span><span className="og-sbox-word">{busy ? 'Searching…' : 'Search'}</span>
          </button>
        </div>
        {open && councils.length > 0 && (
          <ul id={listId} role="listbox" aria-label="Councils" style={{ listStyle: 'none', margin: 0, padding: '6px 0', border: '1px solid rgba(20,16,13,0.18)', borderTop: 'none', background: '#f4e8d4' }}>
            <li style={{ fontFamily: MONO, fontSize: '15px', color: INK, padding: '2px 14px 4px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Councils</li>
            {councils.map((c, k) => (
              <li key={c.slug} id={`${listId}-${k}`} role="option" aria-selected={k === nav.active} onMouseEnter={() => nav.setActive(k)}>
                <a href={`/councils/${c.slug}`} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', boxSizing: 'border-box', padding: '6px 14px', fontFamily: MONO, fontSize: '15px', color: INK, textDecoration: 'none', background: k === nav.active ? 'rgba(20,16,13,0.08)' : 'transparent' }}>
                  <span>{markMatches(c.name, q).map(([t, hit], i) => (hit ? <strong key={i}>{t}</strong> : <span key={i}>{t}</span>))}{c.typeLabel ? <span> · {c.typeLabel}</span> : null}</span>
                </a>
              </li>
            ))}
            <li style={{ fontFamily: MONO, fontSize: '15px', color: INK, padding: '6px 14px 2px' }}>Or press Enter to search for a town or village with this name</li>
          </ul>
        )}
      </form>
      {error && <p role="alert" style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, margin: '8px 0 0' }}>{error}</p>}
      {suggestions.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0' }}>
          {suggestions.map((g) => (
            // The link stays inline, so a long name wraps with its tag after it; its padding makes the tap 44px tall.
            <li key={g.href} style={{ fontFamily: MONO, fontSize: '15px', lineHeight: '24px', color: INK, padding: '6px 0', margin: 0 }}>
              <a href={g.href} style={{ color: INK, textDecoration: 'underline', padding: '10px 0' }}>{g.name}</a>{g.tag ? ` (${g.tag})` : ''}
            </li>
          ))}
        </ul>
      )}
      {choices.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>More than one place has that name. Which one?</p>
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
