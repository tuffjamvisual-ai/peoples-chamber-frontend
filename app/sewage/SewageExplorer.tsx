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

import NoJsPager from '@/app/components/NoJsPager';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import PhoneTable from '../components/PhoneTable';
import { phoneUpTo, wideFrom } from '@/lib/breakpoints';

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
import type { SortKey } from './table-ids';
export type { SortKey };

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const MIN_FOR_AVERAGES = 10;
const FIRST = 50;
// From 768px up the league table was wider than the screen below about 1100px, with its last column cut off, as long
// lists of water companies stayed on one line. Up to 1439px they now wrap, and anything still too wide scrolls inside the
// table's own box (owner, 4 Nov 2026). Phones keep PhoneTable's scrolling table; 1440px and wider are unchanged.
const LEAGUE_CSS = `@media ${wideFrom(768).split(', ').map((q) => `${q} and (max-width: 1439.98px)`).join(', ')} { .sew-league .pt-box { overflow-x: auto; } .sew-league table { min-width: 0 !important; } .sew-league td.sew-company { white-space: normal !important; } }`
  // Under 640px (owner, 4 Nov 2026) area cards replace the table, from the same rows, so tables and sort orders still apply.
  + ' .sew-cards { display: none; }'
  + ` @media ${phoneUpTo(639.98)} { .sew-league { display: none; } .sew-cards { display: block; list-style: none; margin: 0; padding: 0; }`
  // The seven table buttons in two columns on phones (step 5, 10 Nov 2026: seven full width buttons were 364px).
  + ' .sew-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .sew-tabs > button { margin: 0 !important; min-height: 44px; text-align: left; line-height: 1.25; }'
  + ' .sew-card { border-top: 1px solid rgba(20,16,13,0.25); } .sew-card:last-child { border-bottom: 1px solid rgba(20,16,13,0.25); }'
  + ' .sew-card summary { display: block; min-height: 44px; padding: 10px 26px 10px 0; position: relative; cursor: pointer; list-style: none; }'
  + ' .sew-card summary::-webkit-details-marker { display: none; }'
  + ' .card-mark { position: absolute; right: 4px; top: 10px; font-size: 20px; line-height: 1; color: #7a1612; }'
  + ' .card-mark::before { content: "+"; } .sew-card details[open] .card-mark::before { content: "\\2212"; } }'
  // Phones (UX2e, 10 Nov 2026): two labelled selectors, geography and measure, replace the ten buttons. A GET form, so it
  // works with JavaScript off (app/sewage/go sends it to that table's own cached page); with JavaScript on a change
  // applies at once and the Show button is not needed. From 640px up the buttons stay.
  // At every width (UX4e, 10 Nov 2026; phones since UX2e): the two selectors replace the buttons, side by side from 640px.
  + ' .sew-tabs, .sew-sorts { display: none !important; } .sew-pick { display: grid; grid-template-columns: 1fr 1fr auto; align-items: end; gap: 10px 16px; margin: 0 0 8px; }'
  + ' .sew-pick label { display: block; font-size: 15px; } .sew-pick select { display: block; width: 100%; min-height: 44px; margin-top: 4px; font-size: 16px; padding: 6px 8px; border: 1px solid #14100d; background: transparent; color: #14100d; border-radius: 0; }'
  + ' .sew-pick button { min-height: 44px; font-size: 16px; } html.og-js .sew-pick button { display: none; }'
  + ` @media ${phoneUpTo(639.98)} { .sew-pick { grid-template-columns: 1fr; } }`;

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
  fontFamily: MONO, fontSize: '15px', padding: '6px 10px', margin: '0 8px 8px 0', cursor: 'pointer',
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

