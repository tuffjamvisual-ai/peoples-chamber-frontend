'use client';

import { useState, useTransition } from 'react';
import { noteSearch } from '@/lib/search-note';
import { SUBMITTED_SEARCH_KEY } from '@/lib/search-analytics';
import { useRouter } from 'next/navigation';
import { departments } from '@/lib/departments';
import { phoneUpTo } from '@/lib/breakpoints';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.18)';
const CREAM = '#f4e8d4';
const MONO = "var(--font-special-elite), monospace";

const FORM_ID = 'site-search-form';

// The search types, offered by the Type select below (AQ1, 8 Nov 2026: the one set of type controls).
const TYPES = [
  { value: 'all',          label: 'All' },
  // Investigations and briefings are one filter, Reports (23 Oct 2026); type=briefing links still work.
  { value: 'editorial',    label: 'Reports' },
  { value: 'pressRelease', label: 'Releases' },
  { value: 'bill',         label: 'Bills' },
  { value: 'division',     label: 'Parliamentary votes' },
  { value: 'constituency', label: 'Constituencies' },
  { value: 'mp',           label: 'MPs' },
  { value: 'peer',         label: 'Peers' },
  { value: 'council',      label: 'Councils' },
  { value: 'organisation', label: 'Organisations' },
  { value: 'donor',        label: 'Donors' },
];

interface Props {
  defaultQ: string;
  defaultType: string;
  defaultDept: string;
  defaultSort: string;
}

