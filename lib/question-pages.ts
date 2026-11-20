// Reads for the written question pages (owner, backlog item 15c, 6 Nov 2026), this Parliament, from parliament_written_questions. Exact
// text: see EXACT_COLUMNS in lib/no-em-dash.ts. Lists page by the last row shown (date tabled and id), not by counting from the start,
// so reading 190,000 rows in stays as fast as the first page.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdminRead as db } from '@/lib/supabase-admin';
import { displayMpName } from '@/lib/mp-name';

export const QUESTION_PAGE_SIZE = 25;
export type QuestionStatus = 'answered' | 'unanswered' | 'holding' | 'corrected' | 'withdrawn';
export type QuestionFilters = { words?: string; memberIds?: number[]; bodyId?: number; from?: string; to?: string; status?: QuestionStatus | null; uin?: string; notIds?: number[] };
const LIST = 'id, uin, house, date_tabled, date_answered, heading, answering_body_id, asking_member_id, is_withdrawn, date_holding_answer, date_answer_corrected';
export type QuestionRow = { id: number; uin: string; house: string; date_tabled: string; date_answered: string | null; heading: string | null; answering_body_id: number | null; asking_member_id: number | null; is_withdrawn: boolean | null; date_holding_answer: string | null; date_answer_corrected: string | null };

