'use client';

// "All special advisers in post at ..." on /transparency/special-advisers (owner, 28 Oct 2026). The whole list is in
// the page's HTML in the Cabinet Office's order; in the browser it can be narrowed to one minister or to advisers with
// a recusal, and sorted by salary band. ?minister=<MP id> (the link from an MP page) or ?minister=<title> opens it
// narrowed. Each adviser with official background has a button that opens a panel under their row: declared
// interests word for word (recusals first), the ministers they advised in each yearly list, and ACOBA advice, every
// item linked to its source.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import PhoneTable from '../../components/PhoneTable';
import { historyLine, leftLabel, longDate, ministerShownName, salaryLabel, type SpadBackground, type SpadMinisterInfo, type SpadRow } from '@/lib/spad-display';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

const ministerKey = (r: SpadRow) => (r.minister_member_id != null ? String(r.minister_member_id) : r.minister_title);
const rowKey = (r: SpadRow) => `${r.adviser_name}|${r.minister_title}`;
const linkStyle: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };
const CATEGORY_LABEL: Record<string, string> = {
  recusal: 'Recusal', 'paid role': 'Paid role', 'unpaid role': 'Unpaid role', 'directorship or trusteeship': 'Directorship or trusteeship',
  'family or partner': 'Family or partner', other: 'Other interest',
};

