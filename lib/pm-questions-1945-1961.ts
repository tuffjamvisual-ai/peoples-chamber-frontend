// Questions to the Prime Minister, 1945 to 1961 (owner, 6 Nov 2026), read from the pm_question*_1945_1961 tables and shown as stored (lib/no-em-dash.ts EXACT_COLUMNS).
// Individual questions, not PMQs sessions: counted in questions and days only, and never added to a session or attendance figure. Nothing writes to these tables, so
// every read is kept for 30 days under the PMQs tag.
import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { timedClient } from '@/lib/page-reads';
import { readAll } from '@/lib/read-all';

const db = () => timedClient(30 * 86400, ['pmqs']);
const QUESTIONS = 'pm_questions_1945_1961';
const ROWS = 'pm_question_exchange_rows_1945_1961';

// Newest first, as the session list above it on /pmqs. Macmillan's label carries the span of these questions, from the data, to tell this fold from his fold of sessions.
const PRIME_MINISTERS: [string, string][] = [
  ['Macmillan', 'Harold Macmillan'],
  ['Eden', 'Anthony Eden'],
  ['Churchill', 'Winston Churchill'],
  ['Attlee', 'Clement Attlee'],
];

export type PreFixedDay = { date: string; questions: number };
export type PreFixedYear = { year: string; questions: number; days: PreFixedDay[] };
export type PreFixedGroup = { key: string; label: string; questions: number; days: number; years: PreFixedYear[] };
export type PreFixedSummary = { questions: number; days: number; answeredBySomeoneElse: number; unconfirmedQuestions: number; unconfirmedDates: string[]; groups: PreFixedGroup[] };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthYear = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

type Listed = { question_id: number; date: string; prime_minister: string; answered_by: string; date_status: string };

// Built once and kept for 30 days under the 'pmqs' tag like the reads it uses (owner, 7 Nov 2026, W1): readAll's count is a
// head request, which the fetch cache does not keep, so the count ran on every render of /pmqs, the home page and these pages.
const preFixedSummaryCached = unstable_cache(async (): Promise<PreFixedSummary> => buildPreFixedSummary(), ['pm-questions-1945-1961-summary-v1'], { revalidate: 30 * 86400, tags: ['pmqs'] });
export const preFixedSummary = cache(async (): Promise<PreFixedSummary> => preFixedSummaryCached());

async function buildPreFixedSummary(): Promise<PreFixedSummary> {
  const rows = await readAll<Listed>(() => db().from(QUESTIONS), {
    columns: 'question_id, date, prime_minister, answered_by, date_status',
    orderBy: { column: 'question_id', ascending: true },
    label: QUESTIONS,
  });
  const groups = PRIME_MINISTERS.map(([key, label]) => {
    const onDay = new Map<string, number>();
    for (const r of rows) if (r.prime_minister === key) onDay.set(r.date, (onDay.get(r.date) ?? 0) + 1);
    const days = [...onDay.entries()].map(([date, questions]) => ({ date, questions })).sort((a, b) => b.date.localeCompare(a.date));
    const years: PreFixedYear[] = [];
    for (const d of days) {
      const year = d.date.slice(0, 4);
      let y = years[years.length - 1];
      if (y?.year !== year) { y = { year, questions: 0, days: [] }; years.push(y); }
      y.questions += d.questions;
      y.days.push(d);
    }
    const span = key === 'Macmillan' && days.length ? ` (${monthYear(days[days.length - 1].date)} to ${monthYear(days[0].date)})` : '';
    return { key, label: `${label}${span}`, questions: days.reduce((n, d) => n + d.questions, 0), days: days.length, years };
  });
  const unconfirmed = rows.filter((r) => !r.date_status.startsWith('confirmed'));
  return {
    questions: rows.length,
    days: new Set(rows.map((r) => r.date)).size,
    answeredBySomeoneElse: rows.filter((r) => r.answered_by === 'someone else').length,
    unconfirmedQuestions: unconfirmed.length,
    unconfirmedDates: [...new Set(unconfirmed.map((r) => r.date))].sort(),
    groups,
  };
}

export type PreFixedQuestion = { question_id: number; date: string; period_label: string | null; by_private_notice: string; section: string; exchange_id: string; date_status: string; hansard_reference: string | null; historic_hansard_url: string | null };
export type PreFixedRow = { exchange_id: string; row_order: number; kind: string; speaker_as_printed: string | null; person_url: string | null; member_id: number | null; question_number: string | null; text: string };
export type PreFixedExchange = { id: string; section: string; experiment: boolean; privateNotice: boolean; reference: string | null; url: string | null; rows: PreFixedRow[] };

// A day's questions, in printed order. Several questions can share one exchange, so the count comes from the questions, never the exchanges.
export const preFixedDay = cache(async (date: string): Promise<{ questions: number; unconfirmed: boolean; exchanges: PreFixedExchange[] } | null> => {
  const { data, error } = await db().from(QUESTIONS)
    .select('question_id, date, period_label, by_private_notice, section, exchange_id, date_status, hansard_reference, historic_hansard_url')
    .eq('date', date).order('question_id', { ascending: true });
  if (error) throw new Error(`${QUESTIONS} ${date}: ${error.message}`);
  const questions = (data ?? []) as PreFixedQuestion[];
  if (!questions.length) return null;
  const ids = [...new Set(questions.map((q) => q.exchange_id))];
  const read = await db().from(ROWS)
    .select('exchange_id, row_order, kind, speaker_as_printed, person_url, member_id, question_number, text')
    .in('exchange_id', ids).order('exchange_id', { ascending: true }).order('row_order', { ascending: true });
  if (read.error) throw new Error(`${ROWS} ${date}: ${read.error.message}`);
  const rows = (read.data ?? []) as PreFixedRow[];
  return {
    questions: questions.length,
    unconfirmed: questions.some((q) => !q.date_status.startsWith('confirmed')),
    exchanges: ids.map((id) => {
      const theirs = questions.filter((q) => q.exchange_id === id);
      return {
        id,
        section: theirs[0].section,
        experiment: theirs.some((q) => q.period_label),
        privateNotice: theirs.some((q) => q.by_private_notice === 'yes'),
        reference: theirs[0].hansard_reference,
        url: theirs[0].historic_hansard_url,
        rows: rows.filter((r) => r.exchange_id === id),
      };
    }),
  };
});
