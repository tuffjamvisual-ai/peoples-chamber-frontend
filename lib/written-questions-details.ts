// Written questions 2014 to July 2024, details only (owner, 8 Nov 2026, WQ1): answered Commons written questions tabled
// from 1 January 2014 (where Parliament's Questions API starts) to 3 July 2024 (the day before the full text archive,
// parliament_written_questions, starts), stored without question or answer text in parliament_written_questions_details
// (migration 2026-11-08d) by scripts/backfill-written-questions-details.ts. The archive's pages and search never read it;
// the MP page's minister written answers figure counts both tables. Pure: no database or network here.
import { writtenQuestionUrl } from '@/lib/written-question-row';

export const DETAILS_FROM = '2014-01-01';
export const DETAILS_TO = '2024-07-03';

// The API's question record, as far as we use it (the list endpoint's fields).
export type ApiQuestion = {
  id?: unknown; uin?: unknown; house?: unknown; dateTabled?: unknown; dateAnswered?: unknown; askingMemberId?: unknown;
  answeringMemberId?: unknown; answeringBodyId?: unknown; answeringBodyName?: unknown; heading?: unknown;
};
export type DetailsRow = {
  id: number; uin: string; house: string; date_tabled: string; date_answered: string | null; asking_member_id: number | null;
  answering_member_id: number | null; answering_body_id: number | null; answering_body: string | null; heading: string | null;
  url: string | null;
};

const DAY = /^(\d{4})-(\d{2})-(\d{2})/;
const posInt = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null);
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
// "YYYY-MM-DD" from "2016-01-05T00:00:00", or null when it is not a real date.
export function apiDay(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = DAY.exec(v);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// One API record as a row, or the reasons it cannot be stored. id, uin and date_tabled are required.
export function validate(raw: ApiQuestion): { row: DetailsRow | null; problems: string[] } {
  const problems: string[] = [];
  const id = posInt(raw?.id), uin = str(raw?.uin), tabled = apiDay(raw?.dateTabled);
  if (!id) problems.push('id missing or not a positive whole number');
  if (!uin) problems.push('uin missing');
  if (!tabled) problems.push('dateTabled missing or not a date');
  if (raw?.dateAnswered != null && !apiDay(raw.dateAnswered)) problems.push('dateAnswered is not a date');
  if (problems.length) return { row: null, problems };
  return {
    row: {
      id: id!, uin: uin!, house: str(raw.house) ?? 'Commons', date_tabled: tabled!, date_answered: apiDay(raw.dateAnswered),
      asking_member_id: posInt(raw.askingMemberId), answering_member_id: posInt(raw.answeringMemberId),
      answering_body_id: posInt(raw.answeringBodyId), answering_body: str(raw.answeringBodyName), heading: str(raw.heading),
      url: writtenQuestionUrl(tabled!, uin!),
    },
    problems,
  };
}

// Calendar month windows from `from` to `to` inclusive, each clipped to the range: [{ from, to }].
export function monthWindows(from: string, to: string): Array<{ from: string; to: string }> {
  const out: Array<{ from: string; to: string }> = [];
  let [y, m] = from.split('-').map(Number);
  for (;;) {
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    if (start > to) break;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    out.push({ from: start < from ? from : start, to: end > to ? to : end });
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

// A window cut in two by date (the first half the earlier days), for a window too big to page through in one go: the
// API fails on deep pages (HTTP 500 at skip 4,000 on 8 Nov 2026). A single day cannot be cut and comes back as it is.
export function halves(w: { from: string; to: string }): Array<{ from: string; to: string }> {
  const a = Date.parse(`${w.from}T00:00:00Z`), b = Date.parse(`${w.to}T00:00:00Z`);
  const days = Math.round((b - a) / 86400000) + 1;
  if (days < 2) return [w];
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const end = a + (Math.floor(days / 2) - 1) * 86400000;
  return [{ from: w.from, to: iso(end) }, { from: iso(end + 86400000), to: w.to }];
}

// The minister written answers figure: questions the MP answered, from both tables, each id once, answered inside one of
// the periods (inclusive YYYY-MM-DD ranges).
export function countAnswersInPeriods(
  rows: Array<{ id: number; date_answered: string | null }>,
  periods: Array<{ from: string; to: string }>,
): number {
  const ids = new Set<number>();
  for (const r of rows) {
    const d = r.date_answered?.slice(0, 10);
    if (d && periods.some((p) => d >= p.from && d <= p.to)) ids.add(r.id);
  }
  return ids.size;
}
