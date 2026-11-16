'use client';
// "Where the recommendations stand" (ENTRY 140): the count of each status for today's date in London. Each row's
// status comes in its stored form and, for a target still to come, with its month and the status once that month is
// over; the first render uses the day the page was rendered, then the browser's day (useToday).
import { monthPassed } from '@/lib/london-date';
import { useToday } from '../components/useToday';

export type DatedKey = [string] | [string, string, string]; // [stored status] or [stored status, target month, status once passed]

export default function RecStatusSummary({ statuses, order, labels, renderedOn }: { statuses: DatedKey[]; order: string[]; labels: Record<string, string>; renderedOn: string }) {
  const today = useToday(renderedOn);
  const counts = new Map<string, number>();
  for (const d of statuses) {
    const k = d.length === 3 && monthPassed(d[1], today) ? d[2] : d[0];
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const rows = order.filter((k) => counts.get(k));
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxWidth: '40em' }}>
      {rows.map((k) => (
        <li key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: '1px dotted rgba(20,16,13,0.2)', padding: '6px 0', fontSize: '16px' }}>
          <span>{labels[k]}</span>
          <span style={{ fontWeight: 600 }}>{(counts.get(k) ?? 0).toLocaleString('en-GB')}</span>
        </li>
      ))}
      <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', fontSize: '16px', fontWeight: 700 }}>
        <span>Total</span>
        <span>{statuses.length.toLocaleString('en-GB')}</span>
      </li>
    </ul>
  );
}
