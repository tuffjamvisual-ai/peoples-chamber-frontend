// Written ministerial statements (owner, 8 Nov 2026, WS1): metadata only, from Parliament's Written Statements API
// (questions-statements-api.parliament.uk/api/writtenstatements/statements), stored in parliament_written_statements
// (migration 2026-11-08c) by scripts/sync-written-statements.ts, and counted per MP for the delivery record's panel.
// Pure: no database or network here, so the sync, the page and the tests share it.

// The API's statement record, as far as we use it.
export type ApiStatement = {
  id?: unknown; memberId?: unknown; memberRole?: unknown; uin?: unknown; dateMade?: unknown; title?: unknown;
  answeringBodyId?: unknown; answeringBodyName?: unknown; house?: unknown;
};
export type StatementRow = {
  id: number; uin: string | null; house: string; member_id: number; member_role: string | null; date_made: string;
  title: string | null; answering_body_id: number | null; answering_body_name: string | null; url: string | null;
};

const DAY = /^(\d{4})-(\d{2})-(\d{2})/;
const posInt = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null);
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// "YYYY-MM-DD" from the API's "2025-02-12T00:00:00", or null when it is not a real date.
export function statementDay(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = DAY.exec(v);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// The statement's page on Parliament's site: .../written-statements/detail/<YYYY-MM-DD>/<uin in lower case>.
export function statementUrl(day: string | null, uin: string | null): string | null {
  if (!day || !uin || !/^[A-Za-z0-9]+$/.test(uin) || !statementDay(day)) return null;
  return `https://questions-statements.parliament.uk/written-statements/detail/${day}/${uin.toLowerCase()}`;
}

// One API record as a row, or the reasons it cannot be stored. id, member_id and date_made are required.
export function validate(raw: ApiStatement): { row: StatementRow | null; problems: string[] } {
  const problems: string[] = [];
  const id = posInt(raw?.id), member = posInt(raw?.memberId), day = statementDay(raw?.dateMade);
  if (!id) problems.push('id missing or not a positive whole number');
  if (!member) problems.push('memberId missing or not a positive whole number');
  if (!day) problems.push('dateMade missing or not a date');
  if (problems.length) return { row: null, problems };
  const uin = str(raw.uin);
  return {
    row: {
      id: id!, uin, house: str(raw.house) ?? 'Commons', member_id: member!, member_role: str(raw.memberRole), date_made: day!,
      title: str(raw.title), answering_body_id: posInt(raw.answeringBodyId), answering_body_name: str(raw.answeringBodyName),
      url: statementUrl(day, uin),
    },
    problems,
  };
}

// The MP's ministerial posts (mp_biography.government_posts: startDate, endDate, null end for a current post) as day
// ranges, inclusive. Posts with no start date are left out.
export type Post = { startDate?: string | null; endDate?: string | null };
export function ministerialPeriods(posts: Post[] | null | undefined, today: string): Array<{ from: string; to: string }> {
  return (posts ?? [])
    .map((p) => ({ from: statementDay(p.startDate ?? null), to: statementDay(p.endDate ?? null) ?? today }))
    .filter((p): p is { from: string; to: string } => !!p.from && p.to >= p.from);
}

// How many of the dates fall inside any of the periods (each date counted once).
export function countInPeriods(days: string[], periods: Array<{ from: string; to: string }>): number {
  return days.filter((d) => periods.some((p) => d >= p.from && d <= p.to)).length;
}

// Where our data starts (owner, 8 Nov 2026: a figure says the period it covers when the MP held a ministerial post before
// the data starts; posts before it are not counted).
//   statements  Parliament's Written Statements API starts on 17 November 2014 (HCWS1)
//   answers     our full text archive (parliament_written_questions) holds questions tabled from 4 July 2024, and the details
//               only table (parliament_written_questions_details, WQ1) those tabled from 1 January 2014: "since 2014" once
//               that table holds rows, "since July 2024" until then
export const STATEMENTS_FROM = { day: '2014-11-17', label: 'since 2014' };
export const ANSWERS_FROM = { day: '2024-07-04', label: 'since July 2024' };
export const answersFrom = (detailsHeld: boolean) => (detailsHeld ? { day: '2014-01-01', label: 'since 2014' } : ANSWERS_FROM);
export function coverageLabel(periods: Array<{ from: string }>, from: { day: string; label: string }): string | null {
  return periods.some((p) => p.from < from.day) ? from.label : null;
}
