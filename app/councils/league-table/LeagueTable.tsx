'use client';

// Sortable, searchable league tables for /councils/league-table. Every area's
// figures arrive as props from the server page (under 300 rows), so sorting,
// filtering and searching need no further database calls.

import { Fragment, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

export type ClientFlag = { label: string; county: boolean; kind: string };
// Formal action taken against or by a council, kept apart from signs of financial pressure (audit L9).
const FORMAL = new Set(['ofsted', 's114', 'intervention', 'inspection']);
export type ClientRow = {
  code: string;
  name: string;
  href: string | null;
  type: string;
  areaScore: number | null;
  areaRank: number | null;
  areaBand: number | null;
  nearBoundary: boolean;
  bandChanges: number | null;
  bandVersions: number | null;
  topics: Record<string, number>;
  servicesScore: number | null;
  servicesRank: number | null;
  servicesBand: number | null;
  services: Record<string, number>;
  peer: { rank: number; of: number } | null;
  flags: ClientFlag[];
  // Area view only: the two highest- and two lowest-scoring measures (score 0-100).
  extremes: { high: Extreme[]; low: Extreme[] };
};
type Extreme = { label: string; value: number; period: string | null; score: number };

const fmtValue = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 1 });
const extremeText = (m: Extreme) => `${m.label}: ${fmtValue(m.value)}${m.period ? ` (${m.period})` : ''}, score ${Math.round(m.score)}`;

type View = 'area' | 'services';
type SortKey = 'rank' | 'name' | string; // a topic name or service part key sorts by that score

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';
const FIRST = 50;

