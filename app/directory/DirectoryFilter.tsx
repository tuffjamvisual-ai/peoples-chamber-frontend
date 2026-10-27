'use client';

// "Filter this list" on /directory: narrows the list already in the page as the reader types, in the browser only (no
// server call). It hides entries and letters with no match; the list itself is server rendered (page.tsx).
import { useId, useState } from 'react';

const INK = '#14100d';
const MONO = 'var(--font-special-elite), monospace';

export default function DirectoryFilter() {
  const [q, setQ] = useState('');
  const [none, setNone] = useState(false);
  const id = useId();

  function apply(value: string) {
    setQ(value);
    const words = value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    document.querySelectorAll<HTMLElement>('#directory-list section[data-letter]').forEach((sec) => {
      let inSection = 0;
      sec.querySelectorAll<HTMLElement>('li[data-entry]').forEach((li) => {
        const hit = words.every((w) => (li.dataset.entry || '').includes(w));
        li.hidden = !hit;
        if (hit) inSection++;
      });
      sec.hidden = inSection === 0;
      shown += inSection;
    });
    // A letter with nothing left to show is struck through and taken out of use while a filter is on (black ink rule:
    // never greyed out).
    document.querySelectorAll<HTMLElement>('[data-letter-link]').forEach((a) => {
      const sec = document.querySelector<HTMLElement>(`#directory-list section[data-letter="${a.dataset.letterLink}"]`);
      const off = !sec || sec.hidden;
      a.style.textDecoration = off ? 'line-through' : 'none';
      a.style.pointerEvents = off ? 'none' : '';
      a.style.borderStyle = off ? 'dashed' : 'solid';
      if (off) { a.setAttribute('aria-disabled', 'true'); a.setAttribute('tabindex', '-1'); } else { a.removeAttribute('aria-disabled'); a.removeAttribute('tabindex'); }
    });
    setNone(words.length > 0 && shown === 0);
  }

  return (
    <div style={{ margin: '0 0 20px', maxWidth: '520px' }}>
      <label htmlFor={id} style={{ display: 'block', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '4px' }}>Filter this list</label>
      <input id={id} type="search" value={q} onChange={(e) => apply(e.target.value)} autoComplete="off"
        placeholder="For example donations or MPs"
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: MONO, fontSize: '16px', color: INK, background: '#f4e8d4', border: `1px solid ${INK}`, padding: '9px 10px' }} />
      <p role="status" aria-live="polite" style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: none ? '10px 0 0' : 0, minHeight: 0 }}>
        {none ? 'No match. Try another word or browse the letters.' : ''}
      </p>
    </div>
  );
}
