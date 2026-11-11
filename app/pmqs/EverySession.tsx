import MoreChain from '../components/MoreChain';
import NoJsPager, { NoJsFold, NoJsPagerLinks, njpItem } from '../components/NoJsPager';
import { SubFold } from '../components/PhoneFolds';
import { phoneUpTo } from '@/lib/breakpoints';
import PreFixedQuestions from './PreFixedQuestions';
import { answeredBy, archiveSessions, groupByPrimeMinister, libraryTotals, longDateArchive, primeMinisterLabel, type ListedSession } from '@/lib/pmqs-archive';
import type { PmqsSet } from '@/lib/pmqs';

const INK = '#14100d';

// Every session in one list, 1961 to now (owner, 5 Nov 2026): the current sessions from the Hansard tables and the archive,
// a fold for each Prime Minister, newest first, the newest open, and inside it a fold for each year with 25 sessions at a
// time. Below it, our count against the Commons Library's. All native details, so it needs no JavaScript.
export default async function EverySession({ set }: { set: PmqsSet }) {
  const [archive, totals] = await Promise.all([archiveSessions(), libraryTotals()]);
  const sessions: ListedSession[] = [
    ...set.sessions.map((s) => ({ date: s.date, answeredBy: s.answeredBy.name })),
    ...archive.map((s) => ({ date: s.date, answeredBy: answeredBy(s.date) })),
  ].sort((x, y) => y.date.localeCompare(x.date));
  const groups = groupByPrimeMinister(sessions);
  const counted = new Map(groups.map((g) => [g.pm, g.count]));
  // The stored note for the two Prime Ministers after the archive's cut off says they are not comparable; their count now
  // comes from the Hansard tables, so the note says what the Library lists, as for the others, where it differs.
  const noteFor = (pm: string, stored: string | null, library: number | null) =>
    stored?.includes('cut-off') ? (library !== null && counted.get(pm) !== library ? `Commons Library lists ${library}` : null) : stored;
  return (
    <section data-main-action aria-labelledby="pmqs-every-session" style={{ color: INK, marginBottom: '40px' }}>
      <h2 id="pmqs-every-session" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 'bold', margin: '0 0 8px' }}>Every session since 1961</h2>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
        {sessions.length.toLocaleString('en-GB')} sessions from 24 October 1961 to {longDateArchive(sessions[0].date)}, by Prime Minister, newest first. A session on the day the office changed hands counts for the outgoing Prime Minister.
      </p>
      {/* UX5 (T1-6, 11 Nov 2026): on phones the first four Prime Ministers, then "Show all", and the questions before
          1961 in one closed fold; from 640px up, as before. */}
      <NoJsPager id="pmqs-pms" count={groups.length} size={groups.length} first={4} />
      {groups.map((g, i) => (
        <details key={g.pm} className={`pa-fold ${njpItem('pmqs-pms')}`} open={i === 0}>
          <summary>{primeMinisterLabel(g.pm)}: {g.count.toLocaleString('en-GB')} {g.count === 1 ? 'session' : 'sessions'}</summary>
          {g.years.map((y, j) => (
            <details key={y.year} className="pa-fold pa-year" open={i === 0 && j === 0}>
              <summary>{y.year}: {y.sessions.length} {y.sessions.length === 1 ? 'session' : 'sessions'}</summary>
              <MoreChain className="pa-list" items={y.sessions.map((s) => (
                <li key={s.date}>
                  <a href={`/pmqs/${s.date}`}>{longDateArchive(s.date)}</a>
                  {s.answeredBy && <div>Answered by {s.answeredBy}</div>}
                </li>
              ))} />
            </details>
          ))}
        </details>
      ))}
      <NoJsPagerLinks id="pmqs-pms" count={groups.length} size={groups.length} first={4} />
      <div className="pfq-wrap">
        <style>{`@media ${phoneUpTo(639.98)} { .pfq-wrap .pf-sb > #before-fixed-pmqs { display: none; } }`}</style>
        <SubFold label="Questions to the Prime Minister, 1945 to 1961"><PreFixedQuestions /></SubFold>
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '28px 0 10px' }}>Our count against the Commons Library</h3>
      {/* Folded on phones (step 5, 10 Nov 2026: the page was 5,098px). */}
      <NoJsFold id="pmqs-count-f" always label={`The ${totals.length.toLocaleString('en-GB')} Prime Ministers`}>
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
              <td style={{ padding: '6px', verticalAlign: 'top' }}>{noteFor(t.prime_minister, t.note, t.library_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </NoJsFold>
    </section>
  );
}
