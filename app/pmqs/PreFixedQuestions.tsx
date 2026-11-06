import Link from 'next/link';
import PagedList from '../components/PagedList';
import { njpItem } from '../components/NoJsPager';
import { longDateArchive } from '@/lib/pmqs-archive';
import { preFixedSummary } from '@/lib/pm-questions-1945-1961';

const count = (n: number, one: string) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : `${one}s`}`;
const FOLDS_H3 = { fontSize: '18px', fontWeight: 'bold', margin: '28px 0 10px', scrollMarginTop: '80px' };

// Questions to the Prime Minister before the fixed time (owner, 6 Nov 2026): follows on directly under the oldest session in the list above, with the same folds, newest
// first, all closed. These are questions and days, never sessions, and no session figure on the page includes them.
export default async function PreFixedQuestions() {
  const { groups } = await preFixedSummary();
  return (
    <>
      <h3 id="before-fixed-pmqs" style={FOLDS_H3}>Before fixed PMQs: questions to the Prime Minister, 1945 to 1961</h3>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 4px' }}>
        Before July 1961 there was no fixed time for questions to the Prime Minister. These are individual questions, not PMQs sessions, and are not counted in the session totals above.
      </p>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
        <Link href="/pmqs/1945-to-1961" prefetch={false} className="og-tap" style={{ color: '#7a1612', textDecoration: 'underline' }}>Notes on these questions</Link>
      </p>
      {groups.map((g) => (
        <details key={g.key} className="pa-fold">
          <summary>{g.label}: {count(g.questions, 'question')} on {count(g.days, 'day')}</summary>
          {g.years.map((y) => {
            const id = `pq-${g.key}-${y.year}`;
            return (
              <details key={y.year} className="pa-fold pa-year">
                <summary>{y.year}: {count(y.questions, 'question')} on {count(y.days.length, 'day')}</summary>
                <PagedList id={id} count={y.days.length} className="pa-list">
                  {y.days.map((d) => (
                    <li key={d.date} className={njpItem(id)}>
                      <a href={`/pmqs/1945-to-1961/${d.date}`}>{longDateArchive(d.date)}</a>
                      <div>{count(d.questions, 'question')}</div>
                    </li>
                  ))}
                </PagedList>
              </details>
            );
          })}
        </details>
      ))}
    </>
  );
}
