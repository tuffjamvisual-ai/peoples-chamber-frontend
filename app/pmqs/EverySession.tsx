import MoreChain from '../components/MoreChain';
import ArchiveCredit from './ArchiveCredit';
import { archiveSessions, groupByPrimeMinister, libraryTotals, longDateArchive } from '@/lib/pmqs-archive';

const INK = '#14100d';

// Every session in the archive, 1961 to 2024: a fold for each Prime Minister, newest first, and inside it a fold for each
// year with 25 sessions at a time. Below it, our count against the Commons Library's. All native details, so it needs no
// JavaScript, and the rest of /pmqs is unchanged.
export default async function EverySession() {
  const [sessions, totals] = await Promise.all([archiveSessions(), libraryTotals()]);
  const groups = groupByPrimeMinister(sessions);
  const counted = new Map(groups.map((g) => [g.pm, g.count]));
  return (
    <section aria-labelledby="pmqs-every-session" style={{ color: INK, marginBottom: '40px' }}>
      <h2 id="pmqs-every-session" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 'bold', margin: '0 0 8px' }}>Every session since 1961</h2>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
        {sessions.length.toLocaleString('en-GB')} sessions from 24 October 1961 to 22 May 2024, by Prime Minister, newest first. A session on the day the office changed hands counts for the outgoing Prime Minister.
      </p>
      {groups.map((g) => (
        <details key={g.pm} className="pa-fold">
          <summary>{g.pm}: {g.count.toLocaleString('en-GB')} {g.count === 1 ? 'session' : 'sessions'}</summary>
          {g.years.map((y) => (
            <details key={y.year} className="pa-fold pa-year">
              <summary>{y.year}: {y.sessions.length} {y.sessions.length === 1 ? 'session' : 'sessions'}</summary>
              <MoreChain className="pa-list" items={y.sessions.map((s) => (
                <li key={s.date}>
                  <a href={`/pmqs/${s.date}`}>{longDateArchive(s.date)}</a>
                  {s.prime_minister_as_named && <div>Answered by {s.prime_minister_as_named}</div>}
                </li>
              ))} />
            </details>
          ))}
        </details>
      ))}
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '28px 0 10px' }}>Our count against the Commons Library</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 6px', textAlign: 'left', borderBottom: `2px solid ${INK}` }}>Prime Minister</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: `2px solid ${INK}` }}>In the record</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: `2px solid ${INK}` }}>Commons Library</th>
            <th style={{ padding: '8px 6px', textAlign: 'left', borderBottom: `2px solid ${INK}` }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => (
            <tr key={t.prime_minister} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
              <td style={{ padding: '6px', verticalAlign: 'top' }}>{t.prime_minister}</td>
              <td style={{ padding: '6px', verticalAlign: 'top', textAlign: 'right' }}>{(counted.get(t.prime_minister) ?? 0).toLocaleString('en-GB')}</td>
              <td style={{ padding: '6px', verticalAlign: 'top', textAlign: 'right' }}>{t.library_total?.toLocaleString('en-GB') ?? ''}</td>
              <td style={{ padding: '6px', verticalAlign: 'top' }}>{t.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ArchiveCredit />
    </section>
  );
}
