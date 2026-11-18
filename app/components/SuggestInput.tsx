'use client';
// The one search box with suggestions (SEARCH-ALL, Cowork ENTRY 318 and 326), taken from the /reports box: from the 2nd
// letter a list of up to 6 suggestions under the box, matched letters in bold; arrow keys move through them, Enter or a
// tap opens one, Escape closes the list; rows at least 44px tall. It is the text input of a plain GET form the page
// already has, so the form (and Enter with no suggestion picked) works as before, with or without JavaScript. Each page
// keeps its own look: the input's id, name, class and style are passed through unchanged.
// Suggestions come from a URL that answers { suggestions: [{ label, kind, href }] } (lib/search/site-index.ts and the
// other /api/suggest routes); requests wait 200ms after the last key and an older answer never replaces a newer one.
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { markMatches } from '@/lib/search/words';

export type Suggestion = { label: string; kind?: string; href: string };

const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.12)';
const MONO = 'var(--font-special-elite), monospace';

type Props = {
  /** The suggestions route, e.g. '/api/suggest/site'; ?q= is added. A string, so a server page can pass it. */
  suggestPath: string;
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  /** Extra attributes for the input, e.g. data-main-action. */
  inputProps?: Record<string, string | boolean | undefined>;
  /** What goes after the input inside its relative wrapper (the page's own submit arrow, say). */
  children?: ReactNode;
  listLabel?: string;
  /** Controlled use: the page holds the text (as /search does for its clear button and filters). */
  value?: string;
  onValueChange?: (v: string) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
};

export default function SuggestInput({ suggestPath, name, id, defaultValue = '', placeholder, className, style, ariaLabel, inputProps, children, listLabel = 'Suggestions', value, onValueChange, onFocus, onBlur }: Props) {
  const auto = useId().replace(/:/g, '');
  const listId = `sg-${id ?? auto}`;
  const [own, setOwn] = useState(defaultValue);
  const q = value ?? own;
  const setQ = (v: string) => { if (value === undefined) setOwn(v); onValueChange?.(v); };
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const seq = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    const n = ++seq.current;
    if (term.length < 2) { const t = setTimeout(() => { if (n === seq.current) setItems([]); }, 0); return () => clearTimeout(t); }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${suggestPath}?q=${encodeURIComponent(term)}`);
        const data = res.ok ? await res.json() : { suggestions: [] };
        if (n === seq.current) { setItems((data.suggestions ?? []).slice(0, 6)); setActive(-1); }
      } catch { if (n === seq.current) setItems([]); }
    }, 200);
    return () => clearTimeout(t);
  }, [q, suggestPath]);

  useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const showList = open && q.trim().length >= 2 && items.length > 0;
  const go = (s: Suggestion) => { setOpen(false); window.location.assign(s.href); };
  const onKey = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown' && items.length) { ev.preventDefault(); setOpen(true); setActive((a) => (a + 1) % items.length); }
    else if (ev.key === 'ArrowUp' && items.length) { ev.preventDefault(); setOpen(true); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (ev.key === 'Enter' && showList && active >= 0) { ev.preventDefault(); go(items[active]); }
    else if (ev.key === 'Escape') { setOpen(false); setActive(-1); }
  };

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <input
        {...inputProps}
        id={id}
        name={name}
        type="text"
        value={q}
        placeholder={placeholder}
        className={className}
        style={style}
        aria-label={ariaLabel}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={(e) => { setOpen(true); onFocus?.(e); }}
        onBlur={onBlur}
        onKeyDown={onKey}
      />
      {children}
      <ul id={listId} role="listbox" aria-label={listLabel} hidden={!showList}
        style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, top: '100%', margin: '2px 0 0', padding: 0, listStyle: 'none', background: '#f4ecd8', border: `1px solid ${INK}`, boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
        {items.map((s, k) => (
          <li key={`${s.href}|${k}`} id={`${listId}-${k}`} role="option" aria-selected={k === active}
            onMouseDown={(ev) => { ev.preventDefault(); go(s); }} onMouseEnter={() => setActive(k)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', minHeight: '44px', padding: '6px 12px', fontFamily: MONO, fontSize: '15px', lineHeight: 1.3, color: INK, cursor: 'pointer', borderTop: k ? `1px solid ${HAIRLINE}` : 'none', background: k === active ? 'rgba(20,16,13,0.08)' : 'transparent' }}>
            <span>{markMatches(s.label, q).map(([t, hit], i) => (hit ? <strong key={i}>{t}</strong> : <span key={i}>{t}</span>))}</span>
            {s.kind && <span style={{ fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.kind}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
