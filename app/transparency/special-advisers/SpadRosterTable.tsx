'use client';

// "All special advisers in post at ..." on /transparency/special-advisers (owner, 28 Oct 2026). The whole list is in
// the page's HTML in the Cabinet Office's order; in the browser it can be narrowed to one minister and sorted by
// salary band. ?minister=<MP id> (the link from an MP page) or ?minister=<title> opens it narrowed.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PhoneTable from '../../components/PhoneTable';
import { ministerShownName, salaryLabel, type SpadRow } from '@/lib/spad-display';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

const ministerKey = (r: SpadRow) => (r.minister_member_id != null ? String(r.minister_member_id) : r.minister_title);

export default function SpadRosterTable({ rows }: { rows: SpadRow[] }) {
  const [minister, setMinister] = useState('');
  const [sort, setSort] = useState<'list' | 'salary'>('list');
  const ministers = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (!m.has(ministerKey(r))) {
      const name = ministerShownName(r.minister_name);
      m.set(ministerKey(r), name ? `${name}: ${r.minister_title}` : r.minister_title);
    }
    return [...m];
  }, [rows]);
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('minister');
    // The page is statically cached, so the address is only known in the browser: read it once after loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (want && ministers.some(([k]) => k === want)) setMinister(want);
  }, [ministers]);

  const shown = useMemo(() => {
    const list = minister ? rows.filter((r) => ministerKey(r) === minister) : rows;
    if (sort === 'list') return list;
    return [...list].sort((a, b) => (b.salary_band_min ?? 0) - (a.salary_band_min ?? 0) || (b.pay_band ?? 0) - (a.pay_band ?? 0) || a.adviser_name.localeCompare(b.adviser_name));
  }, [rows, minister, sort]);

  const label: React.CSSProperties = { display: 'block', fontFamily: MONO, fontSize: '15px', marginBottom: '4px' };
  const button = (on: boolean): React.CSSProperties => ({ fontFamily: MONO, fontSize: '15px', padding: '6px 10px', border: `1px solid ${on ? ACCENT : INK}`, background: on ? ACCENT : 'transparent', color: on ? '#f4efe6' : INK, cursor: 'pointer' });
  const th: React.CSSProperties = { padding: '8px 6px', fontSize: '15px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 'bold', textAlign: 'left', verticalAlign: 'bottom' };
  const td: React.CSSProperties = { padding: '8px 6px', fontSize: '15px', verticalAlign: 'top' };

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', alignItems: 'flex-end', margin: '0 0 12px' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <label htmlFor="spad-minister" style={label}>Show the advisers of</label>
          <select id="spad-minister" value={minister} onChange={(e) => setMinister(e.target.value)}
            style={{ width: '100%', maxWidth: '100%', fontFamily: MONO, fontSize: '15px', padding: '7px 8px', border: `1px solid ${INK}`, background: '#f4e8d4', color: INK }}>
            <option value="">Every minister ({rows.length} appointments)</option>
            {ministers.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div role="group" aria-label="Order" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button type="button" aria-pressed={sort === 'list'} onClick={() => setSort('list')} style={button(sort === 'list')}>By minister</button>
          <button type="button" aria-pressed={sort === 'salary'} onClick={() => setSort('salary')} style={button(sort === 'salary')}>Highest salary band first</button>
        </div>
      </div>
      <p aria-live="polite" style={{ fontFamily: MONO, fontSize: '15px', margin: '0 0 8px' }}>
        Showing {shown.length} of {rows.length} appointments{minister ? ' for this minister' : ''}.
      </p>
      <PhoneTable>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}` }}>
              <th style={th}>Special adviser</th>
              <th style={th}>Appointing minister</th>
              <th style={th}>Pay band</th>
              <th style={th}>Salary band</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const name = ministerShownName(r.minister_name);
              return (
                <tr key={`${r.adviser_name}|${r.minister_title}`} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                  <td style={{ ...td, fontWeight: 'bold', minWidth: '9em' }}>{r.adviser_name}</td>
                  <td style={{ ...td, minWidth: '14em' }}>
                    {name && (r.minister_member_id != null
                      ? <Link href={`/mps/${r.minister_member_id}`} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px', fontWeight: 'bold' }}>{name}</Link>
                      : <span style={{ fontWeight: 'bold' }}>{name}</span>)}
                    <span style={{ display: 'block' }}>{r.minister_title}</span>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>{r.pay_band ?? 'n/a'}</td>
                  <td style={{ ...td, minWidth: '9em' }}>{salaryLabel(r)}</td>
                  <td style={{ ...td, minWidth: '10em', fontStyle: r.notes.length ? 'italic' : 'normal' }}>{r.notes.join('; ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PhoneTable>
    </>
  );
}
