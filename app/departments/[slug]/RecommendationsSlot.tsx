import Link from 'next/link';
import {
  RECOMMENDATIONS_OVERDUE, allStatus, statusContext, statusText, departmentSlugs, recPath, type StatusRow,
} from '@/lib/pac';

// Department page "Recommendations" tab (owner's approval, 29 Oct 2026, "go stage 4"): this department's Committee of
// Public Accounts recommendations that are still open, the ones whose target has moved, and the ones whose target
// passed and that Open Govt checked. No overdue counts; recommendations whose target passed and have not been
// checked are only listed when RECOMMENDATIONS_OVERDUE=1. Shown only when RECOMMENDATIONS_PUBLIC=1 (the caller checks).
export type DepartmentRecommendations = { open: Item[]; moved: Item[]; checked: Item[]; unchecked: Item[] };
type Item = { href: string; title: string; status: string };

const OPEN = new Set(['target_in_future', 'no_dated_target']);
const CLOSED = new Set(['implemented', 'delivered_elsewhere', 'split', 'rejected', 'report_completed', 'not_listed_in_later_update']);

export async function getDepartmentRecommendations(slug: string): Promise<DepartmentRecommendations | null> {
  const [rows, { ctx, implementedDocFor }] = await Promise.all([allStatus(), statusContext()]);
  const mine = rows.filter((r) => departmentSlugs(r.department).includes(slug))
    .sort((a, b) => b.session.localeCompare(a.session) || b.report_number - a.report_number || a.rec_number.localeCompare(b.rec_number, 'en', { numeric: true }));
  const item = (r: StatusRow): Item => ({
    href: recPath(r), title: `${r.report_title}: recommendation ${r.rec_number}`,
    status: statusText(r, { ...ctx, implementedDocument: implementedDocFor(r.recommendation_id) }),
  });
  const out: DepartmentRecommendations = {
    open: mine.filter((r) => OPEN.has(r.status)).map(item),
    moved: mine.filter((r) => r.times_target_moved > 0 && !CLOSED.has(r.status) && (RECOMMENDATIONS_OVERDUE || r.status !== 'target_passed_unchecked')).map(item),
    checked: mine.filter((r) => r.status === 'target_passed_checked').map(item),
    unchecked: RECOMMENDATIONS_OVERDUE ? mine.filter((r) => r.status === 'target_passed_unchecked').map(item) : [],
  };
  return out.open.length + out.moved.length + out.checked.length + out.unchecked.length > 0 ? out : null;
}

const INK = '#14100d';
const H2 = 'text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold';

function List({ heading, items }: { heading: string; items: Item[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: '22px' }}>
      <h2 className={H2} style={{ color: INK }}>{heading}</h2>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((i) => (
          <li key={i.href} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '10px 0' }}>
            <Link href={i.href} className="no-hover-scale" style={{ display: 'block', color: INK, textDecoration: 'none' }}>
              <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.45, fontWeight: 600, overflowWrap: 'anywhere' }}>{i.title}</span>
              <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '3px', overflowWrap: 'anywhere' }}>{i.status}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function RecommendationsSlot({ data }: { data: DepartmentRecommendations }) {
  return (
    <section>
      <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 16px' }}>
        Recommendations the Committee of Public Accounts made to this department, from the government’s Treasury Minutes.{' '}
        <Link href="/recommendations" style={{ color: INK, textDecoration: 'underline' }}>All recommendations</Link>
      </p>
      <List heading="Still open" items={data.open} />
      <List heading="Targets moved" items={data.moved} />
      <List heading="Target passed, checked by Open Govt" items={data.checked} />
      <List heading="Target passed" items={data.unchecked} />
    </section>
  );
}
