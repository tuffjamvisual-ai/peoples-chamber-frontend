import Link from 'next/link';
import { allStatus, wording, departmentSlugs, recPath, type StatusRow } from '@/lib/pac';

// Department page "Recommendations" tab (owner's approval, 29 Oct 2026, "go stage 4"; fixes 30 Oct 2026): a count line
// (open, delivered, rejected, target passed and being checked), then this department's Committee of Public Accounts
// recommendations that are still open, the ones whose target has moved, the ones whose target has passed (being checked
// against later evidence, and checked by Open Govt), and short lists of delivered and rejected ones. "See all" opens
// /recommendations filtered to this department and that status. Shown only when RECOMMENDATIONS_PUBLIC=1 (the caller
// checks).
type Item = { href: string; title: string; status: string };
export type DepartmentRecommendations = {
  slug: string;
  counts: { open: number; delivered: number; rejected: number; beingChecked: number };
  open: Item[]; moved: Item[]; checked: Item[]; beingChecked: Item[]; delivered: Item[]; rejected: Item[];
};

const OPEN = new Set(['target_in_future', 'no_dated_target']);
const DELIVERED = new Set(['implemented', 'delivered_elsewhere']);
const CLOSED = new Set(['implemented', 'delivered_elsewhere', 'split', 'rejected', 'report_completed', 'not_listed_in_later_update']);
const SHORT = 5;

export async function getDepartmentRecommendations(slug: string): Promise<DepartmentRecommendations | null> {
  const [rows, w] = await Promise.all([allStatus(), wording()]);
  const mine = rows.filter((r) => departmentSlugs(r.department).includes(slug))
    .sort((a, b) => b.session.localeCompare(a.session) || b.report_number - a.report_number || a.rec_number.localeCompare(b.rec_number, 'en', { numeric: true }));
  if (!mine.length) return null;
  const item = (r: StatusRow): Item => ({ href: recPath(r), title: `${r.report_title}: recommendation ${r.rec_number}`, status: w.text(r) });
  const of = (keys: Set<string>) => mine.filter((r) => keys.has(r.status));
  return {
    slug,
    counts: { open: of(OPEN).length, delivered: of(DELIVERED).length, rejected: mine.filter((r) => r.status === 'rejected').length, beingChecked: mine.filter((r) => r.status === 'target_passed_unchecked').length },
    open: of(OPEN).map(item),
    moved: mine.filter((r) => r.times_target_moved > 0 && !CLOSED.has(r.status)).map(item),
    checked: mine.filter((r) => r.status === 'target_passed_checked').map(item),
    beingChecked: mine.filter((r) => r.status === 'target_passed_unchecked').map(item),
    delivered: of(DELIVERED).slice(0, SHORT).map(item),
    rejected: mine.filter((r) => r.status === 'rejected').slice(0, SHORT).map(item),
  };
}

const INK = '#14100d';
const H2 = 'text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold';
const link: React.CSSProperties = { color: INK, textDecoration: 'underline', textUnderlineOffset: '2px' };

function List({ heading, items, more }: { heading: string; items: Item[]; more?: { count: number; href: string } }) {
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
      {more && more.count > items.length && (
        <p style={{ fontSize: '15px', margin: '8px 0 0' }}><Link href={more.href} style={link}>See all {more.count}</Link></p>
      )}
    </div>
  );
}

export function RecommendationsSlot({ data }: { data: DepartmentRecommendations }) {
  const all = `/recommendations?department=${data.slug}`;
  const by = (status: string) => `${all}&status=${status}`;
  const c = data.counts;
  return (
    <section>
      <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 8px' }}>
        Recommendations the Committee of Public Accounts made to this department, from the government’s Treasury Minutes.{' '}
        <Link href={all} style={link}>All recommendations for this department</Link>
      </p>
      <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, fontWeight: 600, margin: '0 0 18px' }}>
        Open: {c.open}. Delivered: {c.delivered}. Rejected: {c.rejected}. Target passed, being checked: {c.beingChecked}.
      </p>
      <List heading="Still open" items={data.open} more={{ count: c.open, href: by('open') }} />
      <List heading="Targets moved" items={data.moved} />
      <List heading="Target passed, being checked" items={data.beingChecked} more={{ count: c.beingChecked, href: by('target_passed') }} />
      <List heading="Target passed, checked by Open Govt" items={data.checked} more={{ count: data.checked.length, href: by('target_passed') }} />
      <List heading="Delivered" items={data.delivered} more={{ count: c.delivered, href: by('delivered') }} />
      <List heading="Rejected" items={data.rejected} more={{ count: c.rejected, href: by('rejected') }} />
    </section>
  );
}
