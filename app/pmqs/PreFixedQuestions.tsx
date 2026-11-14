import Link from 'next/link';
import NoJsPager from '../components/NoJsPager';
import Pagination from '../components/Pagination';
import { longDateArchive } from '@/lib/pmqs-archive';

const count = (n: number, one: string) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : `${one}s`}`;
const FOLDS_H3 = { fontSize: '18px', fontWeight: 'bold', margin: '28px 0 10px', scrollMarginTop: '80px' };
export const PREFIXED_PER_PAGE = 20;

export type PreFixedListed = { date: string; questions: number };

// Questions to the Prime Minister before the fixed time (owner, 6 Nov 2026), under the sessions on /pmqs. These are
// questions and days, never sessions, and no session figure on the page includes them.
// T2 ENTRY 3 (Cowork 14 Nov 2026): the page carried every one of the 1,200 and more days in folds by Prime Minister and
// year; it now carries one page of 20 days, newest first, found with the page's one search box and Prime Minister and year
// filters (lib/pmqs-search.ts), paged with ?dpage= so it pages apart from the sessions. Every day keeps its address,
// /pmqs/1945-to-1961/<date>.
export default function PreFixedQuestions({ found, totalDays, page, chosen, capped, qsExtra }: { found: PreFixedListed[]; totalDays: number; page: number; chosen: boolean; capped: boolean; qsExtra: string }) {
  const pages = Math.max(1, Math.ceil(found.length / PREFIXED_PER_PAGE));
  const shown = found.slice((page - 1) * PREFIXED_PER_PAGE, page * PREFIXED_PER_PAGE);
  return (
    <>
      <h3 id="before-fixed-pmqs" style={FOLDS_H3}>Questions to the Prime Minister, 1945 to 1961</h3>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 4px' }}>
        Before fixed PMQs began in July 1961 there was no set time for questions to the Prime Minister. These are individual questions, not PMQs sessions, and are not counted in the session totals above.
      </p>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
        <Link href="/pmqs/1945-to-1961" prefetch={false} className="og-tap" style={{ color: '#7a1612', textDecoration: 'underline' }}>Notes on these questions</Link>
      </p>
      <p role="status" style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px' }}>
        {chosen
          ? <>{count(found.length, 'day')} of questions {found.length === 1 ? 'matches' : 'match'} the search above</>
          : <>{count(totalDays, 'day')} of questions, newest first</>}
        {pages > 1 ? <> (page {page} of {pages})</> : null}.
        {capped && <> The search matched many contributions, so some days may be missing: add a word, a Prime Minister or a year to narrow it.</>}
      </p>
      {shown.length > 0 && (
        <NoJsPager id="pmqs-prefixed" count={shown.length} rows="> li" size={PREFIXED_PER_PAGE} first={3} noun={{ one: 'day', many: 'days' }}>
          <ul className="pa-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {shown.map((d) => (
              <li key={d.date}>
                <a href={`/pmqs/1945-to-1961/${d.date}`}>{longDateArchive(d.date)}</a>
                <div>{count(d.questions, 'question')}</div>
              </li>
            ))}
          </ul>
        </NoJsPager>
      )}
      <Pagination currentPage={page} totalPages={pages} baseUrl="/pmqs" pageParam="dpage" qsExtra={qsExtra} hash="before-fixed-pmqs" />
    </>
  );
}
