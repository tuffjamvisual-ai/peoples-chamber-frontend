import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { QuestionsSummary } from '@/lib/mp-written-questions';

// "Written questions: N since <date>", the newest five and a link to them all (owner, 3 Nov 2026). Shared by the MP
// profile's In the House tab and the peer pages (/lords/[id]); `allHref` is /mps/<id>/questions or /lords/<id>/questions.
// No state and no browser APIs, so it renders on the server or inside a client component alike.

const inkLink: CSSProperties = { color: '#7a1612', textDecoration: 'underline' };
const inkDivider = '1px dashed rgba(20,16,13,0.2)';
const fmt = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function WrittenQuestionsSummary({ summary, allHref, style }: { summary: QuestionsSummary; allHref: string; style?: CSSProperties }) {
  if (summary.total === 0) return null;
  return (
    <section aria-label="Written questions" style={{ color: '#14100d', ...style }}>
      <p style={{ fontSize: '15px', margin: '0 0 6px' }}>
        <strong>Written questions: {summary.total.toLocaleString('en-GB')}</strong>
        {summary.firstDate && <> since {fmt(summary.firstDate)}</>}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px' }}>
        {summary.recent.map((q) => {
          const title = (q.heading || `Written question ${q.uin}`).trim();
          return (
            <li key={q.id} style={{ padding: '7px 0', borderBottom: inkDivider, fontSize: '15px' }}>
              <span style={{ fontFamily: 'var(--font-special-elite), monospace', whiteSpace: 'nowrap' }}>{q.date_tabled ? fmt(q.date_tabled) : ''}</span>
              {q.answering_body && <span> · {q.answering_body}</span>}
              <div>
                <a href={`/questions/${q.id}`} style={{ ...inkLink, fontWeight: 'bold' }}>{title}</a>
              </div>
            </li>
          );
        })}
      </ul>
      <Link href={allHref} style={{ ...inkLink, fontSize: '15px', fontWeight: 'bold' }}>
        All {summary.total.toLocaleString('en-GB')} questions
      </Link>
    </section>
  );
}
