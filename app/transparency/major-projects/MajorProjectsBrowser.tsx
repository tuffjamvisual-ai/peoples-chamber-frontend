'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

// The /transparency/major-projects list with a name search and filters (24 Oct 2026): department, latest delivery
// confidence rating, the report a project was last in, and "no evaluation plan in March 2025" (the earlier
// ?evaluation=no view, owner's decision 20 Oct 2026). Every project is rendered into the page's HTML by the server; the
// browser only hides the ones that do not match, so the page stays cached and readable without JavaScript. The search
// and filters live in the address bar (history.replaceState, as on /reports), so they survive opening a project and
// pressing Back, and a shared address restores them.

export type ProjectLine = {
  key: string;
  href: string;
  name: string;
  deptCode: string;
  deptLabel: string;
  deptSlug: string | null;
  deptName: string | null;
  rating: 'RED' | 'AMBER' | 'GREEN' | null;
  ratingText: string;
  endText: string;
  reportYear: number;
  lastReported: string | null; // "Last reported March 2025" for a project not in the latest report
  noPlan2025: boolean;
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const RATINGS = [
  { value: 'RED', label: 'Red' },
  { value: 'AMBER', label: 'Amber' },
  { value: 'GREEN', label: 'Green' },
  { value: 'none', label: 'Not given or withheld' },
];

// Parchment form controls, as on the /reports filter bar.
const field: CSSProperties = {
  padding: '10px 14px',
  background: 'rgba(20,16,13,0.05)',
  color: INK,
  border: `1px solid ${INK_HAIRLINE}`,
  borderRadius: 0,
  fontFamily: MONO,
  fontSize: '15px',
  outline: 'none',
  maxWidth: '100%',
};

type State = { q: string; dept: string; rating: string; year: string; evaluation: string };
const EMPTY: State = { q: '', dept: '', rating: '', year: '', evaluation: '' };
const KEYS: (keyof State)[] = ['q', 'dept', 'rating', 'year', 'evaluation'];

export default function MajorProjectsBrowser({ projects, latestYear, noPlanCount }: { projects: ProjectLine[]; latestYear: number; noPlanCount: number }) {
  const [state, setState] = useState<State>(EMPTY);
  const ready = useRef(false);

  const depts = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.deptCode, p.deptLabel);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [projects]);
  const years = useMemo(() => [...new Set(projects.map((p) => p.reportYear))].sort((a, b) => b - a), [projects]);

  // Read the address bar once, after mount (the server renders the unfiltered list). Unknown values are ignored.
  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(window.location.search);
      const deptCodes = new Set(depts.map(([c]) => c));
      const pick = (k: keyof State, ok: (v: string) => boolean) => { const v = sp.get(k) ?? ''; return ok(v) ? v : ''; };
      setState({
        q: sp.get('q') ?? '',
        dept: pick('dept', (v) => deptCodes.has(v)),
        rating: pick('rating', (v) => RATINGS.some((r) => r.value === v)),
        year: pick('year', (v) => years.includes(Number(v))),
        evaluation: pick('evaluation', (v) => v === 'no'),
      });
      ready.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [depts, years]);

  // Keep the address bar in step (no new history entries).
  useEffect(() => {
    if (!ready.current) return;
    const url = new URL(window.location.href);
    for (const k of KEYS) { const v = state[k].trim(); if (v) url.searchParams.set(k, v); else url.searchParams.delete(k); }
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.href);
  }, [state]);

  const set = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  // Curly and straight apostrophes count as the same ("Children's" finds "Children’s").
  const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'");
  const term = norm(state.q.trim());
  const matches = (p: ProjectLine) =>
    (!term || norm(p.name).includes(term))
    && (!state.dept || p.deptCode === state.dept)
    && (!state.rating || (state.rating === 'none' ? p.rating === null : p.rating === state.rating))
    && (!state.year || p.reportYear === Number(state.year))
    && (state.evaluation !== 'no' || p.noPlan2025);
  const visible = projects.map(matches);
  const count = visible.filter(Boolean).length;
  const filtered = KEYS.some((k) => state[k].trim());

  // Grouped by the department code in each project's latest report, as before.
  const groups = useMemo(() => {
    const m = new Map<string, number[]>();
    projects.forEach((p, i) => { if (!m.has(p.deptCode)) m.set(p.deptCode, []); m.get(p.deptCode)!.push(i); });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [projects]);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px', alignItems: 'baseline' }}>
        <input aria-label="Search project names" type="search" placeholder="Search project names…" value={state.q}
          onChange={(e) => set({ q: e.target.value })} style={{ ...field, flex: '1 1 260px', maxWidth: '380px' }} />
        <select aria-label="Department" value={state.dept} onChange={(e) => set({ dept: e.target.value })} style={{ ...field, cursor: 'pointer' }}>
          <option value="">All departments</option>
          {depts.map(([c, label]) => <option key={c} value={c}>{label}</option>)}
        </select>
        <select aria-label="Delivery confidence rating" value={state.rating} onChange={(e) => set({ rating: e.target.value })} style={{ ...field, cursor: 'pointer' }}>
          <option value="">Any rating (latest)</option>
          {RATINGS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select aria-label="Last reported in" value={state.year} onChange={(e) => set({ year: e.target.value })} style={{ ...field, cursor: 'pointer' }}>
          <option value="">Any report</option>
          {years.map((y) => <option key={y} value={String(y)}>{y === latestYear ? `In the March ${y} report (latest)` : `Last reported March ${y}`}</option>)}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: MONO, fontSize: '15px', cursor: 'pointer' }}>
          <input type="checkbox" checked={state.evaluation === 'no'} onChange={(e) => set({ evaluation: e.target.checked ? 'no' : '' })} style={{ width: '18px', height: '18px', accentColor: ACCENT }} />
          No evaluation plan (March 2025)
        </label>
      </div>
      <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '0 0 6px', maxWidth: '70ch' }}>
        The rating and department are each project&rsquo;s latest. &ldquo;Last reported&rdquo; means the project is not in the March {latestYear} report.
      </p>
      {state.evaluation === 'no' && (
        <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '0 0 6px', maxWidth: '62ch' }}>
          No evaluation plan: projects whose department answered &ldquo;No&rdquo; to &ldquo;Does the project have an evaluation plan? (self reported)&rdquo; in the March 2025 data ({noPlanCount} projects).
        </p>
      )}
      <p aria-live="polite" style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 18px' }}>
        {filtered ? `${count} of ${projects.length} projects` : `${projects.length} projects`}
        {filtered && (
          <>
            {' · '}
            <button type="button" onClick={() => setState(EMPTY)} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: ACCENT, textDecoration: 'underline', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 'inherit' }}>
              Clear
            </button>
          </>
        )}
      </p>

      {groups.map(([code, idx]) => {
        const shown = idx.filter((i) => visible[i]);
        const first = projects[idx[0]];
        return (
          <section key={code} hidden={shown.length === 0} style={{ marginBottom: '32px', display: shown.length ? 'block' : 'none' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 10px' }}>
              {first.deptLabel} · {filtered ? `${shown.length} of ${idx.length}` : idx.length}
            </h2>
            {first.deptSlug && (
              <p style={{ fontSize: '14px', margin: '0 0 6px' }}>
                Department page: <Link href={`/departments/${first.deptSlug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{first.deptName ?? first.deptSlug}</Link>
              </p>
            )}
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {idx.map((i) => {
                const p = projects[i];
                return (
                  <li key={p.key} hidden={!visible[i]} style={{ display: visible[i] ? 'block' : 'none', borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '8px 0', fontSize: '14px', lineHeight: 1.5 }}>
                    <Link href={p.href} style={{ color: INK, fontWeight: 600, fontSize: '15px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{p.name}</Link>
                    {' · '}{p.ratingText}
                    {' · '}End date: {p.endText}
                    {p.lastReported && <Fragment>{' · '}<strong>{p.lastReported}</strong></Fragment>}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {count === 0 && <p style={{ fontSize: '15px', margin: '0 0 28px' }}>No projects match.</p>}
    </>
  );
}