function BackgroundPanel({ name, bg }: { name: string; bg: SpadBackground }) {
  const h3: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '10px 0 6px' };
  return (
    // On a phone the table scrolls sideways inside its box; the panel stays at the box's left edge and as wide as the
    // box (100cqw: the wrapper around PhoneTable is a size container), so it reads without scrolling.
    <div style={{ position: 'sticky', left: 0, boxSizing: 'border-box', width: 'min(72ch, calc(100cqw - 12px))', padding: '6px 4px 12px', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
      {bg.interests.length > 0 && (
        <>
          <h3 style={{ ...h3, marginTop: 0 }}>Declared interests of {name}</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {bg.interests.map((i) => (
              <li key={`${i.department}|${i.period}|${i.entry_text}`} style={{ padding: '6px 0', borderBottom: `1px solid ${HAIRLINE}` }}>
                <span style={{ display: 'block', fontWeight: 'bold', textTransform: i.is_recusal ? 'uppercase' : 'none', letterSpacing: i.is_recusal ? '0.06em' : 0 }}>
                  {CATEGORY_LABEL[i.category] ?? i.category} · {i.department}, {i.period}{i.end_date_text ? ` (${i.end_date_text})` : ''}
                </span>
                <q style={{ display: 'block', margin: '2px 0' }}>{i.entry_text}</q>
                <a href={i.source_url} rel="noopener" style={linkStyle}>{i.source_title}{i.source_page ? `, page ${i.source_page} of the PDF` : ''}</a>
              </li>
            ))}
          </ul>
        </>
      )}
      {bg.history.length > 0 && (
        <>
          <h3 style={h3}>Advised (Cabinet Office yearly lists, in post at 31 March)</h3>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            {bg.history.map((h) => (
              <li key={`${h.title}|${h.from}`} style={{ padding: '2px 0' }}>
                {historyLine(h)} (<a href={h.source_url} rel="noopener" style={linkStyle}>list</a>)
              </li>
            ))}
          </ul>
        </>
      )}
      {bg.posts.length > 0 && (
        <>
          <h3 style={h3}>Jobs after government: ACOBA advice</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {bg.posts.map((p) => (
              <li key={p.source_url} style={{ padding: '6px 0', borderBottom: `1px solid ${HAIRLINE}` }}>
                <span style={{ display: 'block', fontWeight: 'bold' }}>{p.new_role ? `${p.new_role}, ` : ''}{p.new_employer}</span>
                <span style={{ display: 'block' }}>Former role: {p.former_department}. Advice published {longDate(p.advice_date)}.</span>
                {p.conditions_text && (
                  <ul style={{ margin: '4px 0', paddingLeft: '18px' }}>
                    {p.conditions_text.split('\n').map((c) => <li key={c}><q>{c}</q></li>)}
                  </ul>
                )}
                <a href={p.source_url} rel="noopener" style={linkStyle}>ACOBA advice letter on GOV.UK</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function SpadRosterTable({ rows, background = {}, ministerInfo = {}, asAtLabel = '31 March 2026', idPrefix = 'a' }: {
  rows: SpadRow[]; background?: Record<string, SpadBackground>; ministerInfo?: Record<string, SpadMinisterInfo>; asAtLabel?: string; idPrefix?: string;
}) {
  // The minister as we show them: the list's name, or the Members API's where the list gives none.
  const shownName = (r: SpadRow) => ministerShownName(r.minister_name) ?? ministerInfo[r.minister_title]?.api_name ?? null;
  const left = (r: SpadRow) => ministerInfo[r.minister_title]?.left_on ?? null;
  const [minister, setMinister] = useState('');
  const [sort, setSort] = useState<'list' | 'salary'>('list');
  const [recusalsOnly, setRecusalsOnly] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const ministers = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (!m.has(ministerKey(r))) {
      const name = shownName(r);
      const gone = left(r);
      m.set(ministerKey(r), `${name ? `${name}: ` : ''}${r.minister_title}${gone ? ` ${leftLabel(gone)}` : ''}`);
    }
    return [...m];
  }, [rows, ministerInfo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('minister');
    // The page is statically cached, so the address is only known in the browser: read it once after loading.
    if (want && ministers.some(([k]) => k === want)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMinister(want);
      // A minister who has since left is in the folded group: open it and bring the table into view.
      const fold = rootRef.current?.closest('details');
      if (fold && !fold.open) { fold.open = true; rootRef.current?.scrollIntoView({ block: 'start' }); }
    }
  }, [ministers]);

  const hasRecusal = (r: SpadRow) => (background[r.adviser_name]?.interests ?? []).some((i) => i.is_recusal);
  const withRecusals = useMemo(() => new Set(rows.filter(hasRecusal).map((r) => r.adviser_name)).size, [rows, background]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(() => {
    let list = minister ? rows.filter((r) => ministerKey(r) === minister) : rows;
    if (recusalsOnly) list = list.filter(hasRecusal);
    if (sort === 'list') return list;
    return [...list].sort((a, b) => (b.salary_band_min ?? 0) - (a.salary_band_min ?? 0) || (b.pay_band ?? 0) - (a.pay_band ?? 0) || a.adviser_name.localeCompare(b.adviser_name));
  }, [rows, minister, sort, recusalsOnly, background]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const label: React.CSSProperties = { display: 'block', fontFamily: MONO, fontSize: '15px', marginBottom: '4px' };
  const button = (on: boolean): React.CSSProperties => ({ fontFamily: MONO, fontSize: '15px', padding: '6px 10px', border: `1px solid ${on ? ACCENT : INK}`, background: on ? ACCENT : 'transparent', color: on ? '#f4efe6' : INK, cursor: 'pointer' });
  const th: React.CSSProperties = { padding: '8px 6px', fontSize: '15px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 'bold', textAlign: 'left', verticalAlign: 'bottom' };
  const td: React.CSSProperties = { padding: '8px 6px', fontSize: '15px', verticalAlign: 'top' };
  const marker: React.CSSProperties = { display: 'inline-block', marginTop: '4px', fontFamily: MONO, fontSize: '15px', fontWeight: 'normal', padding: '2px 6px', border: `1px solid ${ACCENT}`, background: 'transparent', color: ACCENT, cursor: 'pointer', textAlign: 'left' };

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', alignItems: 'flex-end', margin: '0 0 12px' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <label htmlFor={`spad-minister-${idPrefix}`} style={label}>Show the advisers of</label>
          <select id={`spad-minister-${idPrefix}`} value={minister} onChange={(e) => setMinister(e.target.value)}
            style={{ width: '100%', maxWidth: '100%', fontFamily: MONO, fontSize: '15px', padding: '7px 8px', border: `1px solid ${INK}`, background: '#f4e8d4', color: INK }}>
            <option value="">Every minister ({rows.length} appointments)</option>
            {ministers.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div role="group" aria-label="Order" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button type="button" aria-pressed={sort === 'list'} onClick={() => setSort('list')} style={button(sort === 'list')}>By minister</button>
          <button type="button" aria-pressed={sort === 'salary'} onClick={() => setSort('salary')} style={button(sort === 'salary')}>Highest salary band first</button>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: MONO, fontSize: '15px', cursor: 'pointer' }}>
          <input type="checkbox" checked={recusalsOnly} onChange={(e) => setRecusalsOnly(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: ACCENT }} />
          Advisers with recusals ({withRecusals})
        </label>
      </div>
      <p aria-live="polite" style={{ fontFamily: MONO, fontSize: '15px', margin: '0 0 8px' }}>
        Showing {shown.length} of {rows.length} appointments{minister ? ' for this minister' : ''}{recusalsOnly ? ', advisers with a recusal only' : ''}.
      </p>
      <div ref={rootRef} style={{ containerType: 'inline-size' }}>
      <PhoneTable>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}` }}>
              <th style={th}>Special adviser</th>
              <th style={th}>Appointing minister at {asAtLabel}</th>
              <th style={th}>Pay band</th>
              <th style={th}>Salary band</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const name = shownName(r);
              const gone = left(r);
              const bg = background[r.adviser_name];
              const k = rowKey(r);
              const hasInterests = (bg?.interests.length ?? 0) > 0;
              const hasMore = !!bg && (hasInterests || bg.posts.length > 0 || bg.history.length > 1);
              const isOpen = open.has(k);
              const panelId = `spad-bg-${idPrefix}-${k.replace(/[^A-Za-z0-9]+/g, '-')}`;
              return (
                <Fragment key={k}>
                  <tr style={{ borderBottom: isOpen ? 0 : `1px solid ${HAIRLINE}` }}>
                    <td style={{ ...td, fontWeight: 'bold', minWidth: '9em' }}>
                      {r.adviser_name}
                      {hasMore && (
                        <button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(k)} style={{ ...marker, display: 'block' }}>
                          {hasInterests ? `Declared interests (${bg!.interests.length})` : 'Background'} {isOpen ? '▴' : '▾'}
                        </button>
                      )}
                    </td>
                    <td style={{ ...td, minWidth: '14em' }}>
                      {name && (r.minister_member_id != null
                        ? <Link href={`/mps/${r.minister_member_id}`} style={{ ...linkStyle, fontWeight: 'bold' }}>{name}</Link>
                        : <span style={{ fontWeight: 'bold' }}>{name}</span>)}
                      {gone && <span> {leftLabel(gone)}</span>}
                      {!r.minister_name && name && <span style={{ display: 'block', fontStyle: 'italic' }}>Name from the Members API; the list gives none.</span>}
                      <span style={{ display: 'block' }}>{r.minister_title}</span>
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>{r.pay_band ?? 'n/a'}</td>
                    <td style={{ ...td, minWidth: '9em' }}>{salaryLabel(r)}</td>
                    <td style={{ ...td, minWidth: '10em', fontStyle: r.notes.length ? 'italic' : 'normal' }}>{r.notes.join('; ')}</td>
                  </tr>
                  {hasMore && isOpen && (
                    <tr id={panelId} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                      <td colSpan={5} style={{ ...td, paddingTop: 0 }}><BackgroundPanel name={r.adviser_name} bg={bg!} /></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </PhoneTable>
      </div>
    </>
  );
}
