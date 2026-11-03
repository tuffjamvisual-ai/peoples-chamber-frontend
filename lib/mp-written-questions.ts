// Written questions on MP pages (owner's go, 3 Nov 2026). Source: parliament_written_questions, the Parliament archive
// (both Houses, every member, kept current every 10 minutes by /api/sync-parliament-archive, with the official record's
// URL and the latest answer date), chosen over mp_questions (current MPs only, answers and headings older), which is
// kept and still synced. The House is a parameter: Commons for MP pages, Lords for peer pages (/lords/[id], 3 Nov 2026).
//
// Used by the profile's In the House tab (summary: count, first date, 5 most recent), /mps/[id]/questions (page 1 and
// the departments, server rendered and cached) and /api/mps/[id]/questions (further pages and the department filter).
import type { SupabaseClient } from '@supabase/supabase-js';
import { readAll } from '@/lib/read-all';

export const QUESTIONS_PER_PAGE = 25;
export const QUESTION_COLUMNS = 'id, uin, date_tabled, date_answered, answering_body, heading, url, is_withdrawn';

export type WrittenQuestion = {
  id: number;
  uin: string;
  date_tabled: string | null;
  date_answered: string | null;
  answering_body: string | null;
  heading: string | null;
  url: string | null;
  is_withdrawn: boolean | null;
};
export type QuestionsSummary = { total: number; firstDate: string | null; recent: WrittenQuestion[] };
export type House = 'Commons' | 'Lords';

// The Supabase builders are deeply generic; this only chains two filters on them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const byMember = (q: any, memberId: number, house: House) => q.eq('asking_member_id', memberId).eq('house', house);

// Three small reads on the (asking_member_id, date_tabled) index: the count, the oldest date and the newest five.
export async function questionsSummary(db: SupabaseClient, memberId: number, house: House = 'Commons'): Promise<QuestionsSummary> {
  const commons = (q: unknown, id: number) => byMember(q, id, house);
  const t = () => db.from('parliament_written_questions');
  const [countRes, firstRes, recentRes] = await Promise.all([
    commons(t().select('id', { count: 'exact', head: true }), memberId),
    commons(t().select('date_tabled'), memberId).not('date_tabled', 'is', null).order('date_tabled', { ascending: true }).limit(1),
    commons(t().select(QUESTION_COLUMNS), memberId).order('date_tabled', { ascending: false, nullsFirst: false }).order('id', { ascending: false }).limit(5),
  ]);
  if (countRes.error) throw new Error(`written questions count: ${countRes.error.message || countRes.status}`);
  if (firstRes.error) throw new Error(`written questions first: ${firstRes.error.message}`);
  if (recentRes.error) throw new Error(`written questions recent: ${recentRes.error.message}`);
  return {
    total: countRes.count ?? 0,
    firstDate: (firstRes.data?.[0] as { date_tabled?: string } | undefined)?.date_tabled ?? null,
    recent: (recentRes.data ?? []) as WrittenQuestion[],
  };
}

// One page, newest first, optionally for one department (answering body).
export async function questionsPage(db: SupabaseClient, memberId: number, page: number, department: string | null, house: House = 'Commons'): Promise<{ rows: WrittenQuestion[]; total: number }> {
  const commons = (q: unknown, id: number) => byMember(q, id, house);
  const start = (page - 1) * QUESTIONS_PER_PAGE;
  const filtered = (q: any) => (department ? commons(q, memberId).eq('answering_body', department) : commons(q, memberId)); // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = () => db.from('parliament_written_questions');
  const [listRes, countRes] = await Promise.all([
    filtered(t().select(QUESTION_COLUMNS)).order('date_tabled', { ascending: false, nullsFirst: false }).order('id', { ascending: false }).range(start, start + QUESTIONS_PER_PAGE - 1),
    filtered(t().select('id', { count: 'exact', head: true })),
  ]);
  if (listRes.error) throw new Error(`written questions page: ${listRes.error.message}`);
  if (countRes.error) throw new Error(`written questions page count: ${countRes.error.message || countRes.status}`);
  return { rows: (listRes.data ?? []) as WrittenQuestion[], total: countRes.count ?? 0 };
}

// Every department the MP has asked, with counts, most asked first (one column of every question, paged by readAll).
export async function questionDepartments(db: SupabaseClient, memberId: number, house: House = 'Commons'): Promise<Array<{ name: string; count: number }>> {
  const commons = (q: unknown, id: number) => byMember(q, id, house);
  const rows = await readAll<{ answering_body: string | null }>(() => db.from('parliament_written_questions'), {
    columns: 'id, answering_body',
    filter: (q) => commons(q, memberId),
    orderBy: 'id',
    label: 'written question departments',
  });
  const counts = new Map<string, number>();
  for (const r of rows) if (r.answering_body) counts.set(r.answering_body, (counts.get(r.answering_body) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// The official record: the stored URL, or the Parliament written question page built from the date and UIN.
export function questionUrl(q: Pick<WrittenQuestion, 'url' | 'date_tabled' | 'uin'>): string | null {
  if (q.url) return q.url;
  return q.date_tabled && q.uin ? `https://questions-statements.parliament.uk/written-questions/detail/${q.date_tabled}/${q.uin}` : null;
}
