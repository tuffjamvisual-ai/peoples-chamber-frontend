import Link from 'next/link';
import { petitionDate } from '@/lib/petition-pages';
import { departmentById } from '@/lib/question-departments';
import type { Person, QuestionRow } from '@/lib/question-pages';
import { ShowAll } from '@/app/components/NoJsPager';

const INK = '#14100d';

export const questionState = (q: QuestionRow) => {
  if (q.is_withdrawn) return 'Withdrawn';
  if (q.date_answer_corrected) return `Corrected ${petitionDate(q.date_answer_corrected)}`;
  if (q.date_answered) return `Answered ${petitionDate(q.date_answered)}`;
  if (q.date_holding_answer) return `Holding answer ${petitionDate(q.date_holding_answer)}`;
  return 'Awaiting answer';
};

// A screen of questions and Show more. Show more moves on 25 and lands on the first of them; it is an ordinary link, so it works with
// JavaScript off and crawlers can reach every question. data-own-more stops lib/phone-enhance.ts folding the list again.
export default function QuestionItems({ rows, people, showDepartment = true, moreHref, moreLabel }: { rows: QuestionRow[]; people: Map<number, Person>; showDepartment?: boolean; moreHref: string | null; moreLabel: string }) {
  return (
    <>
      <ShowAll id="questions-list" count={(rows).length} rows="> li">
      <ul id="questions-list" data-own-more="" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((q) => (
          <li key={q.id} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
            <Link href={`/questions/${q.id}`} prefetch={false} className="no-hover-scale" style={{ display: 'block', minHeight: '44px', padding: '12px 0', color: INK, textDecoration: 'none' }}>
              <span style={{ display: 'block', fontSize: '17px', fontWeight: 'bold', lineHeight: 1.35, textDecoration: 'underline', overflowWrap: 'anywhere' }}>{q.heading || `Written question ${q.uin}`}</span>
              <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '4px' }}>
                {people.get(q.asking_member_id ?? 0)?.name ?? q.house} · Tabled {petitionDate(q.date_tabled)}
                {showDepartment && departmentById(q.answering_body_id) ? ` · ${departmentById(q.answering_body_id)!.name}` : ''} · {questionState(q)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      </ShowAll>
      {moreHref && (
        <p style={{ margin: '12px 0 0' }}>
          <a href={`${moreHref}#questions-list`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', padding: '8px 12px', border: `1px solid ${INK}`, fontSize: '15px', fontWeight: 'bold', color: INK, textDecoration: 'none' }}>{moreLabel}</a>
        </p>
      )}
    </>
  );
}
