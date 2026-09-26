'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { departments } from '@/lib/departments';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.18)';
const CREAM = '#f4e8d4';
const MONO = "'Special Elite', monospace";

const TYPE_CHIPS = [
  { value: 'all',          label: 'All' },
  { value: 'editorial',    label: 'Investigations' },
  { value: 'pressRelease', label: 'Releases' },
  { value: 'briefing',     label: 'Briefings' },
  { value: 'bill',         label: 'Bills' },
  { value: 'division',     label: 'Divisions' },
  { value: 'mp',           label: 'MPs' },
];

interface Props {
  defaultQ: string;
  defaultType: string;
  defaultDept: string;
}

export default function SearchInput({ defaultQ, defaultType, defaultDept }: Props) {
  const [q, setQ] = useState(defaultQ);
  const [dept, setDept] = useState(defaultDept);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function navigate(newQ: string, newType: string, newDept: string) {
    const params = new URLSearchParams();
    if (newQ.trim()) params.set('q', newQ.trim());
    if (newType !== 'all') params.set('type', newType);
    if (newDept) params.set('dept', newDept);
    const qs = params.toString();
    startTransition(() => {
      router.push('/search' + (qs ? '?' + qs : ''));
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(q, defaultType, dept);
  }

  function handleClear() {
    setQ('');
    navigate('', defaultType, dept);
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: '14px' }}>
        <input
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
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(20,16,13,0.45)',
              fontSize: '18px',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ✕
          </button>
        )}
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
        {TYPE_CHIPS.map((chip) => {
          const active = defaultType === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => navigate(q, chip.value, dept)}
              style={{
                padding: '4px 11px',
                fontFamily: MONO,
                fontSize: '12px',
                letterSpacing: '0.08em',
                color: active ? '#fff' : 'rgba(20,16,13,0.55)',
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

      <div style={{ marginTop: '10px' }}>
        <select
          value={dept}
          onChange={(e) => {
            const newDept = e.target.value;
            setDept(newDept);
            navigate(q, defaultType, newDept);
          }}
          style={{
            fontFamily: MONO,
            fontSize: '12px',
            letterSpacing: '0.06em',
            color: dept ? INK : 'rgba(20,16,13,0.45)',
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
      </div>
    </div>
  );
}
