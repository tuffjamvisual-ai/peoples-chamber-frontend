'use client';
// The /councils/child-poverty table: sortable by any figure column, with a box to find a council (each typed word matches
// the start of a word in its name, any order: lib/search/words.ts, as on /reports). Rendered on the server in the order of
// the headline figure (after housing costs, highest first); sorting and the search box need JavaScript. While a search
// is typed every match shows (no "Show more").
import { useState } from 'react';
import Link from 'next/link';
import NoJsPager from '@/app/components/NoJsPager';
import { wordsOf, anyWordMatches } from '@/lib/search/words';

export type PovertyTableRow = {
  code: string; name: string; slug: string; county: boolean;
  ahcPct: number | null; bhcPct: number | null; ahcCount: number | null; change: number | null;
};
type SortKey = 'ahc' | 'bhc' | 'count' | 'change' | 'name';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const MONO = 'var(--font-special-elite), monospace';
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', verticalAlign: 'bottom' };
const td: React.CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}` };
const tdNum: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
const btn: React.CSSProperties = { font: 'inherit', color: INK, background: 'none', border: 0, padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', textAlign: 'inherit' };

const pct = (p: number | null) => (p == null ? 'not published' : `${p.toFixed(1)}%`);
const num = (n: number | null) => (n == null ? 'not published' : Math.round(n).toLocaleString('en-GB'));
const pp = (d: number | null) => (d == null ? 'not published' : d === 0 ? 'no change' : `${d > 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(1)}`);

export default function ChildPovertyTable({ rows, changeLabel }: { rows: PovertyTableRow[]; changeLabel: string }) {
  const [sort, setSort] = useState<SortKey>('ahc');
  const [desc, setDesc] = useState(true);
  const [q, setQ] = useState('');
  const val = (r: PovertyTableRow): number | null => (sort === 'ahc' ? r.ahcPct : sort === 'bhc' ? r.bhcPct : sort === 'count' ? r.ahcCount : sort === 'change' ? r.change : null);
  // Ranks always follow the headline figure, whatever the sort; equal figures share a rank.
  const byAhc = [...rows].sort((a, b) => (b.ahcPct ?? -1) - (a.ahcPct ?? -1) || a.name.localeCompare(b.name));
  const rank = new Map<string, number>();
  byAhc.forEach((r, i) => { if (r.ahcPct != null) rank.set(r.code, i > 0 && byAhc[i - 1].ahcPct === r.ahcPct ? rank.get(byAhc[i - 1].code)! : i + 1); });
  const sorted = sort === 'name'
    ? [...rows].sort((a, b) => (desc ? -1 : 1) * a.name.localeCompare(b.name))
    : [...rows].sort((a, b) => {
      const x = val(a), y = val(b);
      if (x == null || y == null) return x == null && y == null ? a.name.localeCompare(b.name) : x == null ? 1 : -1;
      return (desc ? y - x : x - y) || a.name.localeCompare(b.name);
    });
  const typed = wordsOf(q);
  const shown = typed.length ? sorted.filter((r) => { const w = wordsOf(r.name); return typed.every((t) => anyWordMatches(t, w)); }) : sorted;
  const by = (k: SortKey) => () => { if (k === sort) setDesc(!desc); else { setSort(k); setDesc(k !== 'name'); } };
  const aria = (k: SortKey) => (k === sort ? (desc ? 'descending' : 'ascending') : 'none') as 'descending' | 'ascending' | 'none';
  const arrow = (k: SortKey) => (k === sort ? (desc ? ' ↓' : ' ↑') : '');

  const table = (
    <table className="pt-cards" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%' }}>
      <thead>
        <tr>
          <th style={th}>Rank</th>
          <th style={th} aria-sort={aria('name')}><button type="button" style={btn} onClick={by('name')}>Council{arrow('name')}</button></th>
          <th style={{ ...th, textAlign: 'right' }} aria-sort={aria('ahc')}><button type="button" style={btn} onClick={by('ahc')}>After housing costs{arrow('ahc')}</button></th>
          <th style={{ ...th, textAlign: 'right' }} aria-sort={aria('bhc')}><button type="button" style={btn} onClick={by('bhc')}>Before housing costs{arrow('bhc')}</button></th>
          <th style={{ ...th, textAlign: 'right' }} aria-sort={aria('count')}><button type="button" style={btn} onClick={by('count')}>Children, after housing costs{arrow('count')}</button></th>
          <th style={{ ...th, textAlign: 'right' }} aria-sort={aria('change')}><button type="button" style={btn} onClick={by('change')}>{changeLabel}{arrow('change')}</button></th>
        </tr>
      </thead>
      <tbody>
        {shown.map((r) => (
          <tr key={r.code}>
            <td data-label="Rank" style={td}>{rank.get(r.code) ?? 'not ranked'}</td>
            <td data-label="" className="pt-card-title" style={td}>
              <Link href={`/councils/${r.slug}#work`} style={{ color: INK }}>{r.name}</Link>{r.county ? ' (county, its districts added up)' : ''}
            </td>
            <td data-label="After housing costs" style={tdNum}>{pct(r.ahcPct)}</td>
            <td data-label="Before housing costs" style={tdNum}>{pct(r.bhcPct)}</td>
            <td data-label="Children, after housing costs" style={tdNum}>{num(r.ahcCount)}</td>
            <td data-label={changeLabel} style={tdNum}>{pp(r.change)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <label style={{ display: 'block', fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }} htmlFor="cpov-q">Find a council</label>
      <input id="cpov-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="Council name"
        style={{ fontFamily: MONO, fontSize: '16px', color: INK, background: 'transparent', border: `1px solid ${INK}`, padding: '10px 12px', minHeight: '44px', width: '100%', maxWidth: '26em', boxSizing: 'border-box', margin: '0 0 12px' }} />
      {typed.length > 0 && (
        <p aria-live="polite" style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 10px' }}>
          {shown.length === 0 ? 'No council matches that.' : `${shown.length} ${shown.length === 1 ? 'council matches' : 'councils match'}.`}
        </p>
      )}
      {/* Every match shows while a search is typed; otherwise 3 then Show 10 more on phones and tablets, whole from 1,024px. */}
      {typed.length ? table : <NoJsPager id="cpov" count={shown.length} rows="> tbody > tr" size={15}>{table}</NoJsPager>}
    </>
  );
}