export default function SewageExplorer({ tables, initialTable, initialSort = 'hours' }: { tables: ExplorerTable[]; initialTable?: string; initialSort?: SortKey }) {
  const [tableId, setTableId] = useState(initialTable && tables.some((t) => t.id === initialTable) ? initialTable : (tables[0]?.id ?? ''));
  const [sort, setSort] = useState<SortKey>(initialSort);
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
    // A shared link can only be read in the browser, so the state is set here, once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // Always /sewage: a table's own page (/sewage/t/…, for JavaScript off) is the same page with that table chosen.
    const url = `/sewage${qs ? `?${qs}` : ''}${lookup ? '#your-area' : ''}`;
    window.history.replaceState(null, '', url);
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      ? 'figures for Wales are not on opengovt yet.'
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
    <div className="sew-root">
      <section id="your-area" style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '16px', marginBottom: '8px' }}>
        {/* From 640px the heading sits on the same row as the form (UX4e, 10 Nov 2026). */}
        <style>{`.sew-area-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; } .sew-area-row > h2 { margin: 0 !important; } @media ${phoneUpTo(639.98)} { .sew-area-row { display: block; } .sew-area-row > h2 { margin: 0 0 14px !important; } }`}</style>
        <div className="sew-area-row">
        <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
          Your area
        </h2>
        <form onSubmit={onSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <label htmlFor="sewage-postcode" style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>Postcode</label>
          <input
            data-main-action
            id="sewage-postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            autoComplete="postal-code"
            placeholder="e.g. TR27 6LA"
            style={{ fontFamily: MONO, fontSize: '15px', padding: '6px 8px', border: `1px solid ${INK}`, background: 'transparent', color: INK, width: '11em' }}
          />
          <button type="submit" disabled={busy || !postcode.trim()} style={btn(true)}>{busy ? 'Looking up…' : 'Find'}</button>
        </form>
        </div>
        {lookupError && <p style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, margin: '0 0 8px' }}>{lookupError}</p>}
        {lookup && (
          <div>
            {resultLine('council', lookup.councilCode, lookup.councilName)}
            {resultLine('constituency', lookup.constituencyCode, lookup.constituencyName)}
            <button type="button" onClick={copyLink} style={{ ...btn(false), marginTop: '6px' }}>Copy a link to this result</button>
            <span style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>
              {copied === 'yes' && 'Link copied. It shows the council area and constituency, not your postcode.'}
              {copied === 'no' && 'Copy the address from your browser bar. It shows the council area and constituency, not your postcode.'}
              {copied === null && 'The link shows the council area and constituency, not your postcode.'}
            </span>
          </div>
        )}
      </section>

      <section id="league" className="sew-tables" style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '12px', marginBottom: '28px' }}>
        <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 8px' }}>
          League tables: most sewage spills
        </h2>
        <form method="get" action="/sewage/go" className="sew-pick" style={{ fontFamily: MONO, color: INK }} onSubmit={(e) => e.preventDefault()}>
          <label>
            Geography
            <select name="table" value={table?.id ?? ''} onChange={(e) => { setTableId(e.target.value); setShowAll(false); }}>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label>
            Measure
            <select name="sort" value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setShowAll(false); }}>
              {SORTS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
          </label>
          <button type="submit" style={btn(true)}>Show</button>
        </form>
        <div role="tablist" aria-label="Choose a table" className="sew-tabs" style={{ marginBottom: '10px' }}>
          {tables.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === table?.id} onClick={() => { setTableId(t.id); setShowAll(false); }} style={btn(t.id === table?.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div aria-label="Sort by" className="sew-sorts" style={{ marginBottom: '10px' }}>
          <span style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginRight: '8px' }}>Sort by:</span>
          {SORTS.map((s) => (
            <button key={s.key} type="button" aria-pressed={sort === s.key} onClick={() => { setSort(s.key); setShowAll(false); }} style={btn(sort === s.key)}>
              {s.label}
            </button>
          ))}
        </div>
        {table && (
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 10px' }}>
            {table.nation}, {table.year}. {fmtInt(table.rows.length)} {table.areaWord}.
            {excluded > 0 && ` Shares rank only areas with figures for at least ${MIN_FOR_AVERAGES} overflows, so ${fmtInt(excluded)} smaller area${excluded === 1 ? ' is' : 's are'} left out of this view.`}
          </p>
        )}
        {/* Phones (report 47): the rank and area columns stay put while the figures scroll, with a hint when more are out of view. */}
        <style>{LEAGUE_CSS}</style>
        <div className="sew-league">
        <PhoneTable sticky={2}>
          <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%', minWidth: '640px' }}>
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
                  <td className="sew-company" style={{ ...td, whiteSpace: 'nowrap' }}>{r.companies.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PhoneTable>
        </div>
        {/* Phones: the first 3, then "Show all" (step 5, 10 Nov 2026: page length). */}
        <NoJsPager id="sew-league" count={visible.length} rows="> li" size={25} first={3}>
        <ol className="sew-cards" style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>
          {visible.map((r, i) => (
            <li key={r.code} className="sew-card">
              <details>
                <summary>
                  <span aria-hidden className="card-mark" />
                  <span style={{ display: 'block', fontWeight: 'bold', fontSize: '16px', lineHeight: 1.3 }}>{i + 1}. {r.name}</span>
                  <span style={{ display: 'block', marginTop: '2px' }}>{fmtInt(r.hours)} hours · {fmtInt(r.spills)} spills</span>
                </summary>
                <div style={{ padding: '0 0 12px', lineHeight: 1.6 }}>
                  <div>{fmtInt(r.overflows)} overflow{r.overflows === 1 ? '' : 's'}</div>
                  <div>{Math.round(share(r))} per cent spilled</div>
                  <div>Water compan{r.companies.length === 1 ? 'y' : 'ies'}: {r.companies.join(', ')}</div>
                  {r.href && <a href={r.href} style={{ display: 'inline-block', padding: '10px 0', color: ACCENT }}>{r.name} council page</a>}
                </div>
              </details>
            </li>
          ))}
        </ol>
        </NoJsPager>
        {rows.length > FIRST && (
          <button type="button" onClick={() => setShowAll((v) => !v)} style={{ ...btn(false), marginTop: '12px' }}>
            {showAll ? `Show the first ${FIRST}` : `Show all ${fmtInt(rows.length)}`}
          </button>
        )}
      </section>
    </div>
  );
}
