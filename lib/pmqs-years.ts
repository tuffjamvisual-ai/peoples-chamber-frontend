// PMQs by year (Cowork ENTRY 367 item 3, owner approved): /pmqs/year/<yyyy> lists every session that year, current
// (Hansard, lib/pmqs.ts) and archive (1961 to 2024, lib/pmqs-archive.ts) alike, and the days of questions to the Prime
// Minister before fixed sessions (1945 to 1961, lib/pm-questions-1945-1961.ts). Built from the reads /pmqs already
// uses, each kept in the shared data cache under the 'pmqs' tag (and mps for names), so nothing new reads the database.
import 'server-only';
import { pmqsSet } from '@/lib/pmqs';
import { answeredBy, archiveSessions } from '@/lib/pmqs-archive';
import { preFixedSummary } from '@/lib/pm-questions-1945-1961';

export type YearSession = { date: string; answeredBy: string | null };
export type YearPreFixedDay = { date: string; questions: number };
export type PmqsYears = { years: number[]; sessions: YearSession[]; preFixed: YearPreFixedDay[] };

// Every session and pre-1961 day, newest first, and every year that has either, oldest first.
export async function pmqsYears(): Promise<PmqsYears> {
  const [set, archive, preFixed] = await Promise.all([pmqsSet(), archiveSessions(), preFixedSummary()]);
  const current = new Set(set.sessions.map((s) => s.date));
  const sessions: YearSession[] = [
    ...set.sessions.map((s) => ({ date: s.date, answeredBy: s.answeredBy.name })),
    ...archive.filter((s) => !current.has(s.date)).map((s) => ({ date: s.date, answeredBy: answeredBy(s.date) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const days = preFixed.groups.flatMap((g) => g.years.flatMap((y) => y.days)).sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set([...sessions, ...days].map((d) => Number(d.date.slice(0, 4))))].sort((a, b) => a - b);
  return { years, sessions, preFixed: days };
}
