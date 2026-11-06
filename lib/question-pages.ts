// Reads for the written question pages (owner, backlog item 15c, 6 Nov 2026), this Parliament, from parliament_written_questions. Exact
// text: see EXACT_COLUMNS in lib/no-em-dash.ts. Lists page by the last row shown (date tabled and id), not by counting from the start,
// so reading 190,000 rows in stays as fast as the first page.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdminRead as db } from '@/lib/supabase-admin';
import { peerHasPage } from '@/lib/peers';
import { displayMpName } from '@/lib/mp-name';

export const QUESTION_PAGE_SIZE = 25;
export type QuestionStatus = 'answered' | 'unanswered' | 'holding' | 'corrected' | 'withdrawn';
export type QuestionFilters = { words?: string; memberIds?: number[]; bodyId?: number; from?: string; to?: string; status?: QuestionStatus | null; uin?: string };
const LIST = 'id, uin, house, date_tabled, date_answered, heading, answering_body_id, asking_member_id, is_withdrawn, date_holding_answer, date_answer_corrected';
export type QuestionRow = { id: number; uin: string; house: string; date_tabled: string; date_answered: string | null; heading: string | null; answering_body_id: number | null; asking_member_id: number | null; is_withdrawn: boolean | null; date_holding_answer: string | null; date_answer_corrected: string | null };

export type DepartmentStats = { answering_body_id: number; asked: number; answered: number; average_days: number | null; latest_answer: string | null };
export const questionDepartmentStats = unstable_cache(async (): Promise<DepartmentStats[]> => {
  const { data, error } = await db.rpc('written_question_department_stats');
  if (error) throw new Error(`question stats: ${error.message}`);
  return ((data ?? []) as DepartmentStats[]).map((r) => ({ ...r, asked: Number(r.asked), answered: Number(r.answered), average_days: r.average_days == null ? null : Number(r.average_days) }));
}, ['question-department-stats'], { revalidate: 86400 });

export type Person = { id: number; name: string; house: 'Commons' | 'Lords'; href: string | null };
// Everyone who can ask or answer: MPs link to /mps/<id>, peers with a page to /lords/<id>.
export const questionPeople = unstable_cache(async (): Promise<Person[]> => {
  const [mps, peers] = await Promise.all([
    db.from('mps').select('member_id, display_name, name').limit(2000),
    db.from('peers').select('member_id, name_display, is_current, end_date').limit(3000),
  ]);
  if (mps.error) throw new Error(`question people, MPs: ${mps.error.message}`);
  if (peers.error) throw new Error(`question people, peers: ${peers.error.message}`);
  return [
    ...((mps.data ?? []) as { member_id: number; display_name: string | null; name: string }[]).map((m) => ({ id: m.member_id, name: displayMpName(m.display_name || m.name) as string, house: 'Commons' as const, href: `/mps/${m.member_id}` })),
    ...((peers.data ?? []) as { member_id: number; name_display: string; is_current: boolean; end_date: string | null }[]).map((p) => ({ id: p.member_id, name: p.name_display, house: 'Lords' as const, href: peerHasPage(p) ? `/lords/${p.member_id}` : null })),
  ];
}, ['question-people'], { revalidate: 86400 });

// One screen of questions, newest first, after `before` (date_id of the last row shown), and the total when it is the first screen.
export async function searchQuestions(f: QuestionFilters, before: string | null, wantTotal: boolean): Promise<{ rows: QuestionRow[]; more: string | null; total: number | null }> {
  let q = db.from('parliament_written_questions').select(LIST, wantTotal ? { count: 'exact' } : undefined);
  if (f.status === 'withdrawn') q = q.eq('is_withdrawn', true);
  else q = q.eq('is_withdrawn', false);
  if (f.status === 'answered') q = q.not('date_answered', 'is', null);
  if (f.status === 'unanswered') q = q.is('date_answered', null);
  if (f.status === 'holding') q = q.not('date_holding_answer', 'is', null);
  if (f.status === 'corrected') q = q.not('date_answer_corrected', 'is', null);
  if (f.words) q = q.textSearch('search', f.words, { type: 'websearch', config: 'english' });
  if (f.memberIds) q = q.in('asking_member_id', f.memberIds);
  if (f.bodyId) q = q.eq('answering_body_id', f.bodyId);
  if (f.from) q = q.gte('date_tabled', f.from);
  if (f.to) q = q.lte('date_tabled', f.to);
  if (f.uin) q = q.ilike('uin', f.uin);
  const m = before?.match(/^(\d{4}-\d{2}-\d{2})_(\d{1,10})$/);
  if (m) q = q.or(`date_tabled.lt.${m[1]},and(date_tabled.eq.${m[1]},id.lt.${m[2]})`);
  const { data, error, count } = await q.order('date_tabled', { ascending: false }).order('id', { ascending: false }).limit(QUESTION_PAGE_SIZE + 1);
  if (error) throw new Error(`questions: ${error.message}`);
  const all = (data ?? []) as unknown as QuestionRow[];
  const rows = all.slice(0, QUESTION_PAGE_SIZE);
  const last = rows[rows.length - 1];
  return { rows, more: all.length > QUESTION_PAGE_SIZE && last ? `${last.date_tabled}_${last.id}` : null, total: wantTotal ? count ?? null : null };
}

export type Attachment = { url?: string; title?: string; fileType?: string; fileSizeBytes?: number };
export type Question = QuestionRow & { question_text: string | null; answer_html: string | null; answer_text: string | null; original_answer_html: string | null; answering_member_id: number | null; answering_body: string | null; attachments: Attachment[] | null; url: string | null };

export async function getQuestion(id: number): Promise<Question | null> {
  const { data, error } = await db.from('parliament_written_questions').select(`${LIST}, question_text, answer_html, answer_text, original_answer_html, answering_member_id, answering_body, attachments, url`).eq('id', id).maybeSingle();
  if (error) throw new Error(`question ${id}: ${error.message}`);
  return data as unknown as Question | null;
}