export default function SearchInput({ defaultQ, defaultType, defaultDept, defaultSort }: Props) {
  const [q, setQ] = useState(defaultQ);
  const [dept, setDept] = useState(defaultDept);
  const [type, setType] = useState(defaultType);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function navigate(newQ: string, newType: string, newDept: string, newSort: string) {
    const params = new URLSearchParams();
    if (newQ.trim()) params.set('q', newQ.trim());
    if (newType !== 'all') params.set('type', newType);
    if (newDept) params.set('dept', newDept);
    if (newSort === 'newest') params.set('sort', 'newest');
    const qs = params.toString();
    startTransition(() => {
      router.push('/search' + (qs ? '?' + qs : ''));
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The sign up note's count, at the moment of the search (lib/search-note.ts), so the note never moves the results
    // after they have been drawn.
    noteSearch(q);
    // Marks this query as submitted, so the results page sends one "search" event for it (with consent only;
    // app/search/SearchTracker.tsx). Arriving from a link or a filter sends none.
    try { window.sessionStorage.setItem(SUBMITTED_SEARCH_KEY, q.trim()); } catch { /* storage unavailable */ }
    navigate(q, type, dept, defaultSort);
  }

  function handleClear() {
    setQ('');
    navigate('', defaultType, dept, defaultSort);
  }

  // Sort order. The type chips that stood above it went in AQ1 (8 Nov 2026): they were buttons that needed JavaScript,
  // and the Type select below does the same job with JavaScript off too, so there is one set of type controls.
  const filters = (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', border: `1px solid ${HAIRLINE}`, overflow: 'hidden' }}>
          <button
            onClick={() => navigate(q, defaultType, dept, 'relevance')}
            style={{
              padding: '4px 11px',
              fontFamily: MONO,
              fontSize: '15px',
              letterSpacing: '0.08em',
              color: defaultSort !== 'newest' ? '#fff' : '#14100d',
              background: defaultSort !== 'newest' ? ACCENT : 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Best match
          </button>
          <button
            onClick={() => navigate(q, defaultType, dept, 'newest')}
            style={{
              padding: '4px 11px',
              fontFamily: MONO,
              fontSize: '15px',
              letterSpacing: '0.08em',
              color: defaultSort === 'newest' ? '#fff' : '#14100d',
              background: defaultSort === 'newest' ? ACCENT : 'transparent',
              border: 'none',
              borderLeft: `1px solid ${HAIRLINE}`,
              cursor: 'pointer',
            }}
          >
            Newest
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* A visible Search button (23 Oct 2026), styled as the council search's. A real GET form to /search (SR1, 8 Nov 2026),
          so it works with JavaScript off and every search can be linked: q, and the type and department below. */}
      <form id={FORM_ID} action="/search" method="get" role="search" onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'stretch', gap: '8px', marginBottom: '14px' }}>
        {defaultSort === 'newest' && <input type="hidden" name="sort" value="newest" />}
        <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 0 }}>
        <input
          aria-label="Search the site"
          name="q"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a minister, department, policy, vote or government announcement"
          style={{
            width: '100%',
            padding: '13px 48px 13px 16px',
            fontFamily: MONO,
            fontSize: '16px',
            color: INK,
            background: CREAM,
            border: `1px solid ${HAIRLINE}`,
            outline: 'none',
            boxSizing: 'border-box',
            transform: 'rotate(-0.1deg)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = INK; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = HAIRLINE; }}
        />
        {q && (
          <>
          {/* Phones (under 640px, owner, 4 Nov 2026): a 44px box at the end of the field; the mark stays the same size. */}
          <style dangerouslySetInnerHTML={{ __html: `@media ${phoneUpTo(639.98)} { .og-search-clear { width: 44px; height: 44px; right: 0 !important; padding: 0 !important; display: inline-flex; align-items: center; justify-content: center; } }` }} />
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="og-search-clear"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#14100d',
              fontSize: '18px',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ✕
          </button>
          </>
        )}
        </div>
        <button
          type="submit"
          style={{ flex: '0 0 auto', fontFamily: 'var(--font-special-elite), monospace', fontWeight: 700, fontSize: '17px', letterSpacing: '0.04em', color: '#fff', background: ACCENT, border: 'none', borderRadius: 0, padding: '11px 24px', cursor: 'pointer' }}
        >
          Search
        </button>
      </form>

      {/* Type and department (SR1, 8 Nov 2026; the audit found no type filter beside the department one): one row, in the
          form above (form attribute), so they reach the address with JavaScript off when Search is pressed; with JavaScript
          on a change applies at once. Shown once, at every width, so each is submitted once. */}
      <style>{`.srch-selects { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; margin: 0 0 12px; } .srch-selects label { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; color: ${INK}; } .srch-selects select { font-family: ${MONO}; font-size: 15px; letter-spacing: 0.06em; color: ${INK}; background: ${CREAM}; border: 1px solid ${HAIRLINE}; padding: 4px 11px; cursor: pointer; } @media ${phoneUpTo(639.98)} { .srch-selects label { width: 100%; } .srch-selects select { flex: 1 1 auto; min-width: 0; min-height: 44px; font-size: 16px; } }`}</style>
      <div className="srch-selects">
        <label>
          Type
          <select
            name="type"
            form={FORM_ID}
            value={type}
            onChange={(e) => { setType(e.target.value); navigate(q, e.target.value, dept, defaultSort); }}
            style={{ fontStyle: type !== 'all' ? 'normal' : 'italic', borderColor: type !== 'all' ? INK : undefined }}
          >
            {TYPES.map((c) => <option key={c.value} value={c.value}>{c.value === 'all' ? 'All types' : c.label}</option>)}
          </select>
        </label>
        <label>
          Department
          <select
            name="dept"
            form={FORM_ID}
            value={dept}
            onChange={(e) => { setDept(e.target.value); navigate(q, type, e.target.value, defaultSort); }}
            style={{ fontStyle: dept ? 'normal' : 'italic', borderColor: dept ? INK : undefined }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.slug} value={d.slug}>{d.shortName}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Phones (owner, 4 Nov 2026): the sort order folds into one control naming the current one; wider screens, as before. */}
      <style>{`.srch-fold { display: none; } @media ${phoneUpTo(639.98)} { .srch-wide { display: none; } .srch-fold { display: block; } .srch-fold summary { display: flex; align-items: center; justify-content: space-between; min-height: 48px; padding: 0 12px; box-sizing: border-box; border: 1px solid #14100d; font-family: var(--font-special-elite), monospace; font-size: 15px; font-weight: bold; color: #14100d; cursor: pointer; list-style: none; } .srch-fold summary::-webkit-details-marker { display: none; } .srch-fold[open] summary { margin-bottom: 10px; } .srch-fold[open] .srch-mark { transform: rotate(180deg); } }`}</style>
      <details className="srch-fold">
        <summary>Sort: {defaultSort === 'newest' ? 'Newest' : 'Best match'}<span className="srch-mark" aria-hidden>▾</span></summary>
        {filters}
      </details>
      <div className="srch-wide">{filters}</div>
    </div>
  );
}
