'use client';

// Postcode search and sortable league tables for /sewage. Every area's figures
// arrive as props from the server page (a few hundred rows), so sorting and
// the postcode result need no further database calls; the postcode search
// only asks /api/sewage/lookup which council area and constituency a postcode
// is in.
//
// Shareable links: the chosen table, sort order and postcode result are kept in
// the address (?table=…&sort=…&council=…&constituency=…#your-area). Only the
// area codes go in the link, never the postcode itself.

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import PhoneTable from '../components/PhoneTable';

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

// No per-overflow average (owner's rule, 19 Oct 2026: no "per X" figures).
type SortKey = 'hours' | 'share' | 'spills';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const MIN_FOR_AVERAGES = 10;
const FIRST = 50;

const fmtInt = (v: number) => Math.round(v).toLocaleString('en-GB');
const ordinal = (k: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = k % 100;
  return `${k}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
// Shares use only overflows with figures for the year, so an
// overflow with no monitoring data does not count as "didn't spill".
const share = (r: ExplorerRow) => (r.withData ? (r.spilled / r.withData) * 100 : 0);

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'hours', label: 'Total hours' },
  { key: 'share', label: 'Share of overflows that spilled' },
  { key: 'spills', label: 'Spills counted' },
];

const btn = (on: boolean): CSSProperties => ({
  fontFamily: MONO, fontSize: '14px', padding: '6px 10px', margin: '0 8px 8px 0', cursor: 'pointer',
  background: on ? INK : 'transparent', color: on ? '#f4efe6' : INK, border: `1px solid ${INK}`, borderRadius: 0,
});

const GSS = /^[ENSW]\d{8}$/;

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
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);

  // Read a shared link once, on first load.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get('table');
    if (t && tables.some((x) => x.id === t)) setTableId(t);
    const so = q.get('sort');
    if (so && SORTS.some((x) => x.key === so)) setSort(so as SortKey);
    const council = q.get('council');
    const constituency = q.get('constituency');
    const cc = council && GSS.test(council) ? council : null;
    const pc = constituency && GSS.test(constituency) ? constituency : null;
    if (cc || pc) {
      const nameOf = (code: string | null) => (code ? tables.flatMap((x) => x.rows).find((r) => r.code === code)?.name ?? null : null);
      setLookup({ postcode: '', councilCode: cc, councilName: nameOf(cc), constituencyCode: pc, constituencyName: nameOf(pc) });
      if (window.location.hash === '#your-area') document.getElementById('your-area')?.scrollIntoView();
    }
    setReady(true);
  }, [tables]);

  // Keep the address in step with what is on screen, so it can be copied and shared.
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams();
    if (tableId && tableId !== tables[0]?.id) q.set('table', tableId);
    if (sort !== 'hours') q.set('sort', sort);
    if (lookup?.councilCode) q.set('council', lookup.councilCode);
    if (lookup?.constituencyCode) q.set('constituency', lookup.constituencyCode);
    const qs = q.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${lookup ? '#your-area' : ''}`;
    window.history.replaceState(null, '', url);
    setCopied(null);
  }, [ready, tableId, sort, lookup, tables]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('yes');
    } catch {
      setCopied('no');
    }
  }

  const table = tables.find((t) => t.id === tableId) ?? tables[0];

  const rows = useMemo(() => {
    if (!table) return [];
    const eligible = sort === 'share' ? table.rows.filter((r) => r.withData >= MIN_FOR_AVERAGES) : table.rows;
    const value = (r: ExplorerRow) => (sort === 'hours' ? r.hours : sort === 'share' ? share(r) : r.spills);
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
    const msg = code && /^W/.test(code)
      ? 'figures for Wales are not on Open Govt yet.'
      : code ? 'no storm overflows are listed in this area.' : 'not found for this postcode.';
    return <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 8px' }}><strong>{label}{name ? `: ${name}` : ''}</strong>: {msg}</p>;
  };

  const th: CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', whiteSpace: 'nowrap' };
  const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, verticalAlign: 'top' };
  const tdNum: CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
  const sortedHead = (key: SortKey, text: string) => (
    <th style={{ ...th, textAlign: 'right', color: sort === key ? ACCENT : INK }}>{text}{sort === key ? ' ▼' : ''}</th>
  );

  return (
    <div>
      <section id="your-area" style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
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
            <button type="button" onClick={copyLink} style={{ ...btn(false), marginTop: '6px' }}>Copy a link to this result</button>
            <span style={{ fontFamily: MONO, fontSize: '14px', color: INK }}>
              {copied === 'yes' && 'Link copied. It shows the council area and constituency, not your postcode.'}
              {copied === 'no' && 'Copy the address from your browser bar. It shows the council area and constituency, not your postcode.'}
              {copied === null && 'The link shows the council area and constituency, not your postcode.'}
            </span>
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
            {excluded > 0 && ` Shares rank only areas with figures for at least ${MIN_FOR_AVERAGES} overflows, so ${fmtInt(excluded)} smaller area${excluded === 1 ? ' is' : 's are'} left out of this view.`}
          </p>
        )}
        {/* Phones (report 47): the rank and area columns stay put while the figures scroll, with a hint when more are out of view. */}
        <PhoneTable sticky={2}>
          <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, width: '100%', minWidth: '640px' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'right' }}>#</th>
                <th style={th}>Area</th>
                {sortedHead('hours', 'Hours')}
                {sortedHead('spills', 'Spills')}
                <th style={{ ...th, textAlign: 'right' }}>Overflows</th>
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
                  <td style={tdNum}>{Math.round(share(r))}%</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.companies.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PhoneTable>
        {rows.length > FIRST && (
          <button type="button" onClick={() => setShowAll((v) => !v)} style={{ ...btn(false), marginTop: '12px' }}>
            {showAll ? `Show the first ${FIRST}` : `Show all ${fmtInt(rows.length)}`}
          </button>
        )}
      </section>
    </div>
  );
}
