'use client';

import { useState, useTransition } from 'react';
import { noteSearch } from '@/lib/search-note';
import { SUBMITTED_SEARCH_KEY } from '@/lib/search-analytics';
import { useRouter } from 'next/navigation';
import { departments } from '@/lib/departments';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.18)';
const CREAM = '#f4e8d4';
const MONO = "var(--font-special-elite), monospace";

const TYPE_CHIPS = [
  { value: 'all',          label: 'All' },
  // Investigations and briefings are one filter, Reports (23 Oct 2026); type=briefing links still work.
  { value: 'editorial',    label: 'Reports' },
  { value: 'pressRelease', label: 'Releases' },
  { value: 'bill',         label: 'Bills' },
  { value: 'division',     label: 'Divisions' },
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
    navigate(q, defaultType, dept, defaultSort);
  }

  function handleClear() {
    setQ('');
    navigate('', defaultType, dept, defaultSort);
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* A visible Search button (23 Oct 2026), styled as the council search's. */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'stretch', gap: '8px', marginBottom: '14px' }}>
        <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 0 }}>
        <input
          aria-label="Search the site"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a minister, department, policy, vote or government announcement"
          autoFocus
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
          <style dangerouslySetInnerHTML={{ __html: '@media (max-width: 639.98px) { .og-search-clear { width: 44px; height: 44px; right: 0 !important; padding: 0 !important; display: inline-flex; align-items: center; justify-content: center; } }' }} />
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
        {TYPE_CHIPS.map((chip) => {
          const active = defaultType === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => navigate(q, chip.value, dept, defaultSort)}
              style={{
                padding: '4px 11px',
                fontFamily: MONO,
                fontSize: '15px',
                letterSpacing: '0.08em',
                color: active ? '#fff' : '#14100d',
                background: active ? ACCENT : 'transparent',
                border: `1px solid ${active ? ACCENT : HAIRLINE}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
        <select
          aria-label="Filter by department"
          value={dept}
          onChange={(e) => {
            const newDept = e.target.value;
            setDept(newDept);
            navigate(q, defaultType, newDept, defaultSort);
          }}
          style={{
            fontFamily: MONO,
            fontSize: '15px',
            letterSpacing: '0.06em',
            color: INK, fontStyle: dept ? 'normal' : 'italic',
            background: CREAM,
            border: `1px solid ${dept ? INK : HAIRLINE}`,
            padding: '4px 11px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.slug} value={d.slug}>{d.shortName}</option>
          ))}
        </select>
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
    </div>
  );
}
