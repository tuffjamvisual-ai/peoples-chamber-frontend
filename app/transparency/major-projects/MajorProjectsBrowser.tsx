'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { phoneUpTo } from '@/lib/breakpoints';

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
  dataAsAt: string; // the date of the project's latest report, for the phone card
  assessment: 'independent' | 'departmental' | null; // who gave the rating, for the phone card
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

// Phone cards (owner, 4 Nov 2026, under 640px): the project's name, department, rating, expected completion and last
// report; everything else, including the department's commentary, is read when the card is opened. An independent
// assessment is a solid label and a departmental one a dashed outline, so the two read differently at a glance.
// Under 640px the list also shows PHONE_PAGE projects at a time and headings give full department names. Every project is
// still in the HTML, and from 640px up all of them show as before.
const PHONE_PAGE = 25;
const CARD_CSS = `.mpb-card, .mpb-more, .mpb-phone-name { display: none; }
@media ${phoneUpTo(639.98)} {
  .mpb-over { display: none !important; }
  .mpb-more { display: block; min-height: 44px; margin: 0 0 28px; padding: 8px 16px; background: transparent; border: 1px solid #14100d; color: #14100d; font: inherit; font-size: 15px; cursor: pointer; }
  .mpb-phone-name { display: inline; }
  .mpb-wide { display: none; }
  .mpb-card { display: block; }
  .mpb-card > summary { display: block; min-height: 44px; padding: 4px 26px 4px 0; position: relative; cursor: pointer; list-style: none; }
  .mpb-card summary::-webkit-details-marker { display: none; }
  .mpb-mark { position: absolute; right: 4px; top: 4px; font-size: 20px; line-height: 1; color: #7a1612; }
  .mpb-mark::before { content: "+"; }
  .mpb-card[open] > summary .mpb-mark::before { content: "\\2212"; }
  .mpb-eval { min-height: 44px; }
}`;
const RAG: Record<string, string> = { RED: '#7a1612', AMBER: '#a85f00', GREEN: '#2f6b2f' };
const chip: CSSProperties = { display: 'inline-block', padding: '1px 8px', fontSize: '15px', lineHeight: 1.5 };
type CardYear = { year: number; dataAsAt: string; rating: string; end: string; cost: string; commentary: [string, string][] };