export type DepartmentStats = { answering_body_id: number; asked: number; answered: number; average_days: number | null; latest_answer: string | null };
// written_question_department_stats groups all 194,000 questions (the whole 310 MB table): 1.8 s on average and up to 7.3 s
// (pg_stat_statements, 7 Nov 2026), against the 8 s statement timeout. With an empty cache (a new server, or the push check's
// build) every page that needs it ran it at once, and under load one passed 8 s: /questions returned HTTP 500 (owner, AA1).
// Now one call at a time per server instance, a second try after 3 s, and the last good answer if both fail.
let statsInFlight: Promise<DepartmentStats[]> | null = null;
let statsLastGood: DepartmentStats[] | null = null;
async function readDepartmentStats(): Promise<DepartmentStats[]> {
  for (let attempt = 0; ; attempt++) {
    const { data, error } = await cachedQuery(['q:lib/question-pages.ts:cb4c81422c'], tableTags('rpc:written_question_department_stats'), () => db.rpc('written_question_department_stats'));
    if (!error) {
      statsLastGood = ((data ?? []) as DepartmentStats[]).map((r) => ({ ...r, asked: Number(r.asked), answered: Number(r.answered), average_days: r.average_days == null ? null : Number(r.average_days) }));
      return statsLastGood;
    }
    if (attempt >= 1) {
      if (statsLastGood) { console.error(`question stats: ${error.message}; showing the last good figures`); return statsLastGood; }
      throw new Error(`question stats: ${error.message}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}
export const questionDepartmentStats = unstable_cache(async (): Promise<DepartmentStats[]> => {
  statsInFlight ??= readDepartmentStats().finally(() => { statsInFlight = null; });
  return statsInFlight;
}, ['question-department-stats'], { revalidate: false, tags: tableTags('parliament_written_questions', 'rpc:written_question_department_stats') }); // F04 batch 1 (A16): no timer; refreshed by its tag

export type Person = { id: number; name: string; house: 'Commons' | 'Lords'; href: string | null };
// Everyone who can ask or answer: MPs link to /mps/<id>, peers to /lords/<id> (every former peer has a page since Cowork ENTRY 369).
export const questionPeople = unstable_cache(async (): Promise<Person[]> => {
  // F02 (ENTRY 134, owner approved 15 Nov 2026): every row, page by page (lib/read-all.ts, which throws on a short read).
  // .limit(3000) returned only the API's 1,000 rows: 1,000 of 2,822 peers, so 7,030 Lords questions lost a name (T2,
  // audit/t2-prep/f02-peers.md). This whole read is cached under the mps and peers tags (below).
  const [mpRows, peerRows] = await Promise.all([
    readAll<{ member_id: number; display_name: string | null; name: string }>(() => db.from('mps'), { columns: 'member_id, display_name, name', orderBy: 'member_id', concurrency: 2, label: 'question people, MPs' }),
    readAll<{ member_id: number; name_display: string; is_current: boolean; end_date: string | null }>(() => db.from('peers'), { columns: 'member_id, name_display, is_current, end_date', orderBy: 'member_id', concurrency: 2, label: 'question people, peers' }),
  ]);
  const mps = { data: mpRows }, peers = { data: peerRows };
  return [
    ...((mps.data ?? []) as { member_id: number; display_name: string | null; name: string }[]).map((m) => ({ id: m.member_id, name: displayMpName(m.display_name || m.name) as string, house: 'Commons' as const, href: `/mps/${m.member_id}` })),
    ...((peers.data ?? []) as { member_id: number; name_display: string; is_current: boolean; end_date: string | null }[]).map((p) => ({ id: p.member_id, name: p.name_display, house: 'Lords' as const, href: `/lords/${p.member_id}` })),
  ];
}, ['question-people-v3'], { revalidate: false, tags: tableTags('mps', 'peers') }); // v2: F02 reads every row; v3: every peer linked (ENTRY 369) // A16: refreshed when the MP or peer lists change

// One screen of questions, newest first, after `before` (date_id of the last row shown), and the total when it is the first screen.
async function searchQuestionsRead(f: QuestionFilters, before: string | null, wantTotal: boolean, pageSize = QUESTION_PAGE_SIZE): Promise<{ rows: QuestionRow[]; more: string | null; total: number | null }> {
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
  if (f.notIds?.length) q = q.not('id', 'in', `(${f.notIds.join(',')})`);
  const m = before?.match(/^(\d{4}-\d{2}-\d{2})_(\d{1,10})$/);
  if (m) q = q.or(`date_tabled.lt.${m[1]},and(date_tabled.eq.${m[1]},id.lt.${m[2]})`);
  const { data, error, count } = await q.order('date_tabled', { ascending: false }).order('id', { ascending: false }).limit(pageSize + 1);
  if (error) throw new Error(`questions: ${error.message}`);
  const all = (data ?? []) as unknown as QuestionRow[];
  const rows = all.slice(0, pageSize);
  const last = rows[rows.length - 1];
  return { rows, more: all.length > pageSize && last ? `${last.date_tabled}_${last.id}` : null, total: wantTotal ? count ?? null : null };
}

export type Attachment = { url?: string; title?: string; fileType?: string; fileSizeBytes?: number };
export type Question = QuestionRow & { question_text: string | null; answer_html: string | null; answer_text: string | null; original_answer_html: string | null; answering_member_id: number | null; answering_body: string | null; attachments: Attachment[] | null; url: string | null };

async function getQuestionRead(id: number): Promise<Question | null> {
  const { data, error } = await cachedQuery(['q:lib/question-pages.ts:2b24223cb8', JSON.stringify([LIST, id])], tableTags('parliament_written_questions'), () => db.from('parliament_written_questions').select(`${LIST}, question_text, answer_html, answer_text, original_answer_html, answering_member_id, answering_body, attachments, url`).eq('id', id).maybeSingle());
  if (error) throw new Error(`question ${id}: ${error.message}`);
  return data as unknown as Question | null;
}

// T1-MOB2 (4), owner 11 Nov 2026: a search of two or more words, not already in quotes, shows the questions with those
// words as one exact phrase first ("Public Duty Costs Allowance" found 63 questions, newest first, none of the first
// with the phrase). At most PHRASE_MAX of them, newest first; the other matches follow without them.
import { phraseOf, PHRASE_MAX } from '@/lib/question-phrase';
import { tagged } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { readAll } from '@/lib/read-all';
import { cachedQuery } from '@/lib/tagged-read';
export { PHRASE_MAX };
export async function phraseQuestions(f: QuestionFilters): Promise<QuestionRow[]> {
  const phrase = phraseOf(f.words);
  if (!phrase) return [];
  const { rows } = await searchQuestions({ ...f, words: `"${phrase}"` }, null, false, PHRASE_MAX);
  return rows;
}

// A16 (owner rule 15 Nov 2026, COWORK-TO-T1 ENTRY 129): one question, kept in the shared data cache under its own tag
// (question:<id>), refreshed by sync-parliament-archive only when that question's answer changed; no timer.
export const questionTag = (id: number) => `question:${id}`;
export const getQuestion = (id: number) => tagged(['question-v1', id], [questionTag(id)], () => getQuestionRead(id));

// A16 (owner rule 15 Nov 2026, COWORK-TO-T1 ENTRY 129): kept in the shared data cache under its tables' tags, no timer.
export const searchQuestions = (...a: Parameters<typeof searchQuestionsRead>) => tagged(['searchQuestions-v1', ...a.map((x) => JSON.stringify(x ?? null))], tableTags('parliament_written_questions'), () => searchQuestionsRead(...a));
