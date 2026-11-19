'use client';

// "Filter this list" on /directory: narrows the list already in the page as the reader types, in the browser (no
// server call while anything matches). It hides entries and letters with no match; the list is server rendered (DirectoryList.tsx).
// The Parliament section page uses it too (T1-SECT, 12 Nov 2026), with its own list id; its groups take the letters' place.
// Matching (Cowork ENTRY 383, 19 Nov 2026): lib/directory-match.ts, the same rules as the 'Pages on opengovt' group on
// /search: each word in any order, case, punctuation and accents ignored, in the entry's name, description and its page's
// keywords (data-kw). Nothing matches: the note, then the first 5 results of the site search for the same words
// (/api/search, the search page's own search, asked once the reader stops typing) and a link to the full search.
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { matchScore } from '@/lib/directory-match';
import type { SearchResult } from '@/lib/search-content';

import '@/app/components/search-box-desk.css';
const INK = '#14100d';
const MONO = 'var(--font-special-elite), monospace';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';
// What the site search returns when nothing in the list matches: the first few, asked for after a pause in typing.
const SITE_SHOWN = 5;
const SITE_WAIT_MS = 400;

// A heading button says open when its letter shows: folded open, or every letter while a filter is on.
function syncToggles(listId: string) {
  const list = document.getElementById(listId);
  list?.querySelectorAll<HTMLElement>('[data-letter-toggle]').forEach((b) => {
    b.setAttribute('aria-expanded', String(!!list.classList.contains('pm-all') || !!b.closest('.dir-open')));
  });
}

export default function DirectoryFilter({ listId = 'directory-list', placeholder = 'For example donations or MPs', noMatch = 'No match in the directory.' }: { listId?: string; placeholder?: string; noMatch?: string }) {
  const [q, setQ] = useState('');
  const [none, setNone] = useState(false);
  // The site search's first results for the words, while nothing in the list matches (null: not asked yet or asking).
  const [site, setSite] = useState<{ q: string; results: SearchResult[] } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const asking = useRef<AbortController | null>(null);
  const id = useId();

  function askSite(value: string) {
    if (timer.current) clearTimeout(timer.current);
    asking.current?.abort();
    setSite(null);
    const term = value.trim();
    if (term.length < 2) return;
    timer.current = setTimeout(() => {
      const ctrl = new AbortController();
      asking.current = ctrl;
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d: { results?: SearchResult[] }) => setSite({ q: term, results: (d.results ?? []).slice(0, SITE_SHOWN) }))
        .catch(() => { if (!ctrl.signal.aborted) setSite({ q: term, results: [] }); });
    }, SITE_WAIT_MS);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); asking.current?.abort(); }, []);

  function apply(value: string) {
    setQ(value);
    const on = value.trim().length > 0;
    let shown = 0;
    // Phones: while a filter is on, every match shows, not only the first 25 of a letter (PhoneMore.tsx).
    document.getElementById(listId)?.classList.toggle('pm-all', on);
    document.querySelectorAll<HTMLElement>(`#${listId} section[data-letter]`).forEach((sec) => {
      let inSection = 0;
      sec.querySelectorAll<HTMLElement>('li[data-entry]').forEach((li) => {
        const hit = !on || matchScore({ title: li.dataset.entry || '', keywords: (li.dataset.kw || '').split('|') }, value, { typing: true }) > 0;
        li.hidden = !hit;
        if (hit) inSection++;
      });
      sec.hidden = inSection === 0;
      shown += inSection;
    });
    // A letter with nothing left to show is struck through and taken out of use while a filter is on (black ink rule:
    // never greyed out).
    document.querySelectorAll<HTMLElement>('[data-letter-link]').forEach((a) => {
      const sec = document.querySelector<HTMLElement>(`#${listId} section[data-letter="${a.dataset.letterLink}"]`);
      const off = !sec || sec.hidden;
      a.style.textDecoration = off ? 'line-through' : 'none';
      a.style.pointerEvents = off ? 'none' : '';
      a.style.borderStyle = off ? 'dashed' : 'solid';
      if (off) { a.setAttribute('aria-disabled', 'true'); a.setAttribute('tabindex', '-1'); } else { a.removeAttribute('aria-disabled'); a.removeAttribute('tabindex'); }
    });
    const nothing = on && shown === 0;
    setNone(nothing);
    if (nothing) askSite(value); else askSite('');
    syncToggles(listId);
  }

  // Phones: a letter's heading folds it open and closed; its letter in the A to Z bar, or an address ending in it, opens
  // it before the browser scrolls there. The classes do nothing from 640px up, where the headings are not buttons.
  useEffect(() => {
    const section = (letter?: string) => document.querySelector<HTMLElement>(`#${listId} section[data-letter="${letter}"]`);
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const toggle = target.closest<HTMLElement>('[data-letter-toggle]');
      if (toggle && !document.getElementById(listId)?.classList.contains('pm-all')) section(toggle.dataset.letterToggle)?.classList.toggle('dir-open');
      const link = target.closest<HTMLElement>('[data-letter-link]');
      if (link) section(link.dataset.letterLink)?.classList.add('dir-open');
      if (toggle || link) syncToggles(listId);
    };
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const sec = id ? document.getElementById(id) : null;
      if (!sec?.matches(`#${listId} section[data-letter]`)) return;
      sec.classList.add('dir-open');
      syncToggles(listId);
      sec.scrollIntoView();
    };
    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', openFromHash);
    openFromHash();
    return () => { document.removeEventListener('click', onClick); window.removeEventListener('hashchange', openFromHash); };
  }, [listId]);

  return (
    <div style={{ margin: '0 0 20px', maxWidth: '520px' }}>
      <label htmlFor={id} style={{ display: 'block', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '4px' }}>Filter this list</label>
      <input className="og-sbox-input" data-main-action id={id} type="search" value={q} onChange={(e) => apply(e.target.value)} autoComplete="off"
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: MONO, fontSize: '16px', color: INK, background: '#f4e8d4', border: `1px solid ${INK}`, padding: '9px 10px' }} />
      <p role="status" aria-live="polite" style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: none ? '10px 0 0' : 0, minHeight: 0 }}>
        {none ? noMatch : ''}
      </p>
      {none && q.trim().length >= 2 && (
        <div style={{ marginTop: '8px' }}>
          {site && site.q === q.trim() && site.results.length > 0 && (
            <>
              <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 2px' }}>From the site search:</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {site.results.map((r) => (
                  <li key={r.url} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '9px 0' }}>
                    <Link href={r.url} style={{ fontSize: '17px', fontWeight: 'bold', color: INK, textDecoration: 'underline', textUnderlineOffset: '3px', overflowWrap: 'anywhere' }}>{r.title}</Link>
                    {r.standfirst && <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '3px 0 0', color: INK }}>{r.standfirst.length > 160 ? r.standfirst.slice(0, 160) + '…' : r.standfirst}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p style={{ fontFamily: MONO, fontSize: '15px', margin: '10px 0 0' }}>
            <Link href={`/search?q=${encodeURIComponent(q.trim())}`} className="og-tap" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Search the whole site for &ldquo;{q.trim()}&rdquo;</Link>
          </p>
        </div>
      )}
    </div>
  );
}
