import { allStatus, wording, departmentSlugs, recPath, relatedBodies, laterEvidence, datedStatus, type StatusLink } from '@/lib/pac';
import type { Dated } from '@/lib/pac-dated';
import { londonDay } from '@/lib/london-date';

// Department page "Recommendations" tab (owner's approval, 29 Oct 2026, "go stage 4"; fixes 30 Oct 2026): a count line
// (open, delivered, rejected, target passed and being checked), then this department's Committee of Public Accounts
// recommendations that are still open, the ones whose target has moved, the ones whose target has passed (being checked
// against later evidence, and checked by Open Govt), and short lists of delivered and rejected ones. "See all" opens
// /recommendations filtered to this department and that status. Under the count line, "Also: <body> (<role>)" for a
// body cross referenced to this department (lib/pac.ts "related"), linking to the list filtered to that body; its
// recommendations are not counted here. Shown only when RECOMMENDATIONS_PUBLIC=1 (the caller
// checks). An item Open Govt found partly delivered also shows its "Later evidence" line, in short form.
// ENTRY 140: each item's status comes in its stored form and, for a target still to come, with its month and its form
// once that month is over; the tab (RecommendationsSlot, in the browser) sorts them into the lists for today's date.
export type DeptItem = { href: string; title: string; later?: StatusLink[]; moved: boolean; status: Dated<[string, string]> };
export type DepartmentRecommendations = {
  slug: string;
  related: { key: string; name: string; role: string }[];
  items: DeptItem[];
  renderedOn: string;
};

export async function getDepartmentRecommendations(slug: string): Promise<DepartmentRecommendations | null> {
  const [rows, w] = await Promise.all([allStatus(), wording()]);
  const mine = rows.filter((r) => departmentSlugs(r.department).includes(slug))
    .sort((a, b) => b.session.localeCompare(a.session) || b.report_number - a.report_number || a.rec_number.localeCompare(b.rec_number, 'en', { numeric: true }));
  if (!mine.length) return null;
  return {
    slug,
    related: relatedBodies(slug),
    renderedOn: londonDay(),
    items: mine.map((r) => ({
      href: recPath(r), title: `${r.report_title}: recommendation ${r.rec_number}`, later: laterEvidence(r, true) ?? undefined,
      moved: r.times_target_moved > 0, status: datedStatus(r, (x) => [x.status, w.text(x)] as [string, string]),
    })),
  };
}