const TYPES: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lon-borough', label: 'London boroughs' },
  { key: 'met-borough', label: 'Metropolitan boroughs' },
  { key: 'unitary', label: 'Unitary councils' },
  { key: 'district', label: 'District councils' },
];
const BAND_WORDS = ['', 'top fifth', 'second fifth', 'middle fifth', 'fourth fifth', 'bottom fifth'];
const ordinal = (k: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = k % 100;
  return `${k}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const fmt = (v: number | null | undefined) => (v == null ? 'n/a' : (Math.round(v * 10) / 10).toFixed(1));

const btn = (on: boolean): CSSProperties => ({
  fontFamily: MONO, fontSize: '14px', padding: '6px 10px', margin: '0 8px 8px 0', cursor: 'pointer',
  background: on ? INK : 'transparent', color: on ? '#f4efe6' : INK, border: `1px solid ${INK}`, borderRadius: 0,
});

export default function LeagueTable({ rows, topics, parts }: { rows: ClientRow[]; topics: string[]; parts: { key: string; label: string }[] }) {
  const [view, setView] = useState<View>('area');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('rank');
  const [desc, setDesc] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const rankOf = (r: ClientRow) => (view === 'area' ? r.areaRank : r.servicesRank);
  const value = (r: ClientRow, key: SortKey): number | string | null => {
    if (key === 'rank') return rankOf(r);
    if (key === 'name') return r.name;
    if (view === 'area') return r.topics[key] ?? null;
    return r.services[key] ?? null;
  };

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = rows
      .filter((r) => rankOf(r) != null)
      .filter((r) => type === 'all' || r.type === type)
      .filter((r) => !term || r.name.toLowerCase().includes(term));
    const dir = desc ? -1 : 1;
    return [...base].sort((a, b) => {
      const va = value(a, sort), vb = value(b, sort);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // missing figures always last
      if (vb == null) return -1;
      if (typeof va === 'string' || typeof vb === 'string') return String(va).localeCompare(String(vb)) * dir;
      // Scores: higher is better, so "best first" is descending; rank: 1 first.
      return (sort === 'rank' ? va - vb : vb - va) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, view, type, q, sort, desc]);
  const visible = showAll || q.trim() ? list : list.slice(0, FIRST);

  const setSortKey = (key: SortKey) => {
    if (sort === key) setDesc((d) => !d);
    else { setSort(key); setDesc(false); }
  };

  const th: CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', whiteSpace: 'nowrap', verticalAlign: 'bottom' };
  const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, verticalAlign: 'top' };
  const tdNum: CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
  const head = (key: SortKey, text: string, right = true, cls?: string) => (
    <th key={key} className={cls} style={{ ...th, textAlign: right ? 'right' : 'left' }}>
      <button type="button" onClick={() => setSortKey(key)} aria-label={`Sort by ${text}`}
        style={{ all: 'unset', cursor: 'pointer', color: sort === key ? ACCENT : INK, fontFamily: MONO }}>
        {text}{sort === key ? (desc ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  const cols = view === 'area' ? topics.map((t) => ({ key: t, label: t })) : parts;
  const colCount = 6 + cols.length + (view === 'services' ? 1 : 0);

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <style>{`
        .lt-details > div { flex: 1 1 180px; min-width: 0; }
        @media (max-width: 760px) {
          .lt-wide { display: none; }
          .lt-table { font-size: 14px !important; }
          .lt-table th, .lt-table td { padding-right: 5px !important; }
          .lt-table td { overflow-wrap: anywhere; }
          .lt-table th { white-space: normal !important; }
        }
      `}</style>
      <div role="tablist" aria-label="Choose a table" style={{ marginBottom: '6px' }}>
        <button type="button" role="tab" aria-selected={view === 'area'} onClick={() => { setView('area'); setSort('rank'); setDesc(false); setShowAll(false); setOpen(null); }} style={btn(view === 'area')}>Area rating</button>
        <button type="button" role="tab" aria-selected={view === 'services'} onClick={() => { setView('services'); setSort('rank'); setDesc(false); setShowAll(false); setOpen(null); }} style={btn(view === 'services')}>Selected council services</button>
      </div>
      <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: '0 0 10px', maxWidth: '46em' }}>
        {view === 'area'
          ? 'How each area compares on eight topics: schools and children, safety, health, jobs and poverty, housing, environment, connectivity and local services. This describes the area, not how well the council is run: it is not a ranking of councils.'
          : "How four of the services councils run compare for each area: schools, children's services, recycling and planning. It does not cover every council service. For a district, schools and children's services are run by its county council. “In its group” compares the area with the 15 councils most like it (government Statistical Neighbours)."}
      </p>
      <div aria-label="Council type" style={{ marginBottom: '4px' }}>
        {TYPES.map((t) => (
          <button key={t.key} type="button" aria-pressed={type === t.key} onClick={() => { setType(t.key); setShowAll(false); }} style={btn(type === t.key)}>{t.label}</button>
        ))}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="lt-search" style={{ fontFamily: MONO, fontSize: '14px', color: INK, marginRight: '8px' }}>Find an area</label>
        <input id="lt-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Leeds"
          style={{ fontFamily: MONO, fontSize: '15px', padding: '6px 8px', border: `1px solid ${INK}`, background: 'transparent', color: INK, width: '12em' }} />
      </div>
      <p style={{ fontFamily: MONO, fontSize: '14px', color: INK, margin: '0 0 8px' }}>
        {list.length} area{list.length === 1 ? '' : 's'} shown. Click a column heading to sort; click ▸ for the details.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="lt-table" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, width: '100%' }}>
          <thead>
            <tr>
              <th style={th}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>Details</span></th>
              {head('rank', '#')}
              {head('name', 'Area', false)}
              <th style={th}>Band</th>
              <th className="lt-wide" style={{ ...th, textAlign: 'right' }}>Score</th>
              {view === 'services' && <th className="lt-wide" style={{ ...th, textAlign: 'right' }}>In its group</th>}
              {cols.map((c) => head(c.key, c.label, true, 'lt-wide'))}
              <th style={th}>Warning flags</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const band = view === 'area' ? r.areaBand : r.servicesBand;
              const score = view === 'area' ? r.areaScore : r.servicesScore;
              const isOpen = open === r.code;
              return (
                <Fragment key={r.code}>
                  <tr>
                    <td style={td}>
                      <button type="button" aria-expanded={isOpen} aria-label={`Details for ${r.name}`} onClick={() => setOpen(isOpen ? null : r.code)}
                        style={{ all: 'unset', cursor: 'pointer', fontFamily: MONO, padding: '0 4px' }}>{isOpen ? '▾' : '▸'}</button>
                    </td>
                    <td style={tdNum}>{rankOf(r)}</td>
                    <td style={td}>{r.href ? <a href={r.href} style={{ color: INK }}>{r.name}</a> : r.name}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {band} <span className="lt-wide">· {BAND_WORDS[band ?? 0]}</span>
                      {view === 'area' && r.nearBoundary && <span title="Close to the edge of its band: see How the scores work" style={{ color: ACCENT }}> ≈</span>}
                    </td>
                    <td className="lt-wide" style={tdNum} title={`Based on ${cols.filter((c) => (view === 'area' ? r.topics[c.key] : r.services[c.key]) != null).length} of ${cols.length}`}>
                      {fmt(score)}
                      {cols.some((c) => (view === 'area' ? r.topics[c.key] : r.services[c.key]) == null) && (
                        <span style={{ fontSize: '12px' }}> ({cols.filter((c) => (view === 'area' ? r.topics[c.key] : r.services[c.key]) != null).length}/{cols.length})</span>
                      )}
                    </td>
                    {view === 'services' && <td className="lt-wide" style={tdNum}>{r.peer ? `${ordinal(r.peer.rank)} of ${r.peer.of}` : 'n/a'}</td>}
                    {cols.map((c) => <td key={c.key} className="lt-wide" style={tdNum}>{fmt(view === 'area' ? r.topics[c.key] : r.services[c.key])}</td>)}
                    <td style={{ ...td, color: ACCENT, fontSize: '14px' }}>
                      {r.flags.length === 0 ? '' : (
                        <>
                          {[['Formal action', r.flags.filter((f) => FORMAL.has(f.kind))], ['Financial pressure', r.flags.filter((f) => !FORMAL.has(f.kind))]].map(([group, fs]) =>
                            (fs as ClientFlag[]).length === 0 ? null : (
                              <div key={group as string} style={{ marginBottom: '4px' }}>
                                <div style={{ color: INK, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group as string}</div>
                                {(fs as ClientFlag[]).map((f) => <div key={f.label + f.county}>{f.label}{f.county ? ' (county)' : ''}</div>)}
                              </div>
                            ))}
                        </>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={colCount} style={{ ...td, padding: '8px 0 14px 12px' }}>
                        <div className="lt-details" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', maxWidth: '760px' }}>
                          <div>Score: <strong>{fmt(score)}</strong> (band {band}, {BAND_WORDS[band ?? 0]})</div>
                          {cols.map((c) => (
                            <div key={c.key}>{c.label}: <strong>{fmt(view === 'area' ? r.topics[c.key] : r.services[c.key])}</strong></div>
                          ))}
                          {view === 'services' && <div>In its group: <strong>{r.peer ? `${ordinal(r.peer.rank)} of ${r.peer.of}` : 'n/a'}</strong></div>}
                        </div>
                        {(() => {
                          // What is behind the position: highest and lowest scores, from the same figures.
                          if (view === 'area') {
                            const { high, low } = r.extremes;
                            if (!high.length) return null;
                            return (
                              <div style={{ margin: '8px 0 0', maxWidth: '46em', lineHeight: 1.6 }}>
                                <div><strong>Highest scores:</strong> {high.map(extremeText).join('; ')}.</div>
                                {low.length > 0 && <div><strong>Lowest scores:</strong> {low.map(extremeText).join('; ')}.</div>}
                              </div>
                            );
                          }
                          const sp = cols
                            .map((c) => ({ label: c.label, score: r.services[c.key] }))
                            .filter((x): x is { label: string; score: number } => x.score != null)
                            .sort((a, b) => b.score - a.score);
                          if (sp.length < 2) return null;
                          const top = sp[0];
                          const bottom = sp[sp.length - 1];
                          return (
                            <div style={{ margin: '8px 0 0', maxWidth: '46em', lineHeight: 1.6 }}>
                              <strong>Highest service score:</strong> {top.label}, {Math.round(top.score)}. <strong>Lowest:</strong> {bottom.label}, {Math.round(bottom.score)}.
                            </div>
                          );
                        })()}
                        <p style={{ margin: '8px 0 0', maxWidth: '46em', lineHeight: 1.6 }}>
                          {view === 'area'
                            ? <>Area rank {r.areaRank} of {rows.filter((x) => x.areaRank != null).length}{r.bandChanges != null && r.bandVersions ? `. In the weight test its band changed in ${r.bandChanges} of ${r.bandVersions} versions${r.nearBoundary ? ', so it is close to the edge of its band' : ''}` : ''}. Council services rank {r.servicesRank ?? 'n/a'}.</>
                            : <>Council services rank {r.servicesRank} of {rows.filter((x) => x.servicesRank != null).length}. Area rank {r.areaRank ?? 'n/a'}.</>}
                          {' '}{(() => {
                            const have = cols.filter((c) => (view === 'area' ? r.topics[c.key] : r.services[c.key]) != null);
                            const missing = cols.filter((c) => (view === 'area' ? r.topics[c.key] : r.services[c.key]) == null).map((c) => c.label);
                            return `Based on ${have.length} of ${cols.length} ${view === 'area' ? 'topics' : 'services'}${missing.length ? `; no figures for ${missing.join(', ')}` : ''}.`;
                          })()}
                          {' '}Scores run from 0 (lowest of all areas) to 100 (highest).
                          {r.href && <> <a href={r.href} style={{ color: INK }}>Council page</a>.</>}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {!q.trim() && list.length > FIRST && (
        <button type="button" onClick={() => setShowAll((v) => !v)} style={{ ...btn(false), marginTop: '12px' }}>
          {showAll ? `Show the first ${FIRST}` : `Show all ${list.length}`}
        </button>
      )}
    </section>
  );
}
