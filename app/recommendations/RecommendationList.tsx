'use client';
// Filterable list of recommendations for /recommendations (filters by department and status, in the browser). The
// data is compact (each report's title, line and bodies once; then one short row per recommendation) and the list
// shows 50 at a time, so the page stays small. /recommendations?department=<department page slug> opens it filtered
// to every body on that department's page (the department tab's link).
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

export type ListReport = { title: string; meta: string; bodies: string[]; pages: string[]; other: boolean };
// [report key "session/number", rec number, status key, status in words]
export type ListRow = [string, string, string, string];
type Option = { value: string; label: string };

const INK = '#14100d';
const PAGE = 50;
const select: React.CSSProperties = { fontSize: '16px', color: INK, background: 'transparent', border: '1px solid rgba(20,16,13,0.4)', padding: '6px 8px', maxWidth: '100%' };
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '15px', color: INK, minWidth: 0, maxWidth: '100%' };

function matches(r: ListReport | undefined, filter: string) {
  if (!filter) return true;
  if (!r) return false;
  if (filter === 'other') return r.other;
  if (filter.startsWith('body:')) return r.bodies.includes(filter.slice(5));
  if (filter.startsWith('page:')) return r.pages.includes(filter.slice(5));
  return true;
}

export default function RecommendationList({ reports, rows, departmentOptions, statusOptions, pageNames }: {
  reports: Record<string, ListReport>; rows: ListRow[]; departmentOptions: Option[]; statusOptions: Option[]; pageNames: Record<string, string>;
}) {
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(PAGE);
  // ?department=<page slug> from a department page's tab.
  useEffect(() => {
    try {
      const slug = new URLSearchParams(window.location.search).get('department');
      if (slug && pageNames[slug]) setDepartment(`page:${slug}`); // eslint-disable-line react-hooks/set-state-in-effect
    } catch { /* no URL */ }
  }, [pageNames]);
  const options = department.startsWith('page:') ? [{ value: department, label: `${pageNames[department.slice(5)]} (all on its page)` }, ...departmentOptions] : departmentOptions;
  const matching = useMemo(
    () => rows.filter(([key, , s]) => matches(reports[key], department) && (!status || s === status)),
    [rows, reports, department, status],
  );
  const shown = matching.slice(0, limit);
  return (
    <section>
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
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {shown.map(([key, rec, , words]) => {
          const r = reports[key];
          return (
            <li key={`${key}/${rec}`} style={{ borderBottom: '1px dotted rgba(20,16,13,0.2)', padding: '10px 0' }}>
              <Link href={`/recommendations/${key}/${rec}`} className="no-hover-scale" style={{ display: 'block', color: INK, textDecoration: 'none' }}>
                <span style={{ display: 'block', fontSize: '16px', fontWeight: 600, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{r?.title}: recommendation {rec}</span>
                <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '2px', overflowWrap: 'anywhere' }}>{r?.meta}</span>
                <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '2px', fontStyle: 'italic', overflowWrap: 'anywhere' }}>{words}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      {matching.length === 0 && <p style={{ fontSize: '16px', color: INK }}>No recommendations match these filters.</p>}
      {matching.length > limit && (
        <button type="button" onClick={() => setLimit(limit + PAGE)} style={{ marginTop: '14px', fontSize: '16px', color: INK, background: 'transparent', border: '1px solid rgba(20,16,13,0.4)', padding: '8px 14px', cursor: 'pointer' }}>
          Show more
        </button>
      )}
    </section>
  );
}
