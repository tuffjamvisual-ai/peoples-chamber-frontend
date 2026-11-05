import Link from 'next/link';
import { longDate, type PmqsSet } from '@/lib/pmqs';

const INK = '#14100d';
const ACCENT = '#7a1612';

// Every session we hold, newest first, with who answered and who led for the Opposition.
export default function SessionsArchive({ set }: { set: PmqsSet }) {
  return (
    <section aria-labelledby="pmqs-sessions" style={{ color: INK, marginBottom: '40px' }}>
      <h2 id="pmqs-sessions" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 'bold', margin: '0 0 8px' }}>Every session since July 2024</h2>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
        {set.sessions.length} sessions from Hansard, newest first. Each one shows every question and answer in order.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '15px' }}>
        {set.sessions.map((s) => (
          <li key={s.date} style={{ padding: '10px 0', borderBottom: '1px solid rgba(20,16,13,0.25)', lineHeight: 1.6 }}>
            <Link href={`/pmqs/${s.date}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{longDate(s.date)}</Link>
            <div>
              Answered by {s.answeredBy.name}{s.deputisingFor ? `, deputising for ${s.deputisingFor}` : ''}
            </div>
            {s.opposition && <div>{s.deputisingFor ? 'For the Opposition' : 'Leader of the Opposition'}: {s.opposition.name}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}
