// Directions tab for a department page: the ministerial directions GOV.UK tags to this department,
// newest first. Shown only when there is at least one (as the Programmes tab is).
import Link from 'next/link';
import { type Direction, dateLine, ministerLine, letterLinks, departmentsAtTheTime } from '@/lib/ministerial-directions';

const ACCENT = '#7a1612';
const H2_CLS = 'text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold';

export function DirectionsSlot({ directions }: { directions: Direction[] }) {
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Ministerial directions ({directions.length})</h2>
      <p style={{ fontSize: '15px', lineHeight: 1.55, margin: '0 0 10px' }}>
        Spending the department&rsquo;s accounting officer objected to, and a minister ordered to go ahead.
      </p>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {directions.map((d) => (
          <li key={d.slug} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '10px 0' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.45, margin: 0 }}>{d.subject}</p>
            <p style={{ fontSize: '15px', margin: '3px 0 0', lineHeight: 1.5 }}>{dateLine(d)} · {ministerLine(d)}</p>
            <p style={{ fontSize: '15px', margin: '3px 0 0', lineHeight: 1.5 }}>Department at the time: {departmentsAtTheTime(d).join(', ')}</p>
            <p style={{ fontSize: '15px', margin: '3px 0 0' }}>
              {letterLinks(d).map((l, i) => (
                <span key={l.url}>{i > 0 && ' · '}<a href={l.url} style={{ color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{l.label}</a></span>
              ))}
            </p>
          </li>
        ))}
      </ol>
      <p style={{ fontSize: '15px', margin: '10px 0 0' }}>
        <Link href="/transparency/ministerial-directions" style={{ color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Every ministerial direction, all departments →</Link>
      </p>
    </section>
  );
}
