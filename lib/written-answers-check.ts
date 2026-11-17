// Written answers against Parliament (owner, 5 Nov 2026): for yesterday and the 6 days before it, how many questions Parliament
// lists as answered that day, and how many we hold. Not today (owner, 16 Nov 2026, ENTRY 205): the archive sync runs once a
// day at 03:08 UTC, so today's answers are read tomorrow and counting today was short every sitting day. A day more than 2 per cent short goes in the freshness email. The sync
// once re-read only questions tabled in the last 3 days while the median answer takes 8, and held 25 of 574 for a day.
import type { SupabaseClient } from '@supabase/supabase-js';

const LIST = 'https://questions-statements-api.parliament.uk/api/writtenquestions/questions';
export const ANSWERS_SHORT_FRACTION = 0.02;
const GAP_MS = 500;
const UA = 'opengovt.uk parliament archive (https://www.opengovt.uk; contact@opengovt.uk)';

export type AnswersDay = { date: string; ours: number; parliament: number; short: boolean };
// tabledDays and tabledShort: the same count for questions tabled that day (ENTRY 211, 17 Nov 2026), now that the tabled
// pass stores most questions straight from Parliament's list pages.
export type AnswersCheck = { days: AnswersDay[]; short: AnswersDay[]; tabledDays: AnswersDay[]; tabledShort: AnswersDay[]; error?: string };

export async function checkWrittenAnswers(db: SupabaseClient, today = new Date()): Promise<AnswersCheck> {
  const days: AnswersDay[] = [];
  const tabledDays: AnswersDay[] = [];
  try {
    for (let back = 7; back >= 1; back--) {
      const date = new Date(today.getTime() - back * 864e5).toISOString().slice(0, 10);
      const res = await fetch(`${LIST}?answeredWhenFrom=${date}&answeredWhenTo=${date}&take=1`, { cache: 'no-store', signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Parliament answered HTTP ${res.status}`);
      const parliament = Number(((await res.json()) as { totalResults?: number }).totalResults ?? 0);
      const { count, error } = await db.from('parliament_written_questions').select('id', { count: 'exact', head: true }).eq('date_answered', date);
      if (error) throw new Error(`stored answers: ${error.message}`);
      const ours = count ?? 0;
      days.push({ date, ours, parliament, short: ours < parliament * (1 - ANSWERS_SHORT_FRACTION) });
      await new Promise((r) => setTimeout(r, GAP_MS));
      const tRes = await fetch(`${LIST}?tabledWhenFrom=${date}&tabledWhenTo=${date}&take=1`, { cache: 'no-store', signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!tRes.ok) throw new Error(`Parliament tabled HTTP ${tRes.status}`);
      const tParliament = Number(((await tRes.json()) as { totalResults?: number }).totalResults ?? 0);
      const { count: tCount, error: tError } = await db.from('parliament_written_questions').select('id', { count: 'exact', head: true }).eq('date_tabled', date);
      if (tError) throw new Error(`stored tabled: ${tError.message}`);
      tabledDays.push({ date, ours: tCount ?? 0, parliament: tParliament, short: (tCount ?? 0) < tParliament * (1 - ANSWERS_SHORT_FRACTION) });
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
    return { days, short: days.filter((d) => d.short), tabledDays, tabledShort: tabledDays.filter((d) => d.short) };
  } catch (e) {
    return { days, short: days.filter((d) => d.short), tabledDays, tabledShort: tabledDays.filter((d) => d.short), error: (e as Error).message };
  }
}
