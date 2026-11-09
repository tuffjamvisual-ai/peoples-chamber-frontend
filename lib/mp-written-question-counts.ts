// Per MP written question figures for mp_contribution_totals (JF2d, 9 Nov 2026): the number of Commons written questions
// each MP has tabled since the current Parliament began, and their five most asked departments. Counted from
// parliament_written_questions (the Parliament archive, kept current every 10 minutes by /api/sync-parliament-archive)
// instead of about 650 requests a day to the Questions and Statements API. Withdrawn questions are counted, as the API
// counted them. A full recount every run, so a question published late for a day already seen is still counted.
// Used by app/api/sync-mp-written-questions/route.ts; tested by scripts/checks/mp-written-question-counts.test.ts.

export const WQ_COUNT_FROM = '2024-07-04';

export type ArchiveQuestion = { asking_member_id: number | null; answering_body: string | null; date_tabled: string | null };
export type MemberFigures = { written_questions: number; wq_top_departments: { dept: string; count: number }[] };

// Figures for every member in memberIds: those with no questions get 0 and no departments. Departments are trimmed,
// blank ones are counted in the total but not listed, and ties are broken by name so the result is stable.
export function countByMember(rows: ArchiveQuestion[], memberIds: number[], top = 5): Map<number, MemberFigures> {
  const wanted = new Set(memberIds);
  const totals = new Map<number, number>();
  const depts = new Map<number, Map<string, number>>();
  for (const r of rows) {
    const id = r.asking_member_id;
    if (id == null || !wanted.has(id)) continue;
    if (r.date_tabled != null && r.date_tabled < WQ_COUNT_FROM) continue;
    totals.set(id, (totals.get(id) ?? 0) + 1);
    const dept = r.answering_body?.trim();
    if (!dept) continue;
    let m = depts.get(id);
    if (!m) depts.set(id, (m = new Map()));
    m.set(dept, (m.get(dept) ?? 0) + 1);
  }
  const out = new Map<number, MemberFigures>();
  for (const id of memberIds) {
    const m = depts.get(id) ?? new Map<string, number>();
    const list = [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, top)
      .map(([dept, count]) => ({ dept, count }));
    out.set(id, { written_questions: totals.get(id) ?? 0, wq_top_departments: list });
  }
  return out;
}
