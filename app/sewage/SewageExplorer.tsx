'use client';

// Postcode search and sortable league tables for /sewage. Every area's figures
// arrive as props from the server page (a few hundred rows), so sorting and
// the postcode result need no further database calls; the postcode search
// only asks /api/sewage/lookup which council area and constituency a postcode
// is in.

import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';

export type ExplorerRow = {
  code: string;
  name: string;
  href: string | null;
  overflows: number;
  withData: number;
  spilled: number;
  spills: number;
  hours: number;
  companies: string[];
};

export type ExplorerTable = { id: string; label: string; nation: string; year: number; rows: ExplorerRow[]; areaWord: string };

type SortKey = 'hours' | 'avg' | 'share' | 'spills';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';
const MIN_FOR_AVERAGES = 10;
const FIRST = 50;

const fmtInt = (v: number) => Math.round(v).toLocaleString('en-GB');
const ordinal = (k: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = k % 100;
  return `${k}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const avg = (r: ExplorerRow) => (r.overflows ? r.hours / r.overflows : 0);
const share = (r: ExplorerRow) => (r.overflows ? (r.spilled / r.overflows) * 100 : 0);

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'hours', label: 'Total hours' },
  { key: 'avg', label: 'Average hours per overflow' },
  { key: 'share', label: 'Share of overflows that spilled' },
  { key: 'spills', label: 'Spills counted' },
];

const btn = (on: boolean): CSSProperties => ({
  fontFamily: MONO, fontSize: '14px', padding: '6px 10px', margin: '0 8px 8px 0', cursor: 'pointer',
  background: on ? INK : 'transparent', color: on ? '#f4efe6' : INK, border: `1px solid ${INK}`, borderRadius: 0,
});

function hoursRank(rows: ExplorerRow[], code: string): { rank: number; of: number } | null {
  const sorted = [...rows].sort((a, b) => b.hours - a.hours);
  const i = sorted.findIndex((r) => r.code === code);
  if (i < 0) return null;
  const rank = sorted.findIndex((r) => r.hours === sorted[i].hours) + 1;
  return { rank, of: sorted.length };
}

type Lookup = { postcode: string; councilCode: string | null; councilName: string | null; constituencyCode: string | null; constituencyName: string | null };

export default function SewageExplorer({ tables }: { tables: ExplorerTable[] }) {
  const [tableId, setTableId] = useState(tables[0]?.id ?? '');
  const [sort, setSort] = useState<SortKey>('hours');
  const [showAll, setShowAll] = useState(false);
  const [postcode, setPostcode] = useState('');
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const table = tables.find((t) => t.id === tableId) ?? tables[0];

  const rows = useMemo(() => {
    if (!table) return [];
    const eligible = sort === 'avg' || sort === 'share' ? table.rows.filter((r) => r.overflows >= MIN_FOR_AVERAGES) : table.rows;
    const value = (r: ExplorerRow) => (sort === 'hours' ? r.hours : sort === 'avg' ? avg(r) : sort === 'share' ? share(r) : r.spills);
    return [...eligible].sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name));
  }, [table, sort]);
  const excluded = table ? table.rows.length - rows.length : 0;
  const visible = showAll ? rows : rows.slice(0, FIRST);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setLookupError(null); setLookup(null);
    try {
      const r = await fetch(`/api/sewage/lookup?postcode=${encodeURIComponent(postcode)}`);
      const j = await r.json();
      if (!r.ok) setLookupError(j?.message || 'Lookup failed. Please try again.');
      else setLookup(j as Lookup);
    } catch {
      setLookupError('Lookup is unavailable right now. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const find = (kind: 'council' | 'constituency', code: string | null) => {
    if (!code) return null;
    for (const t of tables) {
      if ((kind === 'council' && !t.id.includes('council')) || (kind === 'constituency' && !t.id.includes('constituency'))) continue;
      if (t.id.includes('county')) continue;
      const row = t.rows.find((r) => r.code === code);
      if (row) return { row, table: t, rank: hoursRank(t.rows, code) };
    }
    return null;
  };

  const resultLine = (kind: 'council' | 'constituency', code: string | null, name: string | null) => {
    const label = kind === 'council' ? 'Council area' : 'Constituency';
    const hit = find(kind, code);
    if (hit) {
      return (
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 8px' }}>
          <strong>{label}: {hit.row.href ? <a href={hit.row.href} style={{ color: INK }}>{hit.row.name}</a> : hit.row.name}</strong>
          <br />
          {fmtInt(hit.row.hours)} hours of spills from {fmtInt(hit.row.overflows)} storm overflow{hit.row.overflows === 1 ? '' : 's'} in {hit.table.year}
          {hit.rank && <> · {ordinal(hit.rank.rank)} most of {hit.rank.of} {hit.table.areaWord}</>}
          <br />
          Water compan{hit.row.companies.length === 1 ? 'y' : 'ies'}: {hit.row.companies.join(', ')}
        </p>
      );
    }
    const msg = code && /^[WS]/.test(code)
      ? 'figures for Wales and Scotland are not on Open Govt yet.'
      : code ? 'no storm overflows are listed in this area.' : 'not found for this postcode.';
    return <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 8px' }}><strong>{label}{name ? `: ${name}` : ''}</strong> — {msg}</p>;
  };

  const th: CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', whiteSpace: 'nowrap' };
  const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, verticalAlign: 'top' };
  const tdNum: CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
  const sortedHead = (key: SortKey, text: string) => (
    <th style={{ ...th, textAlign: 'right', color: sort === key ? ACCENT : INK }}>{text}{sort === key ? ' ▼' : ''}</th>
  );

  return (
    <div>
      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
          Your area
        </h2>
        <form onSubmit={onSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <label htmlFor="sewage-postcode" style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>Postcode</label>
          <input
            id="sewage-postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            autoComplete="postal-code"
            placeholder="e.g. TR27 6LA"
            style={{ fontFamily: MONO, fontSize: '15px', padding: '6px 8px', border: `1px solid ${INK}`, background: 'transparent', color: INK, width: '11em' }}
          />
          <button type="submit" disabled={busy || !postcode.trim()} style={btn(true)}>{busy ? 'Looking up…' : 'Find'}</button>
        </form>
        {lookupError && <p style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, margin: '0 0 8px' }}>{lookupError}</p>}
        {lookup && (
          <div>
            {resultLine('council', lookup.councilCode, lookup.councilName)}
            {resultLine('constituency', lookup.constituencyCode, lookup.constituencyName)}
          </div>
        )}
      </section>

      <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
        <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
          League tables: most sewage spills
        </h2>
        <div role="tablist" aria-label="Choose a table" style={{ marginBottom: '6px' }}>
          {tables.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === table?.id} onClick={() => { setTableId(t.id); setShowAll(false); }} style={btn(t.id === table?.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div aria-label="Sort by" style={{ marginBottom: '10px' }}>
          <span style={{ fontFamily: MONO, fontSize: '14px', color: INK, marginRight: '8px' }}>Sort by:</span>
          {SORTS.map((s) => (
            <button key={s.key} type="button" aria-pressed={sort === s.key} onClick={() => { setSort(s.key); setShowAll(false); }} style={btn(sort === s.key)}>
              {s.label}
            </button>
          ))}
        </div>
        {table && (
          <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: '0 0 10px' }}>
            {table.nation}, {table.year}. {fmtInt(table.rows.length)} {table.areaWord}.
            {excluded > 0 && ` Averages and shares rank only areas with at least ${MIN_FOR_AVERAGES} overflows, so ${fmtInt(excluded)} smaller area${excluded === 1 ? ' is' : 's are'} left out of this view.`}
          </p>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, width: '100%', minWidth: '640px' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'right' }}>#</th>
                <th style={th}>Area</th>
                {sortedHead('hours', 'Hours')}
                {sortedHead('spills', 'Spills')}
                <th style={{ ...th, textAlign: 'right' }}>Overflows</th>
                {sortedHead('avg', 'Hours per overflow')}
                {sortedHead('share', 'Spilled')}
                <th style={th}>Water company</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={r.code}>
                  <td style={tdNum}>{i + 1}</td>
                  <td style={td}>{r.href ? <a href={r.href} style={{ color: INK }}>{r.name}</a> : r.name}</td>
                  <td style={tdNum}>{fmtInt(r.hours)}</td>
                  <td style={tdNum}>{fmtInt(r.spills)}</td>
                  <td style={tdNum}>{fmtInt(r.overflows)}</td>
                  <td style={tdNum}>{fmtInt(avg(r))}</td>
                  <td style={tdNum}>{Math.round(share(r))}%</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.companies.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > FIRST && (
          <button type="button" onClick={() => setShowAll((v) => !v)} style={{ ...btn(false), marginTop: '12px' }}>
            {showAll ? `Show the first ${FIRST}` : `Show all ${fmtInt(rows.length)}`}
          </button>
        )}
      </section>
    </div>
  );
}