function ProjectCard({ p }: { p: ProjectLine }) {
  const [years, setYears] = useState<CardYear[] | null>(null);
  const [failed, setFailed] = useState(false);
  const asked = useRef(false);
  const load = () => {
    if (asked.current) return;
    asked.current = true;
    setFailed(false);
    fetch(`/api/major-projects/${encodeURIComponent(p.key)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { years: CardYear[] }) => setYears(d.years))
      .catch(() => { asked.current = false; setFailed(true); });
  };
  const word = p.rating ? p.rating[0] + p.rating.slice(1).toLowerCase() : null;
  return (
    <details className="mpb-card" onToggle={(e) => { if (e.currentTarget.open) load(); }}>
      <summary>
        <span aria-hidden className="mpb-mark" />
        <span style={{ display: 'block', fontWeight: 600, fontSize: '16px', lineHeight: 1.35 }}>{p.name}</span>
        <span style={{ display: 'block', marginTop: '2px' }}>{p.deptName ?? p.deptLabel}</span>
        <span style={{ display: 'block', marginTop: '4px' }}>
          {word
            ? <strong style={{ color: RAG[p.rating as string], marginRight: '8px' }}>{word}</strong>
            : <span style={{ marginRight: '8px' }}>{p.ratingText}</span>}
          {p.assessment === 'independent' && <span style={{ ...chip, background: INK, color: '#f4efe6', border: `1px solid ${INK}` }}>Independent assessment</span>}
          {p.assessment === 'departmental' && <span style={{ ...chip, border: `1px dashed ${INK}`, fontStyle: 'italic' }}>Departmental assessment</span>}
        </span>
        <span style={{ display: 'block', marginTop: '4px' }}>Expected completion: {p.endText}</span>
        <span style={{ display: 'block' }}>Last reported: {p.dataAsAt}</span>
      </summary>
      <div style={{ padding: '6px 0 10px', overflowWrap: 'anywhere' }}>
        {!years && !failed && <p style={{ margin: 0 }}>Loading…</p>}
        {failed && <p style={{ margin: 0 }}>This could not be loaded. <button type="button" onClick={load} style={{ font: 'inherit', color: ACCENT, background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}>Try again</button></p>}
        {years?.map((y) => (
          <div key={y.year} style={{ marginBottom: '10px' }}>
            <strong>{y.dataAsAt}</strong>
            <div>Rating: {y.rating}</div>
            <div>End date: {y.end}</div>
            <div>Whole life cost: {y.cost}</div>
            {y.commentary.map(([label, text]) => (
              <details key={label} style={{ marginTop: '4px' }}>
                <summary style={{ minHeight: '44px', display: 'flex', alignItems: 'center', cursor: 'pointer', textDecoration: 'underline', listStyle: 'none', padding: 0 }}>The department&rsquo;s commentary: {label.toLowerCase()}</summary>
                <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{text}</p>
              </details>
            ))}
          </div>
        ))}
        <Link href={p.href} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: ACCENT }}>Full record for this project</Link>
      </div>
    </details>
  );
}

export default function MajorProjectsBrowser({ projects, latestYear, noPlanCount }: { projects: ProjectLine[]; latestYear: number; noPlanCount: number }) {
  const [state, setState] = useState<State>(EMPTY);
  const [phoneLimit, setPhoneLimit] = useState(PHONE_PAGE);
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

  const set = (patch: Partial<State>) => { setState((s) => ({ ...s, ...patch })); setPhoneLimit(PHONE_PAGE); };
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

  // How many projects are shown before each group, for the phone limit.
  const shownBefore = groups.map((_, g) => groups.slice(0, g).reduce((n, [, x]) => n + x.filter((i) => visible[i]).length, 0));
  return (
    <>
      <style>{CARD_CSS}</style>
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
        <label className="mpb-eval" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: MONO, fontSize: '15px', cursor: 'pointer' }}>
          <input type="checkbox" checked={state.evaluation === 'no'} onChange={(e) => set({ evaluation: e.target.checked ? 'no' : '' })} style={{ width: '18px', height: '18px', accentColor: ACCENT }} />
          No evaluation plan (March 2025)
        </label>
      </div>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 6px', maxWidth: '70ch' }}>
        The rating and department are each project&rsquo;s latest. &ldquo;Last reported&rdquo; means the project is not in the March {latestYear} report.
      </p>
      {state.evaluation === 'no' && (
        <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 6px', maxWidth: '62ch' }}>
          No evaluation plan: projects whose department answered &ldquo;No&rdquo; to &ldquo;Does the project have an evaluation plan? (self reported)&rdquo; in the March 2025 data ({noPlanCount} projects).
        </p>
      )}
      <p aria-live="polite" style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 18px' }}>
        {filtered ? `${count} of ${projects.length} projects` : `${projects.length} projects`}
        {filtered && (
          <>
            {' · '}
            <button type="button" onClick={() => { setState(EMPTY); setPhoneLimit(PHONE_PAGE); }} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: ACCENT, textDecoration: 'underline', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 'inherit' }}>
              Clear
            </button>
          </>
        )}
      </p>

      {groups.map(([code, idx], g) => {
        const shown = idx.filter((i) => visible[i]);
        const first = projects[idx[0]];
        // Whether a project is past the phone limit, counting the ones shown so far in list order.
        const startRank = shownBefore[g];
        const overFrom = (i: number) => startRank + shown.indexOf(i) >= phoneLimit;
        return (
          <section key={code} className={startRank >= phoneLimit ? 'mpb-over' : undefined} hidden={shown.length === 0} style={{ marginBottom: '32px', display: shown.length ? 'block' : 'none' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 10px' }}>
              <span className="mpb-wide">{first.deptLabel}</span><span className="mpb-phone-name">{first.deptName ?? first.deptLabel}</span> · {filtered ? `${shown.length} of ${idx.length}` : idx.length}
            </h2>
            {first.deptSlug && (
              <p style={{ fontSize: '15px', margin: '0 0 6px' }}>
                Department page: <Link href={`/departments/${first.deptSlug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{first.deptName ?? first.deptSlug}</Link>
              </p>
            )}
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {idx.map((i) => {
                const p = projects[i];
                return (
                  <li key={p.key} className={visible[i] && overFrom(i) ? 'mpb-over' : undefined} hidden={!visible[i]} style={{ display: visible[i] ? 'block' : 'none', borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '8px 0', fontSize: '15px', lineHeight: 1.5 }}>
                    <span className="mpb-wide">
                    <Link href={p.href} style={{ color: INK, fontWeight: 600, fontSize: '15px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{p.name}</Link>
                    {' · '}{p.ratingText}
                    {' · '}End date: {p.endText}
                    {p.lastReported && <Fragment>{' · '}<strong>{p.lastReported}</strong></Fragment>}
                    </span>
                    <ProjectCard p={p} />
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {count > phoneLimit && (
        <button type="button" className="mpb-more" onClick={() => setPhoneLimit((n) => n + PHONE_PAGE)}>
          Show more ({count - phoneLimit} left)
        </button>
      )}
      {count === 0 && <p style={{ fontSize: '15px', margin: '0 0 28px' }}>No projects match.</p>}
    </>
  );
}
