'use client';
// The all-bodies FOI table, sortable by name, requests received, or answered within 20 working days (by the published
// percentage, then the count). Rendered on the server in name order; sorting needs JavaScript.
import { useState } from 'react';

export type FoiTableRow = {
  body: string;
  href: string | null;
  received: number | null;
  met: number | null;
  base: number | null;
  pct: number | null;
  late: number | null;
  granted: number | null;
  fullyWithheld: number | null;
  resolvable: number | null;
};
type SortKey = 'name' | 'received' | 'met';

const fmt = (n: number | null) => (n == null ? '-' : n.toLocaleString('en-GB'));
const of = (n: number | null, b: number | null) => (n == null || b == null ? '-' : `${fmt(n)} of ${fmt(b)}`);

export default function FoiTable({ rows }: { rows: FoiTableRow[] }) {
  const [sort, setSort] = useState<SortKey>('name');
  const [desc, setDesc] = useState(false);
  const sorted = [...rows].sort((a, b) => {
    let d = 0;
    if (sort === 'name') d = a.body.localeCompare(b.body);
    else if (sort === 'received') d = (a.received ?? -1) - (b.received ?? -1);
    else d = (a.pct ?? -1) - (b.pct ?? -1) || (a.met ?? -1) - (b.met ?? -1);
    return (desc ? -d : d) || a.body.localeCompare(b.body);
  });
  const by = (k: SortKey) => () => {
    if (k === sort) setDesc(!desc);
    else { setSort(k); setDesc(k !== 'name'); }
  };
  const arrow = (k: SortKey) => (k === sort ? (desc ? ' ↓' : ' ↑') : '');
  const th = 'text-left align-bottom py-2 pr-3 text-[13px] uppercase tracking-[0.12em] font-bold border-b-2 border-[#14100d]';
  const btn = 'underline underline-offset-2 text-left';
  const td = 'py-2 pr-3 align-top border-b border-[rgba(20,16,13,0.18)]';
  return (
    <div className="overflow-x-auto">
      <p className="text-[#14100d] text-[14px] mb-2">
        Sort by:{' '}
        <button type="button" onClick={by('name')} className={btn}>name{arrow('name')}</button>{' · '}
        <button type="button" onClick={by('received')} className={btn}>requests received{arrow('received')}</button>{' · '}
        <button type="button" onClick={by('met')} className={btn}>answered within 20 working days{arrow('met')}</button>
      </p>
      <table className="w-full text-[#14100d] text-[15px] border-collapse min-w-[640px]">
        <thead>
          <tr>
            <th className={th} aria-sort={sort === 'name' ? (desc ? 'descending' : 'ascending') : 'none'}>Body</th>
            <th className={th} aria-sort={sort === 'received' ? (desc ? 'descending' : 'ascending') : 'none'}>Requests received</th>
            <th className={th} aria-sort={sort === 'met' ? (desc ? 'descending' : 'ascending') : 'none'}>Answered within 20 working days</th>
            <th className={th}>Late</th>
            <th className={th}>Granted in full</th>
            <th className={th}>Fully withheld</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.body}>
              <td className={td}>{r.href ? <a href={r.href} className="underline underline-offset-2">{r.body}</a> : r.body}</td>
              <td className={td}>{fmt(r.received)}</td>
              <td className={td}>{of(r.met, r.base)}{r.pct != null ? ` (${Math.round(r.pct)}%)` : ''}</td>
              <td className={td}>{fmt(r.late)}</td>
              <td className={td}>{of(r.granted, r.resolvable)}</td>
              <td className={td}>{of(r.fullyWithheld, r.resolvable)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
