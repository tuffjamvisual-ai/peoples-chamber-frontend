'use client';
// Filterable list of recommendations for /recommendations (filters by department and status, in the browser). The
// data is compact (each report's title, line and bodies once; then one short row per recommendation) and the list
// shows 50 at a time, so the page stays small. /recommendations?department=<department page slug> opens it filtered
// to every body on that department's page (the department tab's link); ?department=<body key> opens it filtered to
// that body (a cross referenced body's "Also" link), with the body's note when it has one.
import NoJsPager from '@/app/components/NoJsPager';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { phoneUpTo } from '@/lib/breakpoints';

export type ListReport = { title: string; meta: string; bodies: string[]; pages: string[]; other: boolean };
// [report key "session/number", rec number, status key, status in words]
export type ListRow = [string, string, string, string];
type Option = { value: string; label: string };

const INK = '#14100d';
const PAGE = 50;
const select: React.CSSProperties = { fontSize: '16px', color: INK, background: 'transparent', border: '1px solid rgba(20,16,13,0.4)', padding: '6px 8px', maxWidth: '100%' };
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '15px', color: INK, minWidth: 0, maxWidth: '100%' };

const GROUPS: Record<string, string[]> = {
  open: ['target_in_future', 'no_dated_target'],
  delivered: ['implemented', 'delivered_elsewhere'],
  rejected: ['rejected'],
  target_passed: ['target_passed_unchecked', 'target_passed_checked'],
};
const statusMatches = (s: string, filter: string) => !filter || (filter.startsWith('group:') ? (GROUPS[filter.slice(6)] ?? []).includes(s) : s === filter);

function matches(r: ListReport | undefined, filter: string) {
  if (!filter) return true;
  if (!r) return false;
  if (filter === 'other') return r.other;
  if (filter.startsWith('body:')) return r.bodies.includes(filter.slice(5));
  if (filter.startsWith('page:')) return r.pages.includes(filter.slice(5));
  return true;
}

// Phone cards (owner, 4 Nov 2026, under 640px): a search box, and each recommendation as a card that opens to its history,
// read from /api/recommendations/... when opened.
const CARD_CSS = `.rec-card { display: none; } .rec-search { display: block; }
@media ${phoneUpTo(767.98)} {
  .rec-wide { display: none; }
  .rec-card { display: block; }
  .rec-card > summary { display: block; min-height: 44px; padding: 0 26px 0 0; position: relative; cursor: pointer; list-style: none; }
  .rec-card > summary::-webkit-details-marker { display: none; }
  .rec-mark { position: absolute; right: 4px; top: 0; font-size: 20px; line-height: 1; color: #7a1612; }
  .rec-mark::before { content: "+"; }
  .rec-card[open] > summary .rec-mark::before { content: "\\2212"; }
}`;
type HistoryEvent = { id: number; document: string; href: string; page: number | null; response: string | null; lines: string[]; words: string[] };
type History = { status: string; events: HistoryEvent[] };

function RecommendationCard({ path, title, meta, words }: { path: string; title: string; meta: string; words: string }) {
  const [history, setHistory] = useState<History | null>(null);
  const [failed, setFailed] = useState(false);
  const asked = useRef(false);
  const load = () => {
    if (asked.current) return;
    asked.current = true;
    setFailed(false);
    fetch(`/api${path}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: History) => setHistory(d))
      .catch(() => { asked.current = false; setFailed(true); });
  };
  return (
    <details className="rec-card" onToggle={(e) => { if (e.currentTarget.open) load(); }}>
      <summary>
        <span aria-hidden className="rec-mark" />
        <span style={{ display: 'block', fontSize: '16px', fontWeight: 600, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{title}</span>
        <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '2px', overflowWrap: 'anywhere' }}>{meta}</span>
        <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '2px', fontStyle: 'italic', overflowWrap: 'anywhere' }}>{words}</span>
      </summary>
      <div style={{ fontSize: '15px', lineHeight: 1.55, padding: '8px 0 4px', overflowWrap: 'anywhere' }}>
        {!history && !failed && <p style={{ margin: 0 }}>Loading…</p>}
        {failed && <p style={{ margin: 0 }}>This could not be loaded. <button type="button" onClick={load} style={{ font: 'inherit', color: INK, background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}>Try again</button></p>}
        {history && history.events.length === 0 && <p style={{ margin: 0 }}>No statements from the government yet.</p>}
        {history?.events.map((e) => (
          <div key={e.id} style={{ borderLeft: '2px solid rgba(20,16,13,0.25)', padding: '0 0 12px 12px' }}>
            <a href={e.href} style={{ color: INK, fontWeight: 600 }}>{e.document}</a>{e.page ? `, PDF page ${e.page}` : ''}
            {e.response && <div>Response: {e.response}</div>}
            {e.lines.map((l) => <div key={l}>{l}</div>)}
            {e.words.length > 0 && (
              <details>
                <summary style={{ minHeight: '44px', display: 'flex', alignItems: 'center', cursor: 'pointer', textDecoration: 'underline' }}>The government&rsquo;s words</summary>
                {e.words.map((w, i) => <p key={i} style={{ margin: '0 0 8px' }}>{w}</p>)}
              </details>
            )}
          </div>
        ))}
        <Link href={path} className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: INK, textDecoration: 'underline' }}>Full record for this recommendation</Link>
      </div>
    </details>
  );
}

export default function RecommendationList({ reports, rows, departmentOptions, statusOptions, pageNames, bodyNotes }: {
  reports: Record<string, ListReport>; rows: ListRow[]; departmentOptions: Option[]; statusOptions: Option[]; pageNames: Record<string, string>;
  bodyNotes: Record<string, string>;
}) {
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [search, setSearch] = useState(''); // the search box, at every width since UX3i (10 Nov 2026); the page's main action
  // ?department=<page slug>&status=<open|delivered|rejected|target_passed> from a department page's tab.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const slug = q.get('department');
      const group = q.get('status');
      if (slug && pageNames[slug]) setDepartment(`page:${slug}`); // eslint-disable-line react-hooks/set-state-in-effect
      else if (slug && departmentOptions.some((o) => o.value === `body:${slug}`)) setDepartment(`body:${slug}`);
      if (group && GROUPS[group]) setStatus(`group:${group}`);
    } catch { /* no URL */ }
  }, [pageNames, departmentOptions]);
  // A department page filter shows as the plain department name, in place of a body option with the same name.
  const pageLabel = department.startsWith('page:') ? pageNames[department.slice(5)] : null;
  const options = pageLabel ? [{ value: department, label: pageLabel }, ...departmentOptions.filter((o) => o.label !== pageLabel)] : departmentOptions;
  const term = search.trim().toLowerCase();
  const matching = useMemo(
    () => rows.filter(([key, rec, s, words]) => matches(reports[key], department) && statusMatches(s, status)
      && (!term || `${reports[key]?.title} ${reports[key]?.meta} ${rec} ${words}`.toLowerCase().includes(term))),
    [rows, reports, department, status, term],
  );
  const shown = matching.slice(0, limit);
  const note = department.startsWith('body:') ? bodyNotes[department.slice(5)] : undefined;
  return (
    <section>
      <style>{CARD_CSS}</style>
      <label className="rec-search" data-main-action style={{ fontSize: '15px', color: INK, margin: '0 0 12px' }}>
        Search recommendations
        <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setLimit(PAGE); }}
          style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: '44px', marginTop: '4px', fontSize: '16px', color: INK, background: 'transparent', border: '1px solid rgba(20,16,13,0.4)', padding: '6px 8px' }} />
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', margin: '0 0 16px' }}>
        <label style={label}>
          Department
          <select value={department} onChange={(e) => { setDepartment(e.target.value); setLimit(PAGE); }} style={select}>
            <option value="">All departments and bodies</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label style={label}>
          Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setLimit(PAGE); }} style={select}>
            <option value="">All</option>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>
      {note && <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 12px', maxWidth: '46em' }}>{note}</p>}
      <NoJsPager id="rec-rows" count={shown.length} rows="> li" size={25}>
<ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {shown.map(([key, rec, , words]) => {
          const r = reports[key];
          return (
            <li key={`${key}/${rec}`} style={{ borderBottom: '1px dotted rgba(20,16,13,0.2)', padding: '10px 0' }}>
              <div className="rec-wide">
              <Link href={`/recommendations/${key}/${rec}`} className="no-hover-scale" style={{ display: 'block', color: INK, textDecoration: 'none' }}>
                <span style={{ display: 'block', fontSize: '16px', fontWeight: 600, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{r?.title}: recommendation {rec}</span>
                <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '2px', overflowWrap: 'anywhere' }}>{r?.meta}</span>
                <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '2px', fontStyle: 'italic', overflowWrap: 'anywhere' }}>{words}</span>
              </Link>
              </div>
              <RecommendationCard path={`/recommendations/${key}/${rec}`} title={`${r?.title}: recommendation ${rec}`} meta={r?.meta ?? ''} words={words} />
            </li>
          );
        })}
      </ol>
</NoJsPager>
      {matching.length === 0 && <p style={{ fontSize: '16px', color: INK }}>No recommendations match these filters.</p>}
      {matching.length > limit && (
        <button type="button" onClick={() => setLimit(limit + PAGE)} style={{ marginTop: '14px', fontSize: '16px', color: INK, background: 'transparent', border: '1px solid rgba(20,16,13,0.4)', padding: '8px 14px', cursor: 'pointer' }}>
          Show more
        </button>
      )}
    </section>
  );
}
